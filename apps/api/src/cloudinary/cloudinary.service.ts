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
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng hình ảnh không hợp lệ. Vui lòng tải lên ảnh JPG, PNG, WEBP hoặc GIF.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Dung lượng hình ảnh quá lớn. Vui lòng tải lên ảnh dưới 5MB.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tku-learning/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
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
}
