import {
  BadGatewayException,
  CanActivate,
  ConflictException,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Prisma, Role } from "@prisma/client";
import type { Request } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../database/prisma.service";

const ROLES_KEY = "allowed_roles";
const JWT_ISSUER = process.env.JWT_ISSUER || "campus-food-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "campus-food-miniapp";

export type AuthenticatedUser = {
  id: string;
  nickname: string;
  role: Role;
  shopId: string | null;
};

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

type AccessTokenPayload = jwt.JwtPayload & { sub: string };

type WechatSession = {
  openid?: unknown;
  unionid?: unknown;
  errcode?: unknown;
};

const publicUserSelect = {
  id: true, nickname: true, role: true, shopId: true,
} as const;
const wechatUserSelect = {
  ...publicUserSelect, wechatOpenId: true, wechatUnionId: true,
} as const;

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

function requiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    secret === "change_me_to_at_least_32_random_characters"
  ) {
    throw new Error("JWT_SECRET 必须配置为至少 32 个字符的随机密钥，不能使用示例值");
  }
  return secret;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = requiredJwtSecret();

  constructor(private readonly prisma: PrismaService) {}

  signAccessToken(user: AuthenticatedUser): string {
    return jwt.sign({}, this.jwtSecret, {
      algorithm: "HS256",
      audience: JWT_AUDIENCE,
      expiresIn: "7d",
      issuer: JWT_ISSUER,
      subject: user.id,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ["HS256"],
        audience: JWT_AUDIENCE,
        issuer: JWT_ISSUER,
      });
    } catch {
      throw new UnauthorizedException("登录状态无效或已过期");
    }

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      decoded.sub.length === 0
    ) {
      throw new UnauthorizedException("登录状态无效");
    }

    const payload = decoded as AccessTokenPayload;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, nickname: true, role: true, shopId: true },
    });
    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }
    return user;
  }

  async exchangeWechatCode(code: string): Promise<{
    openId: string;
    unionId: string | null;
  }> {
    const appId = process.env.WECHAT_APP_ID?.trim();
    const appSecret = process.env.WECHAT_APP_SECRET?.trim();
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException("微信登录暂不可用，请稍后再试");
    }

    const query = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: "authorization_code",
    });

    let response: Response;
    try {
      response = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?${query.toString()}`,
        { signal: AbortSignal.timeout(5_000) },
      );
    } catch {
      throw new BadGatewayException("微信登录服务暂不可用");
    }
    if (!response.ok) {
      throw new BadGatewayException("微信登录服务响应异常");
    }

    let session: WechatSession;
    try {
      session = (await response.json()) as WechatSession;
    } catch {
      throw new BadGatewayException("微信登录服务响应异常");
    }

    if (!session || typeof session !== "object" || Array.isArray(session)) {
      throw new BadGatewayException("微信登录服务响应异常");
    }

    if (session.errcode !== undefined && session.errcode !== 0) {
      if (session.errcode === 40029 || session.errcode === 40163) {
        throw new UnauthorizedException("微信登录凭证无效或已使用");
      }
      throw new BadGatewayException("微信登录服务暂不可用");
    }
    if (
      typeof session.openid !== "string" ||
      !session.openid.trim() || session.openid.length > 128
    ) {
      throw new BadGatewayException("微信登录服务未返回用户标识");
    }
    if (typeof session.unionid === "string" && session.unionid.length > 128) {
      throw new BadGatewayException("微信登录服务响应异常");
    }

    return {
      openId: session.openid,
      unionId: typeof session.unionid === "string" && session.unionid.trim()
        ? session.unionid : null,
    };
  }

  async loginWechat(code: string): Promise<AuthenticatedUser> {
    const identity = await this.exchangeWechatCode(code);
    // 首次同时登录可能竞争唯一键；重新查询时也必须检查身份冲突。
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [byOpenId, byUnionId] = await Promise.all([
        this.prisma.user.findUnique({
          where: { wechatOpenId: identity.openId }, select: wechatUserSelect,
        }),
        identity.unionId ? this.prisma.user.findUnique({
          where: { wechatUnionId: identity.unionId }, select: wechatUserSelect,
        }) : null,
      ]);
      if (
        (byOpenId && byUnionId && byOpenId.id !== byUnionId.id) ||
        (byOpenId?.wechatUnionId && identity.unionId &&
          byOpenId.wechatUnionId !== identity.unionId)
      ) {
        throw new UnauthorizedException("微信身份信息冲突，请联系管理员");
      }

      const existing = byOpenId ?? byUnionId;
      try {
        if (!existing) {
          return await this.prisma.user.create({
            data: {
              nickname: "微信用户", role: Role.STUDENT,
              wechatOpenId: identity.openId, wechatUnionId: identity.unionId,
            },
            select: publicUserSelect,
          });
        }
        // 使用数据库中的角色，已绑定的商户同样从唯一微信入口登录。
        return await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            wechatOpenId: identity.openId,
            ...(identity.unionId ? { wechatUnionId: identity.unionId } : {}),
          },
          select: publicUserSelect,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }
      }
    }
    throw new ConflictException("微信账号正在登录，请稍后再试");
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === "string"
        ? /^Bearer ([^\s]+)$/.exec(authorization)
        : null;
    if (!match) {
      throw new UnauthorizedException("请先登录");
    }

    request.user = await this.auth.verifyAccessToken(match[1]);
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return allowed.includes(request.user.role);
  }
}
