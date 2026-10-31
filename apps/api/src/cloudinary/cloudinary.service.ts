import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedFileDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(
    file: UploadedFileDto,
    folder: string = 'courses',
  ): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Hệ thống chưa được cấu hình tài khoản Cloudinary (thiếu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET trong file .env).',
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy tệp hình ảnh để tải lên.');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng tệp không hợp lệ. Vui lòng tải lên ảnh JPG, PNG, WEBP hoặc tài liệu PDF.',
      );
    }

    const isPdf = file.mimetype === 'application/pdf';
    const maxSizeBytes = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        isPdf
          ? 'Dung lượng tệp PDF quá lớn. Vui lòng tải lên tài liệu dưới 10MB.'
          : 'Dung lượng hình ảnh quá lớn. Vui lòng tải lên ảnh dưới 5MB.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tku-learning/${folder}`,
          resource_type: isPdf ? 'auto' : 'image',
          ...(isPdf ? {} : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(
              new BadRequestException(
                error?.message || 'Không thể tải ảnh lên Cloudinary.',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadVideo(
    file: UploadedFileDto,
    folder: string = 'lessons',
  ): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Hệ thống chưa được cấu hình tài khoản Cloudinary.',
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy tệp video để tải lên.');
    }

    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];
    if (
      !allowedMimeTypes.includes(file.mimetype) &&
      !file.mimetype.startsWith('video/')
    ) {
      throw new BadRequestException(
        'Định dạng video không hợp lệ. Vui lòng tải lên tệp MP4, WebM hoặc MOV.',
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException(
        'Dung lượng video vượt quá giới hạn cho phép (tối đa 100MB).',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tku-learning/${folder}`,
          resource_type: 'video',
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(
              new BadRequestException(
                error?.message || 'Không thể tải video lên Cloudinary.',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );
      uploadStream.end(file.buffer);
    });
  }
}
