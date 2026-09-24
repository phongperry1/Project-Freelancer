import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email đăng ký của người dùng',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng ký, tối thiểu 6 ký tự',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự.' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự.' })
  password: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên của người dùng',
    minLength: 2,
    maxLength: 70,
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên.' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự.' })
  @MaxLength(70, { message: 'Họ và tên không được vượt quá 70 ký tự.' })
  fullName: string;
}