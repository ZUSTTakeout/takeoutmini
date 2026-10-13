import { Role } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsIn, IsString, Length } from "class-validator";
import { trimmed } from "../common/transforms";

export class DevLoginDto {
  @IsIn([Role.STUDENT, Role.MERCHANT])
  role!: Role;
}

export class WechatLoginDto {
  @Transform(trimmed)
  @IsString()
  @Length(1, 256)
  code!: string;
}
