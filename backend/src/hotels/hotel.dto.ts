import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
export class CreateHotelDto {
  @IsString() @Matches(/\S/) @MaxLength(150) name: string;
  @IsString() @Matches(/\S/) @MaxLength(100) city: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(3000)
  description?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(4096)
  @Matches(/^(https:\/\/[^\s]+|\/uploads\/[\w.-]+|)$/)
  image?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) pricePerNight?: number | null;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  available?: boolean;
}
export class UpdateHotelDto extends PartialType(CreateHotelDto, {
  skipNullProperties: false,
}) {}
