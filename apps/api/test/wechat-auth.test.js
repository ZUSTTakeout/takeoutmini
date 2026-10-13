const { Prisma, Role } = require("@prisma/client");
const { AuthService } = require("../dist/auth/auth");
const { AuthController } = require("../dist/auth/auth.controller");

function usersFixture(initial = []) {
  const users = initial.map((user) => ({ ...user }));
  const project = (user, select) => user ? Object.fromEntries(
    Object.keys(select).map((key) => [key, user[key] ?? null]),
  ) : null;
  const conflict = () => new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002", clientVersion: Prisma.prismaVersion.client,
  });
  const user = {
    findUnique: jest.fn(async ({ where, select }) => {
      const [key, value] = Object.entries(where)[0];
      return project(users.find((item) => item[key] === value), select);
    }),
    create: jest.fn(async ({ data, select }) => {
      if (users.some((item) => item.wechatOpenId === data.wechatOpenId ||
        (data.wechatUnionId && item.wechatUnionId === data.wechatUnionId))) throw conflict();
      const created = { id: `user-${users.length + 1}`, shopId: null, ...data };
      users.push(created);
      return project(created, select);
    }),
    update: jest.fn(async ({ where, data, select }) => {
      const existing = users.find((item) => item.id === where.id);
      Object.assign(existing, data);
      return project(existing, select);
    }),
  };
  return { users, user, prisma: { user }, conflict };
}

