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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import {
  CloudinaryService,
  type UploadedFileDto,
} from '../cloudinary/cloudinary.service.js';
import {
  LecturerService,
  type LecturerCoursesResponse,
  type LecturerCourseItem,
} from './lecturer.service.js';

@ApiTags('Lecturer')
@Controller('api/v1/lecturer')
export class LecturerController {
  constructor(
    private readonly lecturerService: LecturerService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async verifyLecturer(
    authorization?: string,
  ): Promise<{ userId: string; role: string }> {
    if (!authorization) {
      throw new UnauthorizedException('Thiếu mã token xác thực.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    let payload: { sub?: string; role?: string } | null = null;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    if (payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào Không gian Giảng viên.',
      );
    }

    return { userId: payload.sub, role: payload.role };
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
}
