import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import { CourseService } from './course.service.js';

export class EnrollWithKeyDto {
  @ApiProperty({
    description: 'Mã Key tham gia khóa học (dùng 1 lần, định dạng: TKU-CHEM-XXXX-YYYY)',
    example: 'TKU-CHEM-8X92-KL41',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mã Key kích hoạt.' })
  @IsString({ message: 'Mã Key phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mã Key kích hoạt phải có độ dài tối thiểu 6 ký tự.' })
  key!: string;
}

@ApiTags('Courses')
@Controller('api/v1/courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper giải mã token của học sinh
   */
  private async getStudentIdFromHeader(
    authorization?: string,
  ): Promise<string | null> {
    if (!authorization) return null;

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        role?: string;
      }>(token, { secret });
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các khóa học công khai đang hoạt động' })
  @ApiQuery({
    name: 'grade',
    required: false,
    description: 'Khối lớp cần lọc (all, 10, 11, 12, exam)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả khóa học',
  })
  @ApiResponse({ status: 200, description: 'Danh sách khóa học kèm thống kê tổng' })
  async getPublicCourses(
    @Query('grade') grade?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.courseService.getPublicCourses({ grade, search }, studentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết khóa học công khai theo ID' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Chi tiết khóa học và cấu trúc chương mục' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khóa học hoặc mã ID không hợp lệ' })
  async getPublicCourseById(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.getPublicCourseById(id);
  }

  @Get(':id/my-enrollment')
  @ApiOperation({ summary: 'Kiểm tra trạng thái tham gia khóa học của học sinh' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Thông tin trạng thái ghi danh' })
  async checkMyEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.courseService.checkStudentEnrollment(id, studentId);
  }

  @Post(':id/enroll-with-key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Học sinh kích hoạt mã Key 1 lần để tham gia khóa học' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Kích hoạt thành công và ghi danh khóa học' })
  @ApiResponse({ status: 400, description: 'Key đã dùng, hết hạn hoặc không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Mã key hoặc khóa học không tồn tại' })
  async enrollWithKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EnrollWithKeyDto,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập tài khoản học sinh để kích hoạt mã Key tham gia khóa học.',
      );
    }

    if (!body?.key?.trim()) {
      throw new BadRequestException('Vui lòng nhập mã Key kích hoạt.');
    }

    return this.courseService.enrollWithKey(id, studentId, body.key);
  }
}

