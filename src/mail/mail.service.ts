import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    async sendPasswordResetEmail(email: string, token: string) {
        const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;

        this.logger.log(`
      ---------------------------------------------------------
      SIMULACIÓN DE ENVÍO DE CORREO
      Para: ${email}
      Asunto: Recuperación de Contraseña - Club Cultivo
      Mensaje: Hola. Para restablecer tu contraseña, haz clic en el siguiente enlace:
      ${resetUrl}
      Token: ${token}
      ---------------------------------------------------------
    `);
    }
}
