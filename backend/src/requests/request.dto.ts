import { BookingStatus, RequestKind } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';
export class CreateRequestDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) hotelId?: string;
  @IsEnum(RequestKind) kind: RequestKind;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(300) pickupLocation?: string;
  @IsOptional() @IsString() @MaxLength(300) destination?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) passengers?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) rooms?: number;
  @IsOptional() @IsString() @MaxLength(300) preference?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
export class UpdateRequestDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsString() @MaxLength(3000) reply?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100000000) quotedPrice?: number;
}
