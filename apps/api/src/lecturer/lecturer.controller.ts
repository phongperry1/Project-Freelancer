import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { Roles } from '../auth/decorators/index.js';
import { ConfigService } from '@nestjs/config';

import {
  CloudinaryService,
  type UploadedFileDto,
} from '../cloudinary/cloudinary.service.js';
import {
  LecturerService,
  type LecturerCoursesResponse,
  type LecturerCourseItem,
  type LecturerAssessmentItem,
  type CreateAssessmentDto,
  type UpdateAssessmentDto,
  type MonitoredStudentsResponse,
  type StudentProgressDetailResponse,
} from './lecturer.service.js';

@ApiTags('Lecturer')
@Controller('api/v1/lecturer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class LecturerController {
  constructor(
    private readonly lecturerService: LecturerService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private verifyLecturer(
    authorization?: string,
  ): { userId: string; role: string } {
    if (!authorization) {
      throw new UnauthorizedException('Thiếu mã token xác thực.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    // Do JwtAuthGuard và RolesGuard đã xác thực chữ ký và kiểm tra DB,
    // ta chỉ cần decode payload nhanh chóng mà không cần tính lại mã hash
    const payload = this.jwtService.decode(token) as { sub?: string; role?: string } | null;

    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    return { userId: payload.sub, role: payload.role ?? 'TEACHER' };
  }

  @Get('courses')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách khóa học được phân công cho giảng viên',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách khóa học và các chỉ số thống kê phân công.',
  })
  async getAssignedCourses(
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerCoursesResponse> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getAssignedCourses(userId, role);
  }

  @Get('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy chi tiết khóa học được phân công (bao gồm chương và bài giảng)',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết cấu trúc giáo trình khóa học.',
  })
  async getCourseDetail(
    @Param('id') courseId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerCourseItem> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getCourseDetail(userId, courseId, role);
  }

  @Get('courses/:id/students')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách học viên đăng ký của khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học viên theo học khóa học.',
  })
  async getCourseStudents(
    @Param('id') courseId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getCourseStudents(userId, courseId, role);
  }

  @Get('students')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách học sinh tham gia các khóa học và các chỉ số theo dõi học tập',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách học sinh kèm tiến độ học tập, bài tập đã làm và tỷ lệ hoàn thành.',
  })
  async getMonitoredStudents(
    @Query('courseId') courseId?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<MonitoredStudentsResponse> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getMonitoredStudents(userId, role, courseId);
  }

  @Get('students/:studentId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy chi tiết tiến độ học tập của học sinh trong khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tiến độ bài học, kết quả bài thi và các mốc học tập của học sinh.',
  })
  async getStudentProgress(
    @Param('studentId') studentId: string,
    @Query('courseId') courseId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<StudentProgressDetailResponse> {
    if (!courseId) {
      throw new BadRequestException('Vui lòng cung cấp mã khóa học (courseId).');
    }
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getStudentProgress(
      userId,
      studentId,
      courseId,
      role,
    );
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy dữ liệu tổng quan cho trang Dashboard Giảng viên',
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu tổng quan và tiến trình khóa học giảng viên.',
  })
  async getDashboardData(
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getDashboardData(userId, role);
  }

  @Post('courses/:id/chapters')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm chương học mới cho khóa học' })
  async addChapter(
    @Param('id') courseId: string,
    @Body() body: { title: string },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.addChapter(userId, courseId, role, body?.title);
  }

  @Put('chapters/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật tiêu đề chương học' })
  async updateChapter(
    @Param('id') chapterId: string,
    @Body() body: { title: string },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.updateChapter(
      userId,
      chapterId,
      role,
      body?.title,
    );
  }

  @Delete('chapters/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa chương học' })
  async deleteChapter(
    @Param('id') chapterId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.deleteChapter(userId, chapterId, role);
  }

  @Post('chapters/:id/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm bài học mới vào chương' })
  async addLesson(
    @Param('id') chapterId: string,
    @Body()
    body: {
      title: string;
      content?: string;
      videoUrl?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.addLesson(userId, chapterId, role, body);
  }

  @Put('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bài học' })
  async updateLesson(
    @Param('id') lessonId: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      videoUrl?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.updateLesson(userId, lessonId, role, body);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa bài học' })
  async deleteLesson(
    @Param('id') lessonId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.deleteLesson(userId, lessonId, role);
  }

  @Post('upload/video')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('video'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải lên video bài giảng lên Cloudinary' })
  async uploadVideo(
    @UploadedFile() file: UploadedFileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ url: string }> {
    await this.verifyLecturer(authorization);
    const url = await this.cloudinaryService.uploadVideo(file, 'lessons');
    return { url };
  }

  @Post('upload/solution')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải lên hình ảnh lời giải bài tập / đề thi lên Cloudinary' })
  async uploadSolutionFile(
    @UploadedFile() file: UploadedFileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ url: string }> {
    await this.verifyLecturer(authorization);
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp hình ảnh hoặc tài liệu PDF lời giải.');
    }
    const url = await this.cloudinaryService.uploadImage(file, 'solutions');
    return { url };
  }

  @Post('upload/document')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải lên tài liệu hoặc slide bài giảng lên Cloudinary' })
  async uploadDocument(
    @UploadedFile() file: UploadedFileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ url: string; originalname: string }> {
    await this.verifyLecturer(authorization);
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tài liệu để tải lên.');
    }
    return this.cloudinaryService.uploadDocument(file, 'documents');
  }

  // ============================================================
  // ASSESSMENT & ASSIGNMENT ENDPOINTS
  // ============================================================

  @Get('assessments')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bài tập / bài kiểm tra của giảng viên' })
  @ApiResponse({ status: 200, description: 'Danh sách bài tập.' })
  async getAssessments(
    @Query('courseId') courseId?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerAssessmentItem[]> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getAssessments(userId, role, courseId);
  }

  @Get('assessments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy chi tiết đề thi và câu hỏi của một bài tập' })
  @ApiResponse({ status: 200, description: 'Chi tiết bài tập và danh sách câu hỏi.' })
  async getAssessmentDetail(
    @Param('id') assessmentId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerAssessmentItem> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getAssessmentById(userId, assessmentId, role);
  }

  @Get('assessments/:id/results')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy kết quả bài làm và thống kê của học sinh từ database' })
  @ApiResponse({ status: 200, description: 'Dữ liệu kết quả bài làm và thống kê.' })
  async getAssessmentResults(
    @Param('id') assessmentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getAssessmentResults(userId, assessmentId, role);
  }

  @Put('submissions/:id/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lưu nhận xét cho bài nộp của học sinh và gửi thông báo kết quả' })
  @ApiResponse({ status: 200, description: 'Lưu nhận xét thành công và đã gửi thông báo.' })
  async saveSubmissionFeedback(
    @Param('id') submissionId: string,
    @Body() body: { feedback: string },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.saveSubmissionFeedback(
      userId,
      submissionId,
      body?.feedback ?? '',
      role,
    );
  }

  @Post('assessments')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo bài tập / bài kiểm tra mới trong database' })
  @ApiResponse({ status: 201, description: 'Bài tập đã được tạo thành công.' })
  async createAssessment(
    @Body() body: CreateAssessmentDto,
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerAssessmentItem> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.createAssessment(userId, body, role);
  }

  @Put('assessments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật đề thi, thang điểm, đáp án hoặc lịch giao' })
  @ApiResponse({ status: 200, description: 'Bài tập đã được cập nhật thành công.' })
  async updateAssessment(
    @Param('id') assessmentId: string,
    @Body() body: UpdateAssessmentDto,
    @Headers('authorization') authorization?: string,
  ): Promise<LecturerAssessmentItem> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.updateAssessment(userId, assessmentId, body, role);
  }

  @Delete('assessments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa bài tập' })
  @ApiResponse({ status: 200, description: 'Xóa bài tập thành công.' })
  async deleteAssessment(
    @Param('id') assessmentId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ success: boolean }> {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.deleteAssessment(userId, assessmentId, role);
  }

  @Post('assessments/:id/notify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gửi thông báo bài kiểm tra tới các học sinh trong khóa học' })
  @ApiResponse({ status: 200, description: 'Đã gửi thông báo thành công.' })
  async notifyAssessment(
    @Param('id') assessmentId: string,
    @Body() body: { targetStudentIds?: string[]; force?: boolean; customMessage?: string },
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.notifyStudentsAboutAssessment(assessmentId, userId, role, body);
  }

  @Get('discussions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các câu hỏi thảo luận của học sinh trong các khóa học do giảng viên phụ trách' })
  @ApiResponse({ status: 200, description: 'Danh sách thảo luận kèm thống kê.' })
  async getDiscussions(
    @Query('courseId') courseId?: string,
    @Query('status') status?: 'ALL' | 'UNANSWERED' | 'ANSWERED',
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId, role } = await this.verifyLecturer(authorization);
    return this.lecturerService.getLecturerDiscussions(userId, role, {
      courseId,
      status,
      search,
    });
  }
}
