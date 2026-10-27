import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AiAssistantService } from './ai-assistant.service.js';
import { AskAiQuestionDto } from './dto/ask-ai-question.dto.js';

@ApiTags('AI Learning Assistant')
@Controller('api/v1/courses/:courseId/lessons/:lessonId/ai')
export class AiAssistantController {
  constructor(
    private readonly aiAssistantService: AiAssistantService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper xác thực token và trích xuất ID học sinh
   */
  private async getStudentIdFromHeader(authorization?: string): Promise<string> {
    if (!authorization) {
      throw new UnauthorizedException('Vui lòng đăng nhập để sử dụng Trợ lý Gia sư AI.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }

    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      'tku-learning-platform-secret-jwt-key-2026';

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token, {
        secret,
      });
      if (!payload?.sub) {
        throw new UnauthorizedException('Không thể xác thực danh tính người dùng.');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }

  @Get('sessions')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy danh sách các phiên trò chuyện của học sinh trong bài học' })
  @ApiParam({ name: 'courseId', description: 'Mã UUID khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID bài học' })
  @ApiResponse({ status: 200, description: 'Danh sách các phiên trò chuyện' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async getLessonAiSessions(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.aiAssistantService.getLessonAiSessions(courseId, lessonId, studentId);
  }

  @Get('history')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Lấy lịch sử hội thoại giữa học sinh và Gia sư AI trong bài học' })
  @ApiParam({ name: 'courseId', description: 'Mã UUID khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID bài học' })
  @ApiResponse({ status: 200, description: 'Lịch sử đoạn chat theo thứ tự thời gian tăng dần' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async getLessonAiHistory(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Query('sessionId') sessionId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.aiAssistantService.getLessonAiHistory(courseId, lessonId, studentId, sessionId);
  }

  @Post('ask')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Gửi câu hỏi tới Gia sư AI theo ngữ cảnh bài học (định hướng phương pháp Socratic & LaTeX)',
  })
  @ApiParam({ name: 'courseId', description: 'Mã UUID khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID bài học' })
  @ApiResponse({ status: 201, description: 'Câu trả lời sư phạm kèm lưu vết CSDL' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async askAiAssistant(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: AskAiQuestionDto,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.aiAssistantService.askAiAssistant(
      courseId,
      lessonId,
      studentId,
      dto.question,
      dto.sessionId,
    );
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa một phiên trò chuyện cụ thể' })
  @ApiParam({ name: 'courseId', description: 'Mã UUID khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID bài học' })
  @ApiParam({ name: 'sessionId', description: 'Mã định danh phiên chat' })
  @ApiResponse({ status: 200, description: 'Xóa phiên chat thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async deleteLessonAiSession(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.aiAssistantService.deleteLessonAiSession(courseId, lessonId, studentId, sessionId);
  }

  @Delete('history')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa toàn bộ lịch sử trò chuyện AI trong bài học này để bắt đầu phiên mới' })
  @ApiParam({ name: 'courseId', description: 'Mã UUID khóa học' })
  @ApiParam({ name: 'lessonId', description: 'Mã UUID bài học' })
  @ApiResponse({ status: 200, description: 'Xóa lịch sử thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async clearLessonAiHistory(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const studentId = await this.getStudentIdFromHeader(authorization);
    return this.aiAssistantService.clearLessonAiHistory(courseId, lessonId, studentId);
  }
}
