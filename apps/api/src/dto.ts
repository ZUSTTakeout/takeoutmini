import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { OrderStatus, Role } from "@prisma/client";

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class IdParamDto {
  @IsString()
  @Length(1, 64)
  id!: string;
}

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

export class OrderItemInputDto {
  @IsString()
  @Length(1, 64)
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  expectedPrice!: number;
}

export class CreateOrderDto {
  @IsString()
  @Length(1, 64)
  shopId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsString()
  @Length(8, 128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey!: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class UpdateShopDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @Length(1, 60)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  notice?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isOpen?: boolean;
}

export class CreateCategoryDto {
  @Transform(trimmed)
  @IsString()
  @Length(1, 30)
  name!: string;
}

export class CreateProductDto {
  @Transform(trimmed)
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock!: number;

  @IsString()
  @Length(1, 64)
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf((_object, value) =>
    value !== undefined && value !== null && value !== "",
  )
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  image?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateProductDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @Length(1, 60)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 64)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf((_object, value) =>
    value !== undefined && value !== null && value !== "",
  )
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  image?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isAvailable?: boolean;
}
