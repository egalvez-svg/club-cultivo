import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
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
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
        private prisma: PrismaService,
    ) { }

    async validateUser(email: string, pass: string): Promise<SafeUser | null> {
        const user = await this.usersService.findByEmailWithRelations(email);

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
                requiresPasswordChange: user.requiresPasswordChange,
            }
        };
    }

    async refreshTokens(id: string, refreshToken: string) {
        const user = await this.usersService.findByIdWithRelations(id);

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
        await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
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

        const decodedAt = this.jwtService.decode(at) as any;
        const decodedRt = this.jwtService.decode(rt) as any;

        return {
            access_token: at,
            refresh_token: rt,
            expires_in: decodedAt?.exp && decodedAt?.iat ? decodedAt.exp - decodedAt.iat : 900, // deafult 15m
            refresh_expires_in: decodedRt?.exp && decodedRt?.iat ? decodedRt.exp - decodedRt.iat : 604800, // default 7d
        };
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.usersService.findByEmailWithRelations(email);
        if (!user) {
            return { message: 'Si el correo existe, se ha enviado un enlace de recuperación' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await this.usersService.updatePasswordResetToken(user.id, token, expires);

        if (user.email) {
            await this.mailService.sendPasswordResetEmail(user.email, token);
        }

        return { message: 'Si el correo existe, se ha enviado un enlace de recuperación' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersService.findByResetToken(token);

        if (!user) {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.usersService.updatePassword(user.id, hashedPassword, true);

        return { message: 'Contraseña actualizada correctamente' };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersService.findByIdWithRelations(userId);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordMatches) {
            throw new UnauthorizedException('La contraseña actual es incorrecta');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(userId, hashedPassword, true);

        return { message: 'Contraseña actualizada correctamente' };
    }
}
