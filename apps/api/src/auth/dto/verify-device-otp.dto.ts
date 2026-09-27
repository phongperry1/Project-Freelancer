import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class VerifyDeviceOtpDto {
  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email của người dùng cần xác thực thiết bị mới',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp email.' })
  email: string;

  @ApiProperty({
    example: 'd9b2d63d-a2f4-4e78-9e6b-123456789abc',
    description: 'Mã định danh duy nhất của thiết bị cần xác thực',
  })
  @IsString({ message: 'Device ID phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp Device ID.' })
  deviceId: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số gửi qua email',
  })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP.' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số.' })
  otp: string;

  @ApiProperty({
    example: 'Chrome trên Windows 11',
    description: 'Tên thiết bị đăng nhập',
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
