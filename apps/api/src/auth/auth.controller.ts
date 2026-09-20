import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản',
    description: 'Tạo tài khoản học sinh mới.',
  })
  @ApiBody({
    type: RegisterDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký tài khoản thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đăng ký không hợp lệ.',
  })
  async register(@Body() registerDto: RegisterDto) {
    const passwordHash = await this.authService.hashPassword(
      registerDto.password,
    );

    return {
      email: registerDto.email,
      fullName: registerDto.fullName,
      passwordHash,
    };
  }
}