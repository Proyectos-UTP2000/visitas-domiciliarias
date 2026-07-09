import nodemailer from "nodemailer";
import { env } from "./env.js";

export class MailerService {
  private readonly transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: env.MAIL_USERNAME,
        pass: env.MAIL_PASSWORD,
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    if (!env.MAIL_USERNAME || !env.MAIL_PASSWORD) {
      console.warn("SMTP credentials not configured. Skipping email dispatch.");
      return;
    }

    const resetLink = `${env.APP_WEB_URL}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Restablecimiento de contraseña</h2>
        <p>Hola, <strong>${username}</strong>.</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Para continuar con el proceso, haz clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Restablecer contraseña</a>
        </div>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #777;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Visitas Domiciliarias" <${env.MAIL_USERNAME}>`,
      to: email,
      subject: "Recuperación de contraseña",
      text: `Hola ${username}. Para restablecer tu contraseña, ingresa al siguiente enlace: ${resetLink}`,
      html,
    });
  }

  async sendActivationEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    if (!env.MAIL_USERNAME || !env.MAIL_PASSWORD) {
      console.warn("SMTP credentials not configured. Skipping email dispatch.");
      return;
    }

    const activationLink = `${env.FRONTEND_URL}/activar-cuenta?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #28a745; margin-bottom: 20px;">¡Cuenta Aprobada!</h2>
        <p>Hola, <strong>${username}</strong>.</p>
        <p>Tu registro como Actor Social en el sistema de <strong>Visitas Domiciliarias</strong> ha sido aprobado con éxito.</p>
        <p>Para poder ingresar, primero debes activar tu cuenta y establecer tu contraseña de acceso haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Activar cuenta</a>
        </div>
        <p>Este enlace de activación expirará en 24 horas.</p>
        <p>Si no te registraste en este sistema, puedes ignorar este correo de forma segura.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #777;">Este es un mensaje automático, por favor no respondas a este correo.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Visitas Domiciliarias" <${env.MAIL_USERNAME}>`,
      to: email,
      subject: "Activación de tu cuenta - Visitas Domiciliarias",
      text: `Hola ${username}. Tu cuenta ha sido aprobada. Para activarla, ingresa al siguiente enlace: ${activationLink}`,
      html,
    });
  }
}
