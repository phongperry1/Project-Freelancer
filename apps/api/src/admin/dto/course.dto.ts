import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Tên khóa học',
    example: 'Hóa học 10 - Cấu tạo nguyên tử & Bảng tuần hoàn',
  })
  @IsString({ message: 'Tên khóa học phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tiêu đề khóa học không được để trống.' })
  @MinLength(5, { message: 'Tên khóa học cần tối thiểu 5 ký tự.' })
  @MaxLength(255, { message: 'Tên khóa học không được vượt quá 255 ký tự.' })
  title!: string;

  @ApiProperty({
    description: 'ID giảng viên phụ trách',
    example: 'd9b2d63d-a233-4123-8472-748921123456',
  })
  @IsUUID('4', { message: 'ID giảng viên không đúng định dạng UUID.' })
  @IsNotEmpty({ message: 'Vui lòng chọn giảng viên phụ trách.' })
  teacherId!: string;

  @ApiProperty({
    description: 'Mô tả tóm tắt nội dung',
    example: 'Khóa học trang bị kiến thức nền tảng về cấu tạo nguyên tử...',
  })
  @IsString({ message: 'Mô tả khóa học phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mô tả khóa học không được để trống.' })
  @MaxLength(500, { message: 'Mô tả khóa học không được vượt quá 500 ký tự.' })
  description!: string;

  @ApiProperty({
    description: 'Đường dẫn ảnh bìa',
    example: 'https://res.cloudinary.com/.../image.jpg',
  })
  @IsString({ message: 'Đường dẫn ảnh bìa phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Ảnh bìa khóa học không được để trống.' })
  thumbnailUrl!: string;

  @ApiPropertyOptional({
    description: 'Khối lớp học thuật (10, 11, 12, exam, other)',
    enum: ['10', '11', '12', 'exam', 'other'],
    default: '10',
  })
  @IsEnum(['10', '11', '12', 'exam', 'other'], {
    message: 'Khối lớp không hợp lệ (chọn 10, 11, 12, exam hoặc other).',
  })
  @IsOptional()
  grade?: '10' | '11' | '12' | 'exam' | 'other';

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'HIDDEN'],
    default: 'ACTIVE',
  })
  @IsEnum(['ACTIVE', 'HIDDEN'], {
    message: 'Trạng thái khóa học không hợp lệ.',
  })
  @IsOptional()
  status?: 'ACTIVE' | 'HIDDEN';

  @ApiPropertyOptional({
    description: 'Danh sách tiêu đề các chương khởi tạo ban đầu',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  initialChapters?: string[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Tên khóa học' })
  @IsString({ message: 'Tên khóa học phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên khóa học không được để trống.' })
  @MinLength(5, { message: 'Tên khóa học cần tối thiểu 5 ký tự.' })
  @MaxLength(255, { message: 'Tên khóa học không được vượt quá 255 ký tự.' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'ID giảng viên phụ trách' })
  @IsUUID('4', { message: 'ID giảng viên không đúng định dạng UUID.' })
  @IsNotEmpty({ message: 'Vui lòng chọn giảng viên phụ trách.' })
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Khối lớp học thuật (10, 11, 12, exam, other)',
    enum: ['10', '11', '12', 'exam', 'other'],
  })
  @IsEnum(['10', '11', '12', 'exam', 'other'], {
    message: 'Khối lớp không hợp lệ (chọn 10, 11, 12, exam hoặc other).',
  })
  @IsOptional()
  grade?: '10' | '11' | '12' | 'exam' | 'other';

  @ApiPropertyOptional({ description: 'Mô tả khóa học' })
  @IsString({ message: 'Mô tả khóa học phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mô tả khóa học không được để trống.' })
  @MaxLength(500, { message: 'Mô tả khóa học không được vượt quá 500 ký tự.' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh bìa' })
  @IsString({ message: 'Đường dẫn ảnh bìa phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Ảnh bìa khóa học không được để trống.' })
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'HIDDEN'] })
  @IsEnum(['ACTIVE', 'HIDDEN'], {
    message: 'Trạng thái khóa học không hợp lệ.',
  })
  @IsOptional()
  status?: 'ACTIVE' | 'HIDDEN';
}

export class CreateChapterDto {
  @ApiProperty({
    description: 'Tiêu đề chương học',
    example: 'Chương 1: Cấu tạo nguyên tử',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề chương không được để trống.' })
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp chương', example: 1 })
  @IsOptional()
  sortOrder?: number;
}

export class CreateActivationKeysDto {
  @ApiProperty({
    description: 'Thời hạn hiệu lực của key tính bằng giờ (ví dụ: 24h, 72h, 168h)',
    example: 72,
    default: 72,
  })
  @IsNotEmpty({ message: 'Thời hạn hiệu lực không được để trống.' })
  @IsNumber({}, { message: 'Thời hạn hiệu lực phải là một số nguyên giờ.' })
  @Min(1, { message: 'Thời hạn hiệu lực tối thiểu là 1 giờ.' })
  @Max(87600, { message: 'Thời hạn hiệu lực tối đa là 87,600 giờ (10 năm).' })
  expiresInHours!: number;

  @ApiPropertyOptional({
    description: 'Số lượng key cần tạo đồng loạt (1 - 50 key)',
    example: 5,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Số lượng key phải là số nguyên.' })
  @Min(1, { message: 'Số lượng key tối thiểu là 1.' })
  @Max(50, { message: 'Số lượng key tối đa tạo 1 lần là 50 mã.' })
  quantity?: number;
}