describe("WeChat code exchange and account login", () => {
  const previous = {};
  beforeEach(() => {
    for (const name of ["JWT_SECRET", "WECHAT_APP_ID", "WECHAT_APP_SECRET", "NODE_ENV", "DEV_AUTH_ENABLED"]) {
      previous[name] = process.env[name];
    }
    process.env.JWT_SECRET = "unit-test-only-jwt-secret-0123456789";
    process.env.WECHAT_APP_ID = "wx0123456789abcdef";
    process.env.WECHAT_APP_SECRET = "unit-test-only-app-secret";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ openid: "wx-open-id", unionid: "wx-union-id", session_key: "private-session-key" }),
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test("exchanges a one-time code server-side without returning the session key", async () => {
    const service = new AuthService({});
    await expect(service.exchangeWechatCode("code-with-special-&-character")).resolves.toEqual({ openId: "wx-open-id", unionId: "wx-union-id" });
    const [endpoint, options] = fetch.mock.calls[0];
    const url = new URL(endpoint);
    expect(url.origin + url.pathname).toBe("https://api.weixin.qq.com/sns/jscode2session");
    expect(url.searchParams.get("js_code")).toBe("code-with-special-&-character");
    expect(url.searchParams.get("grant_type")).toBe("authorization_code");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test("missing credentials do not call WeChat or disclose configuration", async () => {
    delete process.env.WECHAT_APP_SECRET;
    await expect(new AuthService({}).exchangeWechatCode("code")).rejects.toThrow("微信登录暂不可用");
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([40029, 40163])("expired or already used code %s is rejected", async (errcode) => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ errcode, errmsg: "invalid code" }) });
    await expect(new AuthService({}).exchangeWechatCode("code")).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test.each([null, [], "invalid", {}, { openid: 42 }, { openid: "" }, { openid: " " }, { openid: "x".repeat(129) }, { errcode: 45011 }])(
    "malformed or failed WeChat response is handled: %p", async (response) => {
      fetch.mockResolvedValue({ ok: true, json: async () => response });
      await expect(new AuthService({}).exchangeWechatCode("code")).rejects.toMatchObject({ status: 502 });
    },
  );

  test("network failure, HTTP failure and invalid JSON are handled", async () => {
    const service = new AuthService({});
    fetch.mockRejectedValueOnce(new Error("connection failed"));
    await expect(service.exchangeWechatCode("code")).rejects.toMatchObject({ status: 502 });
    fetch.mockResolvedValueOnce({ ok: false });
    await expect(service.exchangeWechatCode("code")).rejects.toMatchObject({ status: 502 });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("invalid JSON"); } });
    await expect(service.exchangeWechatCode("code")).rejects.toMatchObject({ status: 502 });
  });

  test("first login registers a student and subsequent logins reuse the account", async () => {
    const fixture = usersFixture();
    const service = new AuthService(fixture.prisma);
    const first = await service.loginWechat("first-code");
    const second = await service.loginWechat("another-code");
    expect(first).toMatchObject({ id: second.id, nickname: "微信用户", role: Role.STUDENT });
    expect(fixture.users).toHaveLength(1);
    expect(first).not.toHaveProperty("wechatOpenId");
    expect(first).not.toHaveProperty("wechatUnionId");
    expect(fixture.users[0].wechatOpenId).toBe("wx-open-id");
  });

  test("ten concurrent first logins create only one account", async () => {
    const fixture = usersFixture();
    const service = new AuthService(fixture.prisma);
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => service.loginWechat(`code-${index}`)));
    expect(new Set(results.map((user) => user.id)).size).toBe(1);
    expect(fixture.users).toHaveLength(1);
  });

  test("a bound merchant logs in through WeChat with the database role and shop", async () => {
    const fixture = usersFixture([{
      id: "merchant-a", nickname: "店主", role: Role.MERCHANT, shopId: "shop-a",
      wechatOpenId: "wx-open-id", wechatUnionId: "wx-union-id",
    }]);
    process.env.NODE_ENV = "production";
    process.env.DEV_AUTH_ENABLED = "false";
    const service = new AuthService(fixture.prisma);
    const controller = new AuthController(fixture.prisma, service);
    const response = await controller.wechatLogin({ code: "merchant-code" });
    expect(response.user).toEqual({ id: "merchant-a", nickname: "店主", role: Role.MERCHANT, shopId: "shop-a" });
    await expect(service.verifyAccessToken(response.token)).resolves.toEqual(response.user);
    expect(response.user).not.toHaveProperty("wechatOpenId");
    expect(response).not.toHaveProperty("session_key");
    await expect(controller.devLogin({ role: Role.MERCHANT })).rejects.toMatchObject({ status: 403 });
  });

  test("an account found by UnionID is bound to the current mini program OpenID", async () => {
    const fixture = usersFixture([{ id: "existing-a", nickname: "同学", role: Role.STUDENT, wechatOpenId: null, wechatUnionId: "wx-union-id" }]);
    const user = await new AuthService(fixture.prisma).loginWechat("new-code");
    expect(user.id).toBe("existing-a");
    expect(fixture.users[0].wechatOpenId).toBe("wx-open-id");
    expect(fixture.users).toHaveLength(1);
  });

  test("a response without UnionID keeps an existing binding", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ openid: "wx-open-id" }) });
    const fixture = usersFixture([{ id: "existing-a", role: Role.STUDENT, wechatOpenId: "wx-open-id", wechatUnionId: "known-union" }]);
    await new AuthService(fixture.prisma).loginWechat("code");
    expect(fixture.users[0].wechatUnionId).toBe("known-union");
  });

  test("conflicting OpenID and UnionID accounts are not silently merged", async () => {
    const fixture = usersFixture([
      { id: "a", role: Role.STUDENT, wechatOpenId: "wx-open-id" },
      { id: "b", role: Role.MERCHANT, wechatUnionId: "wx-union-id" },
    ]);
    await expect(new AuthService(fixture.prisma).loginWechat("code")).rejects.toThrow("身份信息冲突");
    expect(fixture.user.update).not.toHaveBeenCalled();
  });

  test("identity conflicts after a unique-key race are also rejected", async () => {
    const fixture = usersFixture();
    fixture.user.create.mockImplementationOnce(async () => {
      fixture.users.push(
        { id: "a", role: Role.STUDENT, wechatOpenId: "wx-open-id" },
        { id: "b", role: Role.MERCHANT, wechatUnionId: "wx-union-id" },
      );
      throw fixture.conflict();
    });
    await expect(new AuthService(fixture.prisma).loginWechat("code")).rejects.toThrow("身份信息冲突");
    expect(fixture.user.update).not.toHaveBeenCalled();
  });

  test("me returns public account fields only", () => {
    const controller = new AuthController({}, {});
    expect(controller.me({ id: "a", nickname: "同学", role: Role.STUDENT, shopId: null, wechatOpenId: "private", devLoginKey: "private" }))
      .toEqual({ id: "a", nickname: "同学", role: Role.STUDENT, shopId: null });
  });
});
