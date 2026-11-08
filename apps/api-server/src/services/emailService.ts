import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface SendOtpEmailOptions {
  email: string;
  name: string;
  otp: string;
}

export async function sendOtpEmail({ email, name, otp }: SendOtpEmailOptions): Promise<void> {
  const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SkillX Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 540px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
    .body { padding: 32px 28px; color: #1e293b; }
    .greeting { font-size: 16px; margin-bottom: 16px; font-weight: 600; }
    .instruction { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-box { background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
    .warning { font-size: 13px; color: #dc2626; margin-top: 12px; font-weight: 500; }
    .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SkillX</h1>
      <p>Sukkur IBA University Peer Exchange</p>
    </div>
    <div class="body">
      <div class="greeting">Assalamu Alaikum, ${name}!</div>
      <p class="instruction">
        Use the 6-digit one-time passcode below to verify your Sukkur IBA student identity and activate your SkillX wallet with <strong>5 Promo Tokens</strong>.
      </p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="warning">&#9888; Valid for 10 minutes only. Never share this code with anyone.</div>
      </div>
      <p class="instruction">
        If you did not request this verification code, please ignore this email.
      </p>
    </div>
    <div class="footer">
      Sukkur IBA University &bull; Knowledge Center &bull; SkillX Platform Engine
    </div>
  </div>
</body>
</html>
  `;

  if (!isSmtpConfigured || env.NODE_ENV !== "production") {
    console.log("------------------------------------------------------------------");
    console.log(`[EMAIL SERVICE] Mock Dispatch -> To: ${email} (${name})`);
    console.log(`[EMAIL SERVICE] Verification OTP Code: ${otp}`);
    console.log(`[EMAIL SERVICE] Expiry: 10 minutes`);
    console.log("------------------------------------------------------------------");
    if (!isSmtpConfigured) {
      return;
    }
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: `SkillX Verification Code: ${otp}`,
    text: `Assalamu Alaikum ${name},\n\nYour SkillX verification code is: ${otp}. It expires in 10 minutes.\n\nSukkur IBA University Peer Exchange`,
    html: htmlContent
  });
}
