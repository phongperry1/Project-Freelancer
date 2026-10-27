import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { LecturerModule } from './lecturer/lecturer.module.js';
import { CourseModule } from './course/course.module.js';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    LecturerModule,
    CourseModule,
    AiAssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}