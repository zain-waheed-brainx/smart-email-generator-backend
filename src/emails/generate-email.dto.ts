import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export class GenerateEmailDto {
    @IsString()
    @IsNotEmpty()
    emailType: string;
    @IsString()
    @IsNotEmpty()
    tone: string;
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    details: string;
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    previousEmail?: string;
    @IsOptional()
    @IsString()
    @MaxLength(300)
    instruction?: string;
}