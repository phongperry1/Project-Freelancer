import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private currentUser: string | null = null;
  private currentPass: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): nodemailer.Transporter | null {
    const user =
      this.configService.get<string>('MAIL_USER') ||
      this.configService.get<string>('GMAIL_USER') ||
      this.configService.get<string>('SMTP_USER') ||
      process.env.MAIL_USER ||
      process.env.GMAIL_USER ||
      process.env.SMTP_USER;

    const rawPass =
      this.configService.get<string>('MAIL_PASS') ||
      this.configService.get<string>('GMAIL_APP_PASSWORD') ||
      this.configService.get<string>('SMTP_PASS') ||
      process.env.MAIL_PASS ||
      process.env.GMAIL_APP_PASSWORD ||
      process.env.SMTP_PASS;

    if (!user || !rawPass || !rawPass.trim()) {
      return null;
    }

    const cleanPass = rawPass.replace(/\s+/g, '');

    if (
      this.transporter &&
      this.currentUser === user &&
      this.currentPass === cleanPass
    ) {
      return this.transporter;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        auth: {
          user,
          pass: cleanPass,
        },
      });

      this.currentUser = user;
      this.currentPass = cleanPass;
      this.logger.log(`Google Mail Transporter (Pool) đã kết nối với tài khoản: ${user}`);
      return this.transporter;
    } catch (err: unknown) {
      this.logger.error(
        `Không thể khởi tạo Google Mail Transporter: ${(err as Error).message}`,
      );
      return null;
    }
  }

  isConfigured(): boolean {
    return this.initTransporter() !== null;
  }

  async onModuleInit(): Promise<void> {
    const transporter = this.initTransporter();
    if (transporter && this.currentUser) {
      try {
        await transporter.verify();
        this.logger.log(
          `Google Mail SMTP đã xác thực thành công cho [${this.currentUser}]. Hệ thống sẵn sàng gửi email OTP thực tế!`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Cảnh báo kết nối Google Mail SMTP: ${(err as Error).message}. Vui lòng kiểm tra lại MAIL_USER và MAIL_PASS (Mật khẩu ứng dụng 16 ký tự của Google) trong apps/api/.env`,
        );
      }
    } else {
      this.logger.warn(
        'Chưa cấu hình MAIL_USER hoặc MAIL_PASS trong apps/api/.env. Vui lòng cung cấp Mật khẩu ứng dụng Google để gửi email thực tế.',
      );
    }
  }

  async sendOtpEmail(to: string, fullName: string, otp: string): Promise<boolean> {
    const transporter = this.initTransporter();

    if (!transporter) {
      const errorMsg =
        'Hệ thống chưa thể gửi mã xác thực vì chưa cấu hình tài khoản Google Mail. Vui lòng cấu hình MAIL_USER và MAIL_PASS (Mật khẩu ứng dụng 16 ký tự của Google) trong file apps/api/.env.';
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    const mailUser = this.currentUser || '';
    const fromAddress =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM') ||
      `"TKU Chemistry Center" <${mailUser}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đăng ký TKU</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 540px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1d68f2 0%, #1754c7 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .brand-sub { font-size: 11px; letter-spacing: 0.1em; opacity: 0.9; margin-top: 4px; font-weight: 600; text-transform: uppercase; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .desc { font-size: 14.5px; color: #475569; margin-bottom: 24px; }
    .otp-wrapper { text-align: center; margin: 28px 0; }
    .otp-code { display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d68f2; background-color: #eff6ff; padding: 14px 28px; border-radius: 10px; border: 2px dashed #93c5fd; }
    .note { font-size: 13px; color: #64748b; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-top: 24px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-title">TKU CHEMISTRY CENTER</div>
      <div class="brand-sub">Tư Duy • Kiến Thức • Ước Mơ</div>
    </div>
    <div class="content">
      <div class="greeting">Xin chào ${fullName},</div>
      <div class="desc">
        Cảm ơn bạn đã lựa chọn nền tảng học tập Hóa học <strong>TKU</strong>. Để hoàn tất đăng ký tài khoản học sinh, vui lòng nhập mã xác thực (OTP) dưới đây:
      </div>
      <div class="otp-wrapper">
        <span class="otp-code">${otp}</span>
      </div>
      <div class="note">
        ⏱️ Mã xác thực này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
        🔒 Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai.
      </div>
    </div>
    <div class="footer">
      Đây là email tự động từ hệ thống TKU, vui lòng không trả lời thư này.<br>
      © ${new Date().getFullYear()} TKU Chemistry Center. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `Xin chào ${fullName},

Cảm ơn bạn đã đăng ký tài khoản tại TKU Chemistry Center.
Mã xác thực (OTP) hoàn tất đăng ký của bạn là: ${otp}

Mã xác thực này có hiệu lực trong vòng 5 phút. Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai.

Trân trọng,
TKU Chemistry Center
Tư Duy • Kiến Thức • Ước Mơ`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        sender: mailUser,
        replyTo: mailUser,
        to,
        subject: `Mã xác thực tài khoản TKU của bạn: ${otp}`,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'Importance': 'high',
        },
      });
      this.logger.log(`Đã gửi email OTP thực tế thành công tới: ${to}`);
      return true;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Lỗi gửi mail qua Google';
      this.logger.error(
        `Gửi email thực tế thất bại qua Google Mail tới [${to}]: ${errMsg}`,
      );
      throw new BadRequestException(
        `Không thể gửi mã xác thực tới email ${to} qua Google Mail: ${errMsg}. Vui lòng kiểm tra lại tài khoản hoặc Mật khẩu ứng dụng Google.`,
      );
    }
  }
}
