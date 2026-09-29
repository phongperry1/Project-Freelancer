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
        maxMessages: Infinity,
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: true,
          servername: 'smtp.gmail.com',
        },
        auth: {
          user,
          pass: cleanPass,
        },
      } as nodemailer.TransportOptions);

      this.currentUser = user;
      this.currentPass = cleanPass;
      this.logger.log(`Google Mail Transporter (Pool IPv4) đã kết nối với tài khoản: ${user}`);
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
          `Google Mail SMTP đã xác thực thành công cho [${this.currentUser}].`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Cảnh báo kết nối Google Mail SMTP: ${(err as Error).message}.`,
        );
      }
    } else {
      this.logger.warn(
        'Chưa cấu hình MAIL_USER hoặc MAIL_PASS để gửi email.',
      );
    }
  }

  async sendOtpEmail(to: string, fullName: string, otp: string): Promise<boolean> {
    const transporter = this.initTransporter();

    if (!transporter) {
      this.logger.error('Hệ thống chưa cấu hình tài khoản gửi mail.');
      throw new BadRequestException('Dịch vụ gửi email tạm thời không khả dụng. Vui lòng thử lại sau.');
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
        subject: `[TKU] ${otp} là mã xác thực đăng ký tài khoản của bạn`,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'X-Mailer': 'TKU-Learning-Platform',
        },
      });
      this.logger.log(`Đã gửi email OTP thành công tới: ${to}`);
      return true;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Lỗi gửi mail qua Google';
      this.logger.error(
        `Gửi email OTP thất bại tới [${to}]: ${errMsg}`,
      );
      throw new BadRequestException(
        'Không thể gửi mã xác thực tới email của bạn vào lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  async sendPasswordResetOtpEmail(
    to: string,
    fullName: string,
    otp: string,
  ): Promise<boolean> {
    const transporter = this.initTransporter();

    if (!transporter) {
      this.logger.error('Hệ thống chưa cấu hình tài khoản gửi mail.');
      throw new BadRequestException('Dịch vụ gửi email tạm thời không khả dụng. Vui lòng thử lại sau.');
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
  <title>Khôi phục mật khẩu TKU</title>
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
    .note { font-size: 13px; color: #64748b; background-color: #f8fafc; border-left: 4px solid #1d68f2; padding: 12px 16px; border-radius: 4px; margin-top: 24px; }
    .warning { font-size: 12.5px; color: #b91c1c; margin-top: 14px; }
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
        Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>TKU</strong> của bạn. Vui lòng nhập mã xác thực (OTP) dưới đây để tiếp tục quá trình khôi phục:
      </div>
      <div class="otp-wrapper">
        <span class="otp-code">${otp}</span>
      </div>
      <div class="note">
        ⏱️ Mã xác thực này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
        🔒 Tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.
      </div>
      <div class="warning">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu để bảo vệ tài khoản.
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

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản TKU của bạn.
Mã xác thực (OTP) đặt lại mật khẩu của bạn là: ${otp}

Mã xác thực này có hiệu lực trong vòng 5 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua thư này.

Trân trọng,
TKU Chemistry Center
Tư Duy • Kiến Thức • Ước Mơ`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        sender: mailUser,
        replyTo: mailUser,
        to,
        subject: `[TKU] ${otp} là mã xác thực đặt lại mật khẩu của bạn`,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'X-Mailer': 'TKU-Learning-Platform',
        },
      });
      this.logger.log(`Đã gửi email OTP đặt lại mật khẩu tới: ${to}`);
      return true;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Lỗi gửi mail qua Google';
      this.logger.error(
        `Gửi email OTP đặt lại mật khẩu thất bại tới [${to}]: ${errMsg}`,
      );
      throw new BadRequestException(
        'Không thể gửi mã xác thực đặt lại mật khẩu vào lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  async sendNewDeviceOtpEmail(
    to: string,
    fullName: string,
    otp: string,
    deviceName: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const transporter = this.initTransporter();

    if (!transporter) {
      this.logger.error('Hệ thống chưa cấu hình tài khoản gửi mail.');
      throw new BadRequestException('Dịch vụ gửi email tạm thời không khả dụng. Vui lòng thử lại sau.');
    }

    const mailUser = this.currentUser || '';
    const fromAddress =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM') ||
      `"TKU Chemistry Center" <${mailUser}>`;

    const nowFormatted = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực thiết bị mới TKU</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 540px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1d68f2 0%, #0d3278 100%); color: #ffffff; padding: 26px 24px; text-align: center; }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .brand-sub { font-size: 11px; letter-spacing: 0.1em; opacity: 0.9; margin-top: 4px; font-weight: 600; text-transform: uppercase; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .desc { font-size: 14.5px; color: #475569; margin-bottom: 20px; }
    .device-box { background-color: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; border-left: 4px solid #3b82f6; font-size: 13.5px; }
    .device-row { margin: 4px 0; color: #334155; }
    .device-row strong { color: #0f172a; }
    .otp-wrapper { text-align: center; margin: 26px 0; }
    .otp-code { display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d68f2; background-color: #eff6ff; padding: 14px 28px; border-radius: 10px; border: 2px dashed #93c5fd; }
    .warning { font-size: 13px; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 8px; margin-top: 24px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-title">TKU CHEMISTRY CENTER</div>
      <div class="brand-sub">Cảnh Báo An Ninh • Xác Thực Thiết Bị</div>
    </div>
    <div class="content">
      <div class="greeting">Xin chào ${fullName},</div>
      <div class="desc">
        Hệ thống phát hiện tài khoản TKU của bạn vừa đăng nhập từ một <strong>thiết bị mới</strong> chưa từng được xác thực trước đây:
      </div>
      <div class="device-box">
        <div class="device-row">📱 <strong>Thiết bị:</strong> ${deviceName}</div>
        <div class="device-row">🌐 <strong>Địa chỉ IP:</strong> ${ipAddress || 'Không xác định'}</div>
        <div class="device-row">🕒 <strong>Thời gian:</strong> ${nowFormatted}</div>
      </div>
      <div class="desc">
        Nếu chính bạn đang thực hiện đăng nhập, vui lòng nhập mã xác thực OTP 6 số dưới đây để cấp quyền cho thiết bị này:
      </div>
      <div class="otp-wrapper">
        <span class="otp-code">${otp}</span>
      </div>
      <div class="warning">
        ⚠️ Mã OTP có hiệu lực trong <strong>5 phút</strong>.<br>
        Nếu bạn <strong>KHÔNG</strong> thực hiện đăng nhập này, rất có thể mật khẩu của bạn đã bị lộ. Vui lòng đổi mật khẩu ngay lập tức!
      </div>
    </div>
    <div class="footer">
      Đây là email cảnh báo tự động từ hệ thống bảo mật TKU, vui lòng không trả lời thư này.
    </div>
  </div>
</body>
</html>`;

    const textContent = `Xin chào ${fullName},

Hệ thống phát hiện tài khoản TKU của bạn vừa đăng nhập từ thiết bị mới:
- Thiết bị: ${deviceName}
- IP: ${ipAddress || 'Không xác định'}
- Thời gian: ${nowFormatted}

Mã xác thực (OTP) cho thiết bị mới là: ${otp} (Hiệu lực 5 phút).

Nếu không phải bạn, hãy đổi mật khẩu tài khoản ngay!

Trân trọng,
TKU Chemistry Center`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        sender: mailUser,
        replyTo: mailUser,
        to,
        subject: `[Bảo Mật TKU] ${otp} là mã xác thực thiết bị mới của bạn`,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'X-Mailer': 'TKU-Learning-Platform',
        },
      });
      this.logger.log(`Đã gửi email OTP xác thực thiết bị mới tới: ${to}`);
      return true;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Lỗi gửi mail qua Google';
      this.logger.error(
        `Gửi email OTP xác thực thiết bị thất bại tới [${to}]: ${errMsg}`,
      );
      throw new BadRequestException(
        'Không thể gửi mã xác thực thiết bị mới vào lúc này. Vui lòng thử lại sau.',
      );
    }
  }
}


