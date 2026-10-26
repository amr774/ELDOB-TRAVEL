import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  pickupLocation?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
  @IsString()
  @IsNotEmpty()
  carId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
