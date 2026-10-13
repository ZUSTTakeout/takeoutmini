import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { trimmed } from "../common/transforms";

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
