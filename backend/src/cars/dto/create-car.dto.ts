import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

export class CreateCarDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsIn(['Sedan', 'SUV', 'Van', 'Minibus', 'Luxury'])
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  capacity?: number;
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  pricePerDay: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
