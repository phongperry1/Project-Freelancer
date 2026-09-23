import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email đăng nhập của người dùng',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng nhập',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự.' })
  password: string;
}
