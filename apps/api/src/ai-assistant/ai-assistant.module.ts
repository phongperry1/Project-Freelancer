import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AiAssistantController } from './ai-assistant.controller.js';
import { AiAssistantService } from './ai-assistant.service.js';
import { YouTubeTranscriptService } from './youtube-transcript.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ??
          'tku-learning-platform-secret-jwt-key-2026',
      }),
    }),
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, YouTubeTranscriptService],
  exports: [AiAssistantService, YouTubeTranscriptService],
})
export class AiAssistantModule {}
