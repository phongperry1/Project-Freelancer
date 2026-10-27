import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AskAiQuestionDto {
  @ApiProperty({
    description: 'Nội dung câu hỏi học tập dành cho Gia sư AI',
    example: 'Thầy ơi, giải thích giúp em tại sao Cu tác dụng với HNO3 đặc lại sinh ra khí NO2 màu nâu đỏ ạ?',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập câu hỏi dành cho Gia sư AI.' })
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi ký tự.' })
  @MaxLength(3000, { message: 'Nội dung câu hỏi không được vượt quá 3000 ký tự.' })
  question!: string;

  @ApiProperty({
    description: 'Mã định danh phiên hội thoại (Session ID). Nếu để trống, hệ thống tự động khởi tạo phiên mới.',
    required: false,
    example: 'd9b1c73a-4a25-4fc1-91a6-583f71c4c927',
  })
  @IsOptional()
  @IsString({ message: 'Mã phiên chat phải là chuỗi ký tự.' })
  sessionId?: string;
}

