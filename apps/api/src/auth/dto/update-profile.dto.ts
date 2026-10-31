import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyen Nam Phong',
    description: 'Họ và tên của người dùng',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @MaxLength(150, { message: 'Họ và tên tối đa 150 ký tự.' })
  fullName?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại của người dùng',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự.' })
  phoneNumber?: string;

  @ApiProperty({
    example: '2005-08-15',
    description: 'Ngày sinh (định dạng YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ngày sinh phải là chuỗi ký tự.' })
  dateOfBirth?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
    description: 'Đường dẫn ảnh đại diện',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ảnh đại diện phải là đường dẫn chuỗi ký tự.' })
  avatarUrl?: string;
}

