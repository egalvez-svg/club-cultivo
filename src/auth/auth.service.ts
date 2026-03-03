import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { User, Role, Organization, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export type UserWithRelations = User & {
    userRoles: (UserRole & { role: Role })[];
    organization: Organization;
};

export type SafeUser = Omit<UserWithRelations, 'passwordHash' | 'hashedRefreshToken'>;

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async validateUser(email: string, pass: string): Promise<SafeUser | null> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { organization: true, userRoles: { include: { role: true } } },
        });

        if (user && user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, hashedRefreshToken, ...result } = user;
            return result as SafeUser;
        }
        return null;
    }

    async login(user: SafeUser) {
        if (!user.email) {
            throw new UnauthorizedException('El usuario no tiene un correo electrónico asociado');
        }

        const defaultUserRole = user.userRoles.find(ur => ur.isDefault) || user.userRoles[0];
        const defaultRoleName = defaultUserRole?.role.name || 'UNKNOWN';

        const tokens = await this.getTokens(user.id, user.email, defaultRoleName, user.organizationId);
        await this.updateRefreshToken(user.id, tokens.refresh_token);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                roles: user.userRoles.map(ur => ({
                    id: ur.role.id,
                    name: ur.role.name,
                    isDefault: ur.isDefault,
                })),
                activeRole: defaultRoleName,
                organization: user.organization,
            }
        };
    }

    async refreshTokens(id: string, refreshToken: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { userRoles: { include: { role: true } }, organization: true }
        });

        if (!user || !user.hashedRefreshToken) {
            throw new UnauthorizedException('Acceso denegado');
        }

        const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
        if (!refreshTokenMatches) {
            throw new UnauthorizedException('Acceso denegado');
        }

        if (!user.email) {
            throw new UnauthorizedException('El usuario no tiene un correo electrónico asociado');
        }

        const defaultUserRole = user.userRoles.find(ur => ur.isDefault) || user.userRoles[0];
        const defaultRoleName = defaultUserRole?.role.name || 'UNKNOWN';

        const tokens = await this.getTokens(user.id, user.email, defaultRoleName, user.organizationId);
        await this.updateRefreshToken(user.id, tokens.refresh_token);
        return tokens;
    }

    async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken },
        });
    }

    async getTokens(userId: string, email: string, role: string, organizationId: string) {
        const payload = {
            sub: userId,
            email,
            role,
            organizationId,
        };

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET || 'at-secret',
                expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as any) || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'rt-secret',
                expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
            }),
        ]);

        return {
            access_token: at,
            refresh_token: rt,
        };
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'Si el correo existe, se ha enviado un enlace de recuperación' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });

        if (user.email) {
            await this.mailService.sendPasswordResetEmail(user.email, token);
        }

        return { message: 'Si el correo existe, se ha enviado un enlace de recuperación' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        return { message: 'Contraseña actualizada correctamente' };
    }
}
