import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { User } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto.js';
import { ResendResetOtpDto } from './dto/resend-reset-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export interface OtpResponse {
  message: string;
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface VerifyOtpResponse {
  message: string;
  email: string;
  fullName: string;
}

export interface VerifyResetOtpResponse {
  message: string;
  email: string;
  resetToken: string;
}

export interface ResetPasswordResponse {
  message: string;
  email: string;
}

interface StoredDevUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: string;
  status: string;
  avatarUrl: string | null;
}

interface PendingRegistration {
  fullName: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
  resendAvailableAt: number;
}

interface PendingPasswordReset {
  email: string;
  fullName: string;
  otp: string;
  expiresAt: number;
  resendAvailableAt: number;
  resetToken?: string;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private static readonly devUsers = new Map<string, StoredDevUser>();
  private static readonly pendingRegistrations = new Map<
    string,
    PendingRegistration
  >();
  private static readonly pendingPasswordResets = new Map<
    string,
    PendingPasswordReset
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  private pruneExpiredRegistrations(): void {
    const now = Date.now();
    for (const [key, value] of AuthService.pendingRegistrations.entries()) {
      if (now > value.expiresAt) {
        AuthService.pendingRegistrations.delete(key);
      }
    }
  }

  async initiateRegister(registerDto: RegisterDto): Promise<OtpResponse> {
    this.pruneExpiredRegistrations();

    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const cleanFullName = registerDto.fullName.trim();

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException(
          'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
        );
      }
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        throw err;
      }
    }

    if (
      normalizedEmail === 'student@tku.edu.vn' ||
      AuthService.devUsers.has(normalizedEmail)
    ) {
      throw new ConflictException(
        'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
      );
    }

    if (!this.mailService.isConfigured()) {
      throw new BadRequestException(
        'Hệ thống chưa được cấu hình tài khoản Google Mail. Vui lòng cấu hình MAIL_USER và MAIL_PASS trong file apps/api/.env.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    void this.mailService
      .sendOtpEmail(normalizedEmail, cleanFullName, otp)
      .catch((err: unknown) => {
        this.logger.error(
          `Gửi email OTP thất bại cho ${normalizedEmail}: ${(err as Error)?.message}`,
        );
      });

    const passwordHash = await this.hashPassword(registerDto.password);

    const now = Date.now();
    AuthService.pendingRegistrations.set(normalizedEmail, {
      fullName: cleanFullName,
      email: normalizedEmail,
      passwordHash,
      otp,
      expiresAt: now + 5 * 60 * 1000,
      resendAvailableAt: now + 60 * 1000,
    });

    return {
      message: 'Mã xác thực OTP đã được gửi đến email của bạn.',
      email: normalizedEmail,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponse> {
    const normalizedEmail = verifyOtpDto.email.trim().toLowerCase();
    const inputOtp = verifyOtpDto.otp.trim();

    const pending = AuthService.pendingRegistrations.get(normalizedEmail);
    if (!pending) {
      throw new BadRequestException(
        'Yêu cầu xác thực không tồn tại hoặc đã hết hạn. Vui lòng đăng ký lại.',
      );
    }

    if (Date.now() > pending.expiresAt) {
      AuthService.pendingRegistrations.delete(normalizedEmail);
      throw new BadRequestException(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
      );
    }

    if (pending.otp !== inputOtp) {
      throw new BadRequestException(
        'Mã OTP không chính xác. Vui lòng kiểm tra lại.',
      );
    }

    let createdUser: UserResponse;

    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: pending.email,
          fullName: pending.fullName,
          passwordHash: pending.passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });

      createdUser = {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
        avatarUrl: newUser.avatarUrl,
      };
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
        );
      }

      const devId = 'usr-dev-' + Date.now().toString();
      const devRecord: StoredDevUser = {
        id: devId,
        email: pending.email,
        fullName: pending.fullName,
        passwordHash: pending.passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        avatarUrl: null,
      };

      AuthService.devUsers.set(pending.email, devRecord);

      createdUser = {
        id: devRecord.id,
        email: devRecord.email,
        fullName: devRecord.fullName,
        role: devRecord.role,
        status: devRecord.status,
        avatarUrl: devRecord.avatarUrl,
      };
    }

    AuthService.pendingRegistrations.delete(normalizedEmail);

    return {
      message: 'Xác thực email và tạo tài khoản thành công!',
      email: createdUser.email,
      fullName: createdUser.fullName,
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponse> {
    const normalizedEmail = resendOtpDto.email.trim().toLowerCase();

    const pending = AuthService.pendingRegistrations.get(normalizedEmail);
    if (!pending) {
      throw new BadRequestException(
        'Không tìm thấy thông tin đăng ký cho email này. Vui lòng thực hiện đăng ký lại.',
      );
    }

    const now = Date.now();
    if (now < pending.resendAvailableAt) {
      const remainingSeconds = Math.ceil(
        (pending.resendAvailableAt - now) / 1000,
      );
      throw new BadRequestException(
        `Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu gửi lại mã OTP.`,
      );
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.expiresAt = now + 5 * 60 * 1000;
    pending.resendAvailableAt = now + 60 * 1000;

    void this.mailService
      .sendOtpEmail(pending.email, pending.fullName, newOtp)
      .catch((err: unknown) => {
        this.logger.error(
          `Gửi lại email OTP thất bại cho ${pending.email}: ${(err as Error)?.message}`,
        );
      });

    return {
      message: 'Mã xác thực OTP mới đã được gửi đến email của bạn.',
      email: pending.email,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    };
  }

  async validateUser(email: string, password: string): Promise<UserResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    let user: User | null = null;

    try {
      user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {}

    if (user) {
      if (user.status === 'SUSPENDED') {
        throw new ForbiddenException(
          'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
        );
      }

      if (user.status === 'INACTIVE') {
        throw new UnauthorizedException('Tài khoản chưa được kích hoạt.');
      }

      const isPasswordValid = await this.verifyPassword(
        user.passwordHash,
        password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
      };
    }

    const devUser = AuthService.devUsers.get(normalizedEmail);
    if (devUser) {
      const isDevPasswordValid = await this.verifyPassword(
        devUser.passwordHash,
        password,
      );

      if (!isDevPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
      }

      return {
        id: devUser.id,
        email: devUser.email,
        fullName: devUser.fullName,
        role: devUser.role,
        status: devUser.status,
        avatarUrl: devUser.avatarUrl,
      };
    }

    if (normalizedEmail === 'student@tku.edu.vn') {
      if (password !== 'Password@123') {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
      }

      return {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@tku.edu.vn',
        fullName: 'Học sinh TKU (Demo)',
        role: 'STUDENT',
        status: 'ACTIVE',
        avatarUrl: null,
      };
    }

    throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
        };
      }
    } catch {}

    for (const devUser of AuthService.devUsers.values()) {
      if (devUser.id === userId) {
        return {
          id: devUser.id,
          email: devUser.email,
          fullName: devUser.fullName,
          role: devUser.role,
          status: devUser.status,
          avatarUrl: devUser.avatarUrl,
        };
      }
    }

    if (userId === '11111111-1111-1111-1111-111111111111') {
      return {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@tku.edu.vn',
        fullName: 'Học sinh TKU (Demo)',
        role: 'STUDENT',
        status: 'ACTIVE',
        avatarUrl: null,
      };
    }

    throw new UnauthorizedException('Không tìm thấy thông tin người dùng.');
  }

  private pruneExpiredResets(): void {
    const now = Date.now();
    for (const [key, value] of AuthService.pendingPasswordResets.entries()) {
      if (now > value.expiresAt) {
        AuthService.pendingPasswordResets.delete(key);
      }
    }
  }

  private async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    fullName: string;
    status: string;
  } | null> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
        };
      }
    } catch {}

    const devUser = AuthService.devUsers.get(normalizedEmail);
    if (devUser) {
      return {
        id: devUser.id,
        email: devUser.email,
        fullName: devUser.fullName,
        status: devUser.status,
      };
    }

    if (normalizedEmail === 'student@tku.edu.vn') {
      return {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@tku.edu.vn',
        fullName: 'Học sinh TKU (Demo)',
        status: 'ACTIVE',
      };
    }

    return null;
  }

  async initiateForgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<OtpResponse> {
    this.pruneExpiredResets();

    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException(
        'Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.',
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    if (user.status === 'INACTIVE') {
      throw new BadRequestException(
        'Tài khoản này chưa được kích hoạt. Vui lòng hoàn tất kích hoạt tài khoản trước.',
      );
    }

    if (!this.mailService.isConfigured()) {
      throw new BadRequestException(
        'Hệ thống chưa được cấu hình tài khoản Google Mail. Vui lòng cấu hình MAIL_USER và MAIL_PASS trong file apps/api/.env.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    void this.mailService
      .sendPasswordResetOtpEmail(normalizedEmail, user.fullName, otp)
      .catch((err: unknown) => {
        this.logger.error(
          `Gửi email OTP đặt lại mật khẩu thất bại cho ${normalizedEmail}: ${(err as Error)?.message}`,
        );
      });

    const now = Date.now();
    AuthService.pendingPasswordResets.set(normalizedEmail, {
      email: normalizedEmail,
      fullName: user.fullName,
      otp,
      expiresAt: now + 5 * 60 * 1000,
      resendAvailableAt: now + 60 * 1000,
      isVerified: false,
    });

    return {
      message: 'Mã xác thực OTP đã được gửi đến email của bạn.',
      email: normalizedEmail,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    };
  }

  async verifyResetOtp(
    verifyResetOtpDto: VerifyResetOtpDto,
  ): Promise<VerifyResetOtpResponse> {
    const normalizedEmail = verifyResetOtpDto.email.trim().toLowerCase();
    const inputOtp = verifyResetOtpDto.otp.trim();

    const pending = AuthService.pendingPasswordResets.get(normalizedEmail);
    if (!pending) {
      throw new BadRequestException(
        'Yêu cầu khôi phục mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng thực hiện lại.',
      );
    }

    if (Date.now() > pending.expiresAt) {
      AuthService.pendingPasswordResets.delete(normalizedEmail);
      throw new BadRequestException(
        'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
      );
    }

    if (pending.otp !== inputOtp) {
      throw new BadRequestException(
        'Mã OTP không chính xác. Vui lòng kiểm tra lại.',
      );
    }

    const resetToken = randomUUID();
    pending.isVerified = true;
    pending.resetToken = resetToken;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;

    return {
      message: 'Xác thực OTP thành công. Vui lòng tạo mật khẩu mới.',
      email: normalizedEmail,
      resetToken,
    };
  }

  async resendResetOtp(
    resendResetOtpDto: ResendResetOtpDto,
  ): Promise<OtpResponse> {
    const normalizedEmail = resendResetOtpDto.email.trim().toLowerCase();

    const pending = AuthService.pendingPasswordResets.get(normalizedEmail);
    if (!pending) {
      throw new BadRequestException(
        'Không tìm thấy yêu cầu khôi phục mật khẩu cho email này. Vui lòng thực hiện lại từ đầu.',
      );
    }

    const now = Date.now();
    if (now < pending.resendAvailableAt) {
      const remainingSeconds = Math.ceil(
        (pending.resendAvailableAt - now) / 1000,
      );
      throw new BadRequestException(
        `Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu gửi lại mã OTP.`,
      );
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.expiresAt = now + 5 * 60 * 1000;
    pending.resendAvailableAt = now + 60 * 1000;
    pending.isVerified = false;
    pending.resetToken = undefined;

    void this.mailService
      .sendPasswordResetOtpEmail(pending.email, pending.fullName, newOtp)
      .catch((err: unknown) => {
        this.logger.error(
          `Gửi lại email OTP đặt lại mật khẩu thất bại cho ${pending.email}: ${(err as Error)?.message}`,
        );
      });

    return {
      message: 'Mã xác thực OTP mới đã được gửi đến email của bạn.',
      email: pending.email,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
    const normalizedEmail = resetPasswordDto.email.trim().toLowerCase();
    const { resetToken, newPassword } = resetPasswordDto;

    const pending = AuthService.pendingPasswordResets.get(normalizedEmail);
    if (!pending) {
      throw new BadRequestException(
        'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại.',
      );
    }

    if (Date.now() > pending.expiresAt) {
      AuthService.pendingPasswordResets.delete(normalizedEmail);
      throw new BadRequestException(
        'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu.',
      );
    }

    if (
      !pending.isVerified ||
      !pending.resetToken ||
      pending.resetToken !== resetToken
    ) {
      throw new UnauthorizedException(
        'Mã xác thực phiên đặt lại mật khẩu không hợp lệ. Vui lòng xác thực lại OTP.',
      );
    }

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    const passwordHash = await this.hashPassword(newPassword);

    try {
      await this.prisma.user.update({
        where: { email: normalizedEmail },
        data: { passwordHash },
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Không thể cập nhật mật khẩu trong Prisma: ${(err as Error)?.message}`,
      );
    }

    const devUser = AuthService.devUsers.get(normalizedEmail);
    if (devUser) {
      devUser.passwordHash = passwordHash;
    }

    if (normalizedEmail === 'student@tku.edu.vn') {
      AuthService.devUsers.set(normalizedEmail, {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@tku.edu.vn',
        fullName: 'Học sinh TKU (Demo)',
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        avatarUrl: null,
      });
    }

    AuthService.pendingPasswordResets.delete(normalizedEmail);

    return {
      message:
        'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
      email: normalizedEmail,
    };
  }
}