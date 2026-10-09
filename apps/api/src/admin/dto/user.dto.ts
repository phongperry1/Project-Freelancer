import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: ['ACTIVE', 'SUSPENDED'],
    description: 'Trạng thái tài khoản người dùng',
    example: 'ACTIVE',
  })
  @IsEnum(['ACTIVE', 'SUSPENDED'], {
    message: 'Trạng thái tài khoản không hợp lệ (ACTIVE, SUSPENDED).',
  })
  @IsNotEmpty({ message: 'Trạng thái tài khoản không được để trống.' })
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Họ và tên người dùng',
    example: 'Nguyen Van A',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  fullName!: string;

  @ApiProperty({
    description: 'Email người dùng',
    example: 'nguyenvana@tku.edu.vn',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu tài khoản (nếu để trống mặc định Giangvien@123)',
    example: 'Giangvien@123',
  })
  @IsOptional()
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password?: string;

  @ApiProperty({
    enum: ['STUDENT', 'TEACHER', 'ADMIN'],
    description: 'Vai trò người dùng',
    example: 'TEACHER',
  })
  @IsEnum(['STUDENT', 'TEACHER', 'ADMIN'], {
    message: 'Vai trò không hợp lệ (STUDENT, TEACHER, ADMIN).',
  })
  @IsNotEmpty({ message: 'Vai trò không được để trống.' })
  role!: 'STUDENT' | 'TEACHER' | 'ADMIN';

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'SUSPENDED'],
    description: 'Trạng thái tài khoản ban đầu',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED'], {
    message: 'Trạng thái không hợp lệ (ACTIVE, SUSPENDED).',
  })
  status?: 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional({
    description: 'Đường dẫn ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Đường dẫn ảnh đại diện phải là chuỗi ký tự.' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại',
    example: '0912345678',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Ngày sinh',
    example: '1985-10-20',
  })
  @IsOptional()
  @IsString({ message: 'Ngày sinh phải là chuỗi ký tự.' })
  dateOfBirth?: string;
}

export class BulkCreateUsersDto {
  @ApiProperty({
    type: [CreateUserDto],
    description: 'Danh sách người dùng cần tạo (tối thiểu 1, tối đa 500)',
  })
  @IsArray({ message: 'Danh sách người dùng phải là mảng.' })
  @ArrayMinSize(1, { message: 'Danh sách người dùng cần có ít nhất 1 tài khoản.' })
  @ArrayMaxSize(500, { message: 'Danh sách người dùng tối đa 500 tài khoản mỗi lần gửi.' })
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  users!: CreateUserDto[];
}
