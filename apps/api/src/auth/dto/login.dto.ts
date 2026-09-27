import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({
    example: 'd9b2d63d-a2f4-4e78-9e6b-123456789abc',
    description: 'Mã định danh duy nhất của thiết bị (tạo từ client)',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    example: 'Chrome trên Windows 11',
    description: 'Tên và hệ điều hành của thiết bị đăng nhập',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    example: '127.0.0.1',
    description: 'Địa chỉ IP của thiết bị',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
