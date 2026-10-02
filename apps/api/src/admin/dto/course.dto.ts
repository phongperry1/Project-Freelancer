import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
