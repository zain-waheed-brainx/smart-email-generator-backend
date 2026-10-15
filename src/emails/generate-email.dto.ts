import {
  IsNotEmpty,
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
}