import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email tài khoản cần khôi phục mật khẩu',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' })
  email: string;
}
