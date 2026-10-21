import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CourseService } from './course.service.js';

@ApiTags('Courses')
@Controller('api/v1/courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

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
  ) {
    return this.courseService.getPublicCourses({ grade, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết khóa học công khai theo ID' })
  @ApiParam({ name: 'id', description: 'Mã UUID của khóa học' })
  @ApiResponse({ status: 200, description: 'Chi tiết khóa học và cấu trúc chương mục' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khóa học hoặc mã ID không hợp lệ' })
  async getPublicCourseById(@Param('id') id: string) {
    return this.courseService.getPublicCourseById(id);
  }
}
