import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RegisterDto } from './dto/register.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto.js';
import { ResendResetOtpDto } from './dto/resend-reset-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { VerifyDeviceOtpDto } from './dto/verify-device-otp.dto.js';
import { ResendDeviceOtpDto } from './dto/resend-device-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { SetInitialPasswordDto } from './dto/set-initial-password.dto.js';
import { type UploadedFileDto } from '../cloudinary/cloudinary.service.js';
import {
  AuthService,
  type AuthResponse,
  type OtpResponse,
  type VerifyOtpResponse,
  type VerifyResetOtpResponse,
  type ResetPasswordResponse,
  type UserResponse,
  UserDeviceResponse,
} from './auth.service.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 1: Khởi tạo đăng ký tài khoản & gửi OTP',
    description:
      'Kiểm tra tính hợp lệ của thông tin đăng ký, băm mật khẩu, tạo mã OTP 6 chữ số và gửi đến email của học sinh.',
  })
  @ApiBody({
    type: RegisterDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Mã OTP đã được gửi đến email thành công.',
  })
  @ApiConflictResponse({
    description: 'Email này đã được sử dụng.',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đăng ký không hợp lệ.',
  })
  async register(@Body() registerDto: RegisterDto): Promise<OtpResponse> {
    return this.authService.initiateRegister(registerDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 2: Xác thực mã OTP & hoàn tất đăng ký',
    description:
      'Kiểm tra mã OTP 6 chữ số gửi qua email. Nếu hợp lệ, tài khoản được tạo và kích hoạt thành công.',
  })
  @ApiBody({
    type: VerifyOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực OTP và đăng ký tài khoản thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Mã OTP không chính xác hoặc đã hết hạn.',
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<VerifyOtpResponse> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi lại mã OTP xác thực',
    description:
      'Tạo mã OTP mới và gửi lại vào email nếu mã cũ hết hạn (có giới hạn cooldown 60s).',
  })
  @ApiBody({
    type: ResendOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đã gửi lại mã OTP mới.',
  })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không hợp lệ hoặc đang trong thời gian chờ cooldown.',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<OtpResponse> {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập tài khoản',
    description:
      'Xác thực email và mật khẩu, trả về JWT Access Token cùng thông tin tài khoản.',
  })
  @ApiBody({
    type: LoginDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công.',
  })
  @ApiUnauthorizedResponse({
    description: 'Email hoặc mật khẩu không chính xác.',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đầu vào không hợp lệ.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip?: string,
    @Req() req?: Request,
  ): Promise<AuthResponse> {
    const forwarded =
      typeof req?.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined;
    const clientIp =
      loginDto.ipAddress ||
      ip ||
      forwarded ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';
    return this.authService.login(loginDto, clientIp);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập hoặc đăng ký bằng tài khoản Google',
    description:
      'Xác thực Google ID Token, tự động đồng bộ avatar và thông tin nếu email đã tồn tại hoặc tạo mới tài khoản nếu chưa tồn tại.',
  })
  @ApiBody({
    type: GoogleAuthDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập Google thành công, trả về Access Token và thông tin người dùng.',
  })
  @ApiUnauthorizedResponse({
    description: 'Mã xác thực Google không hợp lệ hoặc đã hết hạn.',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu xác thực không hợp lệ.',
  })
  async loginWithGoogle(
    @Body() googleAuthDto: GoogleAuthDto,
  ): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(googleAuthDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 1: Yêu cầu khôi phục mật khẩu & gửi OTP',
    description:
      'Kiểm tra email người dùng, tạo mã OTP 6 chữ số và gửi qua email để bắt đầu khôi phục mật khẩu.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Mã xác thực OTP đã được gửi đến email thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Email không hợp lệ hoặc lỗi cấu hình hệ thống.',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<OtpResponse> {
    return this.authService.initiateForgotPassword(forgotPasswordDto);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 2: Xác minh mã OTP đặt lại mật khẩu',
    description:
      'Xác thực mã OTP 6 chữ số gửi qua email. Nếu hợp lệ, trả về resetToken tạm thời để cho phép đặt mật khẩu mới.',
  })
  @ApiBody({
    type: VerifyResetOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực OTP thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Mã OTP không chính xác hoặc đã hết hạn.',
  })
  async verifyResetOtp(
    @Body() verifyResetOtpDto: VerifyResetOtpDto,
  ): Promise<VerifyResetOtpResponse> {
    return this.authService.verifyResetOtp(verifyResetOtpDto);
  }

  @Post('resend-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi lại mã OTP đặt lại mật khẩu',
    description:
      'Tạo mã OTP mới và gửi lại vào email với thời gian chờ cooldown 60s.',
  })
  @ApiBody({
    type: ResendResetOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đã gửi lại mã OTP mới.',
  })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không hợp lệ hoặc đang trong thời gian chờ cooldown.',
  })
  async resendResetOtp(
    @Body() resendResetOtpDto: ResendResetOtpDto,
  ): Promise<OtpResponse> {
    return this.authService.resendResetOtp(resendResetOtpDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 3: Tạo mật khẩu mới',
    description:
      'Cập nhật mật khẩu mới cho tài khoản dựa trên resetToken đã được xác thực.',
  })
  @ApiBody({
    type: ResetPasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Mật khẩu mới không hợp lệ hoặc resetToken không chính xác/hết hạn.',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('verify-device-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực OTP thiết bị mới và cấp token phiên',
  })
  @ApiBody({
    type: VerifyDeviceOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực thiết bị thành công, đăng nhập thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Mã OTP không chính xác hoặc đã hết hạn.',
  })
  async verifyDeviceOtp(
    @Body() verifyDeviceOtpDto: VerifyDeviceOtpDto,
  ): Promise<AuthResponse> {
    return this.authService.verifyDeviceOtp(verifyDeviceOtpDto);
  }

  @Post('resend-device-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi lại OTP xác thực thiết bị mới',
  })
  @ApiBody({
    type: ResendDeviceOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đã gửi lại mã OTP xác thực thiết bị.',
  })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không hợp lệ hoặc đang trong thời gian chờ cooldown.',
  })
  async resendDeviceOtp(
    @Body() resendDeviceOtpDto: ResendDeviceOtpDto,
  ): Promise<OtpResponse> {
    return this.authService.resendDeviceOtp(resendDeviceOtpDto);
  }

  @Get('check-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra trạng thái phiên đăng nhập của thiết bị hiện tại',
  })
  async checkSession(
    @Headers('authorization') authorization?: string,
  ): Promise<{ valid: boolean; code?: string; message?: string }> {
    return this.authService.checkSession(authorization);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token bằng Refresh Token (hiệu lực 7 ngày)',
    description:
      'Xác thực refresh token hợp lệ và cấp cặp token mới.',
  })
  @ApiBody({
    type: RefreshTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Cấp mới token thành công.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token không hợp lệ hoặc đã hết hạn sau 7 ngày.',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponse> {
    return this.authService.refreshAccessToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất khỏi thiết bị hiện tại',
  })
  async logout(
    @Headers('authorization') authorization?: string,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<{ message: string }> {
    return this.authService.logout(authorization, refreshToken);
  }

  @Get('devices')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách các thiết bị đã đăng nhập của người dùng',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thiết bị đăng nhập.',
  })
  async getDevices(
    @Headers('authorization') authorization?: string,
  ): Promise<UserDeviceResponse[]> {
    const { userId, sessionId } = await this.authService.extractSessionInfo(authorization);
    return this.authService.getUserDevices(userId, sessionId);
  }

  @Delete('devices/others')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất khỏi tất cả các thiết bị khác',
  })
  async logoutOtherDevices(
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string; revokedCount: number }> {
    const { userId, sessionId } = await this.authService.extractSessionInfo(authorization);
    return this.authService.revokeOtherDevices(userId, sessionId);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất khỏi một thiết bị cụ thể',
  })
  async logoutDevice(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string }> {
    const { userId } = await this.authService.extractSessionInfo(authorization);
    return this.authService.revokeDevice(userId, id);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin trang cá nhân của người dùng hiện tại',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin người dùng thành công.',
  })
  async getProfile(
    @Headers('authorization') authorization?: string,
  ): Promise<UserResponse> {
    const userId = await this.authService.extractUserIdFromHeader(authorization);
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật thông tin trang cá nhân người dùng',
  })
  @ApiBody({
    type: UpdateProfileDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thành công.',
  })
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<UserResponse> {
    const userId = await this.authService.extractUserIdFromHeader(authorization);
    return this.authService.updateProfile(userId, updateProfileDto);
  }


  @Post('set-initial-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Thiết lập mật khẩu lần đầu cho tài khoản (dành cho người dùng Google)',
  })
  @ApiBody({
    type: SetInitialPasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Thiết lập mật khẩu thành công.',
  })
  async setInitialPassword(
    @Body() setInitialPasswordDto: SetInitialPasswordDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string }> {
    const userId = await this.authService.extractUserIdFromHeader(authorization);
    return this.authService.setInitialPassword(userId, setInitialPasswordDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đổi mật khẩu người dùng',
  })
  @ApiBody({
    type: ChangePasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Đổi mật khẩu thành công.',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ message: string }> {
    const userId = await this.authService.extractUserIdFromHeader(authorization);
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('upload-avatar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Tải lên ảnh đại diện cá nhân lên Cloudinary',
  })
  @ApiResponse({
    status: 200,
    description: 'Tải lên ảnh đại diện thành công.',
  })
  async uploadAvatar(
    @UploadedFile() file: UploadedFileDto,
    @Headers('authorization') authorization?: string,
  ): Promise<{ avatarUrl: string; user: UserResponse }> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tập tin ảnh hợp lệ.');
    }
    const userId = await this.authService.extractUserIdFromHeader(authorization);
    return this.authService.uploadAvatar(userId, file);
  }
}
