import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  AuthService,
  type AuthResponse,
  type OtpResponse,
  type VerifyOtpResponse,
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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }
}