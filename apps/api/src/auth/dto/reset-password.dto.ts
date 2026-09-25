import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email tài khoản cần đặt lại mật khẩu',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  email: string;

  @ApiProperty({
    example: 'd89c9e83-7c15-46f0-9b48-38bbd1937f26',
    description: 'Mã xác thực phiên đặt lại mật khẩu nhận được sau khi verify OTP',
  })
  @IsString({ message: 'Reset token phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Thiếu mã xác thực đặt lại mật khẩu (reset token).' })
  resetToken: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới, tối thiểu 6 ký tự',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' })
  @MaxLength(50, { message: 'Mật khẩu mới không được vượt quá 50 ký tự.' })
  newPassword: string;
}
