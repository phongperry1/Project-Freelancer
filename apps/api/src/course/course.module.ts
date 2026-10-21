import { Module } from '@nestjs/common';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
