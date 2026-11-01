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
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
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
  AdminService,
  type DashboardStatsResponse,
  type AdminCoursesResponse,
  type AdminCourseItem,
  type AdminUsersResponse,
  type AdminUserItem,
  type AdminUserDetailResponse,
  type AdminActivationKeysResponse,
  type AdminActivationKeyItem,
} from './admin.service.js';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateChapterDto,
  CreateActivationKeysDto,
} from './dto/course.dto.js';
import {
  UpdateUserStatusDto,
  CreateUserDto,
  BulkCreateUsersDto,
} from './dto/user.dto.js';

import {
  CloudinaryService,
  type UploadedFileDto,
} from '../cloudinary/cloudinary.service.js';

@ApiTags('Admin')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async verifyAdmin(_authorization?: string): Promise<void> {
    // Đã được bảo vệ tối ưu bởi JwtAuthGuard và RolesGuard cấp Controller
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

  @Post('courses/:id/activation-keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin tạo mã Key 1 lần tham gia khóa học với thời hạn hiệu lực cụ thể',
  })
  @ApiResponse({
    status: 201,
    description: 'Danh sách mã key mới được tạo thành công.',
  })
  async createCourseActivationKeys(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateActivationKeysDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{
    message: string;
    totalCreated: number;
    expiresAt: Date;
    keys: AdminActivationKeyItem[];
  }> {
    await this.verifyAdmin(authorization);
    return this.adminService.createCourseActivationKeys(id, body);
  }

  @Get('courses/:id/activation-keys')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách và thống kê các mã key của khóa học',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách mã key kèm trạng thái ACTIVE, USED, EXPIRED.',
  })
  async getCourseActivationKeys(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminActivationKeysResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getCourseActivationKeys(id);
  }

  @Get('activation-keys')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả mã key trên hệ thống kèm thống kê',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách mã key, danh sách khóa học và thống kê.',
  })
  async getAllActivationKeys(
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.verifyAdmin(authorization);
    return this.adminService.getAllActivationKeys({ courseId, status, search });
  }

  @Delete('activation-keys/:keyId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa hoặc thu hồi mã key chưa sử dụng',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa mã key thành công.',
  })
  async deleteActivationKey(
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string; id: string }> {
    await this.verifyAdmin(authorization);
    return this.adminService.deleteActivationKey(keyId);
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách người dùng và thống kê vai trò',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài khoản người dùng và thống kê.',
  })
  async getUsers(
    @Headers('authorization') authorization?: string,
  ): Promise<AdminUsersResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getAdminUsers();
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết người dùng',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết thông tin tài khoản người dùng.',
  })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminUserDetailResponse> {
    await this.verifyAdmin(authorization);
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật trạng thái tài khoản người dùng',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái người dùng được cập nhật thành công.',
  })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserStatusDto,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminUserItem> {
    await this.verifyAdmin(authorization);
    return this.adminService.updateUserStatus(id, body.status);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo tài khoản người dùng mới',
  })
  @ApiResponse({
    status: 201,
    description: 'Tài khoản người dùng được tạo thành công.',
  })
  async createUser(
    @Body() body: CreateUserDto,
    @Headers('authorization') authorization?: string,
  ): Promise<AdminUserItem> {
    await this.verifyAdmin(authorization);
    return this.adminService.createUser(body);
  }

  @Post('users/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo hàng loạt tài khoản người dùng từ file hoặc danh sách',
  })
  @ApiResponse({
    status: 201,
    description: 'Kết quả tạo danh sách tài khoản người dùng.',
  })
  async bulkCreateUsers(
    @Body() body: BulkCreateUsersDto,
    @Headers('authorization') authorization?: string,
  ) {
    await this.verifyAdmin(authorization);
    return this.adminService.bulkCreateUsers(body);
  }
}
