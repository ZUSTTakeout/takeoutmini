import { OrderStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

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
