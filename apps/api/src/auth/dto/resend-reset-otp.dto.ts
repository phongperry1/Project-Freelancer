import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendResetOtpDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email người dùng cần gửi lại mã OTP đặt lại mật khẩu',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  email: string;
}
