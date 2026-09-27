import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij... ',
    description: 'Google ID Token (credential JWT) nhận được từ Google Identity Services',
  })
  @IsString({ message: 'Google Credential phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp Google Credential.' })
  credential: string;

  @ApiProperty({
    example: 'student@tku.edu.vn',
    description: 'Email phục vụ chế độ demo / thử nghiệm nếu chưa cấu hình Client ID',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Demo Email không đúng định dạng email.' })
  demoEmail?: string;

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
