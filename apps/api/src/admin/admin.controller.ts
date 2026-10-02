import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Delete,
  Param,
  ParseUUIDPipe,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
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
  AdminService,
  type DashboardStatsResponse,
  type AdminCoursesResponse,
  type AdminCourseItem,
} from './admin.service.js';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateChapterDto,
} from './dto/course.dto.js';

import {
  CloudinaryService,
  type UploadedFileDto,
} from '../cloudinary/cloudinary.service.js';

@ApiTags('Admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async verifyAdmin(authorization?: string): Promise<void> {
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

    if (payload.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập trang quản trị hệ thống.',
      );
    }
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy dữ liệu thống kê tổng quan cho Admin Dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tổng quan hệ thống.',
  })
  async getDashboard(
    @Headers('authorization') authorization?: string,
  ): Promise<DashboardStatsResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getDashboardStats();
  }

  @Get('courses')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách khóa học và thống kê cho trang quản lý khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách khóa học và thống kê phân loại.',
  })
  async getCourses(
    @Headers('authorization') authorization?: string,
  ): Promise<AdminCoursesResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getAdminCourses();
  }

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo khóa học mới dành cho admin',
  })
  @ApiResponse({
    status: 201,
    description: 'Khóa học được tạo thành công.',
  })
  async createCourse(
    @Body() body: CreateCourseDto,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminCourseItem> {
    await this.verifyAdmin(authorization);
    return this.adminService.createCourse(body);
  }

  @Post('courses/upload-thumbnail')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tải lên ảnh bìa khóa học lên Cloudinary',
  })
  @ApiResponse({
    status: 200,
    description: 'Đường dẫn ảnh bìa đã tải lên thành công.',
  })
  async uploadCourseThumbnail(
    @UploadedFile() file: UploadedFileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ url: string }> {
    await this.verifyAdmin(authorization);
    const url = await this.cloudinaryService.uploadImage(file, 'courses');
    return { url };
  }

  @Get('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy chi tiết khóa học theo ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết thông tin khóa học kèm chương học và bài giảng.',
  })
  async getCourseById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.verifyAdmin(authorization);
    return this.adminService.getCourseById(id);
  }

  @Put('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chỉnh sửa thông tin khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Khóa học được cập nhật thành công.',
  })
  async updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCourseDto,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminCourseItem> {
    await this.verifyAdmin(authorization);
    return this.adminService.updateCourse(id, body);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa hoặc lưu trữ khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả xử lý xóa hoặc lưu trữ khóa học.',
  })
  async deleteCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.verifyAdmin(authorization);
    return this.adminService.deleteCourse(id);
  }

  @Post('courses/:id/chapters')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo chương học mới cho khóa học',
  })
  @ApiResponse({
    status: 201,
    description: 'Chương học được tạo thành công.',
  })
  async addChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateChapterDto,
    @Headers('authorization') authorization?: string,
  ) {
    await this.verifyAdmin(authorization);
    return this.adminService.addChapter(id, body);
  }
}


