import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword@123',
    description: 'Mật khẩu hiện tại của tài khoản',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự.' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' })
  newPassword: string;
}

