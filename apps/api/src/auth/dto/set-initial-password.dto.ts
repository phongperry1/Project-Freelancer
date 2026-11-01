import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetInitialPasswordDto {
  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới cần thiết lập cho tài khoản (tối thiểu 6 ký tự)',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' })
  newPassword: string;
}

