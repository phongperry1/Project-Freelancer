import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
            },
            authToken: {
              findFirst: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              deleteMany: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn().mockResolvedValue('test_token'),
            verifyAsync: vi.fn().mockResolvedValue({ sub: '1', email: 'test@example.com' }),
          },
        },
        {
          provide: MailService,
          useValue: {
            isConfigured: vi.fn().mockReturnValue(true),
            sendOtpEmail: vi.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test_jwt_secret_1234567890';
              if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_1234567890';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
