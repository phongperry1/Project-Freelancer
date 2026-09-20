import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'student@gmail.com',
    description: 'Email của người dùng',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng nhập, tối thiểu 8 ký tự',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên người dùng',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName: string;
}