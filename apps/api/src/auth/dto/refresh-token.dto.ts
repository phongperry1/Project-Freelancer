import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token để cấp mới access token',
  })
  @IsString({ message: 'Refresh token phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp refresh token.' })
  refreshToken: string;
}
