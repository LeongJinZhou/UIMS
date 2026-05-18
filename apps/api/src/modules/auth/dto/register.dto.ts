import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../database/user.entity';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}