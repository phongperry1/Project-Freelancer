import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
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
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

import { CourseService } from './course.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

export class CreateCommentDto {
  @ApiProperty({
    description: 'Nội dung câu hỏi hoặc phản hồi thảo luận',
    example: 'Thầy cho em hỏi ở mốc 05:24 tại sao chất X lại phản ứng tạo kết tủa?',
  })
  @IsNotEmpty({ message: 'Nội dung thảo luận không được để trống.' })
  @IsString({ message: 'Nội dung thảo luận phải là chuỗi ký tự.' })
  content!: string;

  @ApiProperty({
    description: 'Mã UUID của câu hỏi gốc nếu là câu trả lời phân cấp (Nested Reply)',
    required: false,
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'Mã câu hỏi gốc không đúng định dạng UUID.' })
  parentId?: string;

  @ApiProperty({
    description: 'Mốc thời gian video bài giảng (tính bằng giây, ví dụ 324 cho 05:24)',
    required: false,
    example: 324,
  })
  @IsOptional()
  @IsInt({ message: 'Mốc thời gian video phải là số nguyên (giây).' })
  @Min(0, { message: 'Mốc thời gian video không được là số âm.' })
  videoTimestamp?: number;
}


export class CreateLessonNoteDto {
  @ApiProperty({
    description: 'Nội dung ghi chú của học sinh',
    example: 'Este no, đơn chức mạch hở: CnH2nO2 (n >= 2).',
  })
  @IsNotEmpty({ message: 'Nội dung ghi chú không được để trống.' })
  @IsString({ message: 'Nội dung ghi chú phải là chuỗi ký tự.' })
  content!: string;

  @ApiProperty({
    description: 'Mốc thời gian video bài giảng tính theo giây (ví dụ: 225 = 03:45)',
    example: 225,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Mốc thời gian video phải là số nguyên giây.' })
  @Min(0, { message: 'Mốc thời gian không được âm.' })
  videoTimestamp?: number;
}

export class UpdateLessonNoteDto {
  @ApiProperty({
    description: 'Nội dung ghi chú cập nhật',
    example: 'Este no, đơn chức mạch hở: CnH2nO2 (n >= 2). Phản ứng thủy phân kiềm là phản ứng một chiều.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nội dung ghi chú phải là chuỗi ký tự.' })
  content?: string;

  @ApiProperty({
    description: 'Mốc thời gian video bài giảng tính theo giây',
    example: 240,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Mốc thời gian video phải là số nguyên giây.' })
  @Min(0, { message: 'Mốc thời gian không được âm.' })
  videoTimestamp?: number;
}

@ApiTags('Courses')
@Controller('api/v1/courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper giải mã token của học sinh (tái sử dụng getUserFromHeader)
   */
  private async getStudentIdFromHeader(
    authorization?: string,
  ): Promise<string | null> {
    const user = await this.getUserFromHeader(authorization);
    return user?.id ?? null;
  }

  /**
   * Helper giải mã token người dùng (bao gồm id và role)
   */
  private async getUserFromHeader(
    authorization?: string,
  ): Promise<{ id: string; role?: string } | null> {
    if (!authorization) return null;

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]?.trim()) return null;
    const token = match[1].trim();

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        role?: string;
      }>(token, { secret });
      if (!payload?.sub) return null;

      if (payload.sub === '11111111-1111-1111-1111-111111111111') {
        return { id: payload.sub, role: 'STUDENT' };
      }

      // Kiểm tra trạng thái khóa tài khoản thời gian thực từ Database
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
      });

      if (!dbUser || dbUser.status === 'SUSPENDED') {
        return null;
      }

      return { id: dbUser.id, role: dbUser.role };
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

  @Get('student/lessons')
  @ApiOperation({ summary: 'Lấy dữ liệu tổng quan kho bài giảng dành cho học sinh' })
  @ApiQuery({
    name: 'grade',
    required: false,
    description: 'Lọc bài giảng theo khối lớp (all, 10, 11, 12, exam)',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Lọc bài giảng theo khóa học cụ thể',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm bài giảng theo tên hoặc chuyên đề',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài giảng, bài học đang dở và thống kê' })
  async getStudentLessonsOverview(
    @Query('grade') grade?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.courseService.getStudentLessonsOverview(studentId, {
      grade,
      courseId,
      search,
    });
  }

  @Get('discussions')
  @ApiOperation({ summary: 'Lấy danh sách các câu hỏi thảo luận công khai (Student Q&A Hub)' })
  @ApiQuery({
    name: 'grade',
    required: false,
    description: 'Lọc theo khối lớp (all, 10, 11, 12, exam)',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Lọc theo khóa học cụ thể',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo nội dung câu hỏi hoặc bài học',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc theo trạng thái (ALL, ANSWERED, WAITING, MY_QUESTIONS)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi thảo luận kèm phản hồi và thống kê' })
  async getPublicDiscussions(
    @Query('grade') grade?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.courseService.getPublicDiscussions({ grade, courseId, search, status }, studentId);
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

  @Post(':id/enroll-free')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Học sinh đăng ký tham gia khóa học miễn phí (không cần mã Key)' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Đăng ký thành công và ghi danh khóa học' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Khóa học không tồn tại' })
  async enrollFree(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập tài khoản học sinh để đăng ký tham gia khóa học.',
      );
    }

    return this.courseService.enrollFree(id, studentId);
  }

  @Get(':id/learn')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy dữ liệu phòng học và danh mục bài giảng của khóa học' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Dữ liệu toàn bộ phòng học kèm tiến độ học tập' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Chưa ghi danh khóa học' })
  async getCourseLearningRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập tài khoản học sinh để vào học.');
    }

    return this.courseService.getCourseLearningRoom(id, studentId);
  }

  @Post(':id/lessons/:lessonId/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lưu tiến độ học tập của bài giảng (thời gian xem / hoàn thành)' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiResponse({ status: 200, description: 'Cập nhật tiến độ thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async updateLessonProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() body: { isCompleted?: boolean; lastPosition?: number; progressPercent?: number },
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để lưu tiến độ học tập.');
    }

    return this.courseService.updateLessonProgress(id, lessonId, studentId, body);
  }

  @Get(':id/assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bài tập và đề thi của khóa học cho học sinh' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiQuery({ name: 'lessonId', required: false, description: 'Lọc bài tập theo bài học cụ thể' })
  @ApiResponse({ status: 200, description: 'Danh sách bài tập và đề thi' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getStudentAssessments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lessonId') lessonId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem danh sách bài kiểm tra.');
    }
    return this.courseService.getStudentAssessments(id, studentId, lessonId);
  }

  @Get(':id/assessments/:assessmentId/take')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy dữ liệu đề thi để học sinh làm bài trực tuyến (bảo mật)' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'assessmentId', description: 'Mã UUID của đề thi' })
  @ApiResponse({ status: 200, description: 'Dữ liệu đề thi và câu hỏi' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getAssessmentForTake(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để làm bài thi.');
    }
    return this.courseService.getAssessmentForTake(id, assessmentId, studentId);
  }

  @Post(':id/assessments/:assessmentId/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nộp bài thi trực tuyến và tự động chấm điểm' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'assessmentId', description: 'Mã UUID của đề thi' })
  @ApiResponse({ status: 200, description: 'Chấm điểm và nộp bài thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async submitAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() body: { answers: Array<{ questionId: string; selectedOptionId?: string; answerText?: string }> },
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để nộp bài thi.');
    }
    return this.courseService.submitAssessment(id, assessmentId, studentId, body);
  }

  @Get(':id/assessments/:assessmentId/results/:submissionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem kết quả bài làm, lời giải chi tiết và file viết tay của đề thi' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'assessmentId', description: 'Mã UUID của đề thi' })
  @ApiParam({ name: 'submissionId', description: 'Mã UUID của lần thi' })
  @ApiResponse({ status: 200, description: 'Kết quả chi tiết bài thi' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getAssessmentResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem kết quả bài thi.');
    }
    return this.courseService.getAssessmentResult(id, assessmentId, submissionId, studentId);
  }

  @Get(':id/assessments/:assessmentId/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử các lần thi của học sinh cho đề thi này' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'assessmentId', description: 'Mã UUID của đề thi' })
  @ApiResponse({ status: 200, description: 'Lịch sử các lần thi' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getAssessmentHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem lịch sử thi.');
    }
    return this.courseService.getAssessmentHistory(id, assessmentId, studentId);
  }

  // ==========================================================================
  // BƯỚC 4.1: THẢO LUẬN / BÌNH LUẬN BÀI HỌC (COMMUNITY Q&A)
  // ==========================================================================

  @Get(':id/lessons/:lessonId/comments')
  @ApiOperation({ summary: 'Lấy danh sách thảo luận / Q&A cộng đồng của bài học' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi thảo luận kèm các phản hồi phân cấp' })
  async getLessonComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.courseService.getLessonComments(id, lessonId);
  }

  @Post(':id/lessons/:lessonId/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt câu hỏi hoặc gửi phản hồi thảo luận kèm mốc thời gian video' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiResponse({ status: 201, description: 'Đăng bình luận thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async createLessonComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() body: CreateCommentDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.getUserFromHeader(authorization);
    if (!user) {
      throw new UnauthorizedException('Vui lòng đăng nhập để tham gia thảo luận.');
    }
    return this.courseService.createLessonComment(
      id,
      lessonId,
      user.id,
      user.role || 'STUDENT',
      body,
    );
  }

  @Patch(':id/lessons/:lessonId/comments/:commentId/pin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ghim / Bỏ ghim câu trả lời chuẩn xác (Chỉ Giảng viên / Admin)' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiParam({ name: 'commentId', description: 'Mã UUID của bình luận' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái ghim thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Không có quyền ghim câu trả lời' })
  async togglePinComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.getUserFromHeader(authorization);
    if (!user) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện thao tác này.');
    }
    return this.courseService.togglePinComment(
      id,
      lessonId,
      commentId,
      user.id,
      user.role || 'STUDENT',
    );
  }

  @Delete(':id/lessons/:lessonId/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa bình luận thảo luận (Tác giả, Giảng viên hoặc Admin)' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiParam({ name: 'commentId', description: 'Mã UUID của bình luận' })
  @ApiResponse({ status: 200, description: 'Xóa bình luận thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa bình luận' })
  async deleteLessonComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.getUserFromHeader(authorization);
    if (!user) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện thao tác này.');
    }
    return this.courseService.deleteLessonComment(
      id,
      lessonId,
      commentId,
      user.id,
      user.role || 'STUDENT',
    );
  }

  // ==========================================================================
  // BƯỚC 4.3: GHI CHÚ BÀI HỌC & ĐÁNH DẤU MỐC THỜI GIAN (LESSON TIMELINE NOTES)
  // ==========================================================================

  @Get(':id/lessons/:lessonId/notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách ghi chú của học sinh trong bài học' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiResponse({ status: 200, description: 'Danh sách ghi chú kèm mốc thời gian video' })
  async getLessonNotes(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem ghi chú cá nhân.');
    }
    return this.courseService.getLessonNotes(lessonId, studentId);
  }

  @Post(':id/lessons/:lessonId/notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới ghi chú / đánh dấu mốc thời gian bài giảng' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiResponse({ status: 201, description: 'Ghi chú được lưu thành công vào cơ sở dữ liệu' })
  async createLessonNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateLessonNoteDto,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để lưu ghi chú.');
    }
    return this.courseService.createLessonNote(id, lessonId, studentId, dto);
  }

  @Patch(':id/lessons/:lessonId/notes/:noteId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật nội dung hoặc mốc thời gian ghi chú' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiParam({ name: 'noteId', description: 'Mã UUID của ghi chú' })
  @ApiResponse({ status: 200, description: 'Cập nhật ghi chú thành công' })
  async updateLessonNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateLessonNoteDto,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để sửa ghi chú.');
    }
    return this.courseService.updateLessonNote(noteId, studentId, dto);
  }

  @Delete(':id/lessons/:lessonId/notes/:noteId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa ghi chú bài học' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID của bài học' })
  @ApiParam({ name: 'noteId', description: 'Mã UUID của ghi chú' })
  @ApiResponse({ status: 200, description: 'Đã xóa ghi chú' })
  async deleteLessonNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    if (!studentId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xóa ghi chú.');
    }
    return this.courseService.deleteLessonNote(noteId, studentId);
  }
}
