import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email người dùng đã đăng ký',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự số.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP.' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số.' })
  otp: string;
}
