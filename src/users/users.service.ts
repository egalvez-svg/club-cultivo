import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        const users = await this.prisma.user.findMany({
            where: {
                organizationId,
                active: true,
                userRoles: {
                    some: { role: { NOT: { name: 'PATIENT' } } }
                }
            },
            include: { userRoles: { include: { role: true } } },
        });

        return users.map(user => {
            const { passwordHash, hashedRefreshToken, ...rest } = user;
            return {
                ...rest,
                roles: user.userRoles.map(ur => ({
                    id: ur.role.id,
                    name: ur.role.name,
                    isDefault: ur.isDefault,
                })),
            };
        });
    }

    async create(organizationId: string, createUserDto: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('El correo electrónico ya existe');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const finalOrgId = createUserDto.organizationId || organizationId;

        const user = await this.prisma.user.create({
            data: {
                fullName: createUserDto.fullName,
                documentNumber: createUserDto.documentNumber,
                email: createUserDto.email,
                passwordHash: hashedPassword,
                organizationId: finalOrgId,
                userRoles: {
                    create: {
                        roleId: createUserDto.roleId,
                        isDefault: true,
                    }
                }
            },
            include: { userRoles: { include: { role: true } } }
        });

        const { passwordHash, hashedRefreshToken, ...result } = user;
        return {
            ...result,
            roles: user.userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
                isDefault: ur.isDefault,
            })),
        };
    }

    async update(id: string, organizationId: string, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.user.findFirst({
            where: { id, organizationId }
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado en esta organización');
        }

        const data: any = { ...updateUserDto };
        delete data.roleId;
        delete data.organizationId;

        if (updateUserDto.password) {
            data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
            delete data.password;
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data,
            include: { userRoles: { include: { role: true } } }
        });

        const { passwordHash, hashedRefreshToken, ...result } = updatedUser;
        return {
            ...result,
            roles: updatedUser.userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
                isDefault: ur.isDefault,
            })),
        };
    }

    async delete(id: string, organizationId: string): Promise<void> {
        const user = await this.prisma.user.findFirst({
            where: { id, organizationId }
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado en esta organización');
        }

        await this.prisma.user.update({
            where: { id },
            data: { active: false }
        });
    }

    async findOne(organizationId: string, id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, organizationId, active: true },
            include: { userRoles: { include: { role: true } } }
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const { passwordHash, hashedRefreshToken, ...result } = user;
        return {
            ...result,
            roles: user.userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
                isDefault: ur.isDefault,
            })),
        };
    }

    async countActivePatients(organizationId: string, dateLimit?: Date) {
        return this.prisma.user.count({
            where: {
                organizationId,
                status: 'ACTIVE',
                userRoles: { some: { role: { name: 'PATIENT' } } },
                ...(dateLimit && { createdAt: { lt: dateLimit } })
            }
        });
    }

    async findByEmailWithRelations(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { organization: true, userRoles: { include: { role: true } } },
        });
    }

    async findByIdWithRelations(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: { organization: true, userRoles: { include: { role: true } } },
        });
    }

    async findByResetToken(token: string) {
        return this.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });
    }

    async updateRefreshToken(id: string, hashedRefreshToken: string | null) {
        return this.prisma.user.update({
            where: { id },
            data: { hashedRefreshToken },
        });
    }

    async updatePasswordResetToken(id: string, token: string | null, expires: Date | null) {
        return this.prisma.user.update({
            where: { id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });
    }

    async updatePassword(id: string, hashedPassword: string) {
        return this.prisma.user.update({
            where: { id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
    }
}
