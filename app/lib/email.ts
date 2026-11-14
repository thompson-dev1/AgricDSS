import "server-only";

import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.MAIL_FROM || user;

  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    throw new Error("Email delivery is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const safeName = escapeHtml(name);
  await transporter.sendMail({
    from,
    to,
    subject: "AGRIC DSS - Email Verification Code",
    text: `Hello ${name}, your AGRIC DSS verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#1b5e20,#2e7d32);padding:30px;text-align:center;border-radius:12px 12px 0 0;color:white">
          <h2 style="margin:0">🌾 AGRIC DSS</h2>
          <p style="margin:5px 0 0">Agricultural Decision Support System</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #e0e0e0">
          <h3>Verify your email address</h3>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Use this code to complete your registration:</p>
          <div style="background:#fff8e1;border:2px dashed #ff8f00;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <div style="font-size:12px;color:#e65100;font-weight:bold;letter-spacing:1px">VERIFICATION CODE</div>
            <div style="font-size:36px;font-weight:800;color:#e65100;letter-spacing:6px;margin:8px 0">${code}</div>
            <div style="font-size:12px;color:#777">This code expires in 10 minutes</div>
          </div>
          <p style="color:#777;font-size:12px">If you did not create an account, you can ignore this email.</p>
        </div>
      </div>`,
  });
}
