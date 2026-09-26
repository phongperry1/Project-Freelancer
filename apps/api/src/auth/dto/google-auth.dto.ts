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
}
