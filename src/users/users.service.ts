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
            include: { userRoles: { include: { role: true } }, organization: true },
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

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const finalOrgId = createUserDto.organizationId || organizationId;

        let user;

        if (existingUser) {
            if (existingUser.active) {
                throw new ConflictException('El correo electrónico ya existe');
            }

            // El usuario existe pero está inactivo (eliminación lógica).
            // Procedemos a "reactivarlo" y sobreescribir sus datos y roles.
            user = await this.prisma.$transaction(async (tx) => {
                // Borramos los roles viejos de este usuario inactivo
                await tx.userRole.deleteMany({
                    where: { userId: existingUser.id },
                });

                // Actualizamos los datos principales y limpiamos los tokens de sesión si hubieran
                return tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        fullName: createUserDto.fullName,
                        documentNumber: createUserDto.documentNumber,
                        passwordHash: hashedPassword,
                        organizationId: finalOrgId,
                        active: true,
                        resetPasswordToken: null,
                        resetPasswordExpires: null,
                        hashedRefreshToken: null,
                        userRoles: {
                            create: createUserDto.roleIds.map((id, index) => ({
                                roleId: id,
                                isDefault: index === 0,
                            })),
                        },
                    },
                    include: { userRoles: { include: { role: true } } },
                });
            });
        } else {
            user = await this.prisma.user.create({
                data: {
                    fullName: createUserDto.fullName,
                    documentNumber: createUserDto.documentNumber,
                    email: createUserDto.email,
                    passwordHash: hashedPassword,
                    organizationId: finalOrgId,
                    userRoles: {
                        create: createUserDto.roleIds.map((id, index) => ({
                            roleId: id,
                            isDefault: index === 0, // El primero será el default
                        })),
                    },
                },
                include: { userRoles: { include: { role: true } } },
            });
        }

        const { passwordHash, hashedRefreshToken, ...result } = user;
        return {
            ...result,
            roles: user.userRoles.map((ur) => ({
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
        delete data.roleIds;
        delete data.organizationId;

        if (updateUserDto.password) {
            data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
            delete data.password;
        }

        const updatedUser = await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data,
            });

            if (updateUserDto.roleIds !== undefined) {
                // Delete old roles (this happens even if they pass an empty array to remove all roles)
                await tx.userRole.deleteMany({
                    where: { userId: id }
                });

                // Insert new roles only if the array is not empty
                if (updateUserDto.roleIds.length > 0) {
                    await tx.userRole.createMany({
                        data: updateUserDto.roleIds.map((roleId, index) => ({
                            userId: id,
                            roleId: roleId,
                            isDefault: index === 0 // El primero será el default
                        }))
                    });
                }
            }

            return tx.user.findUniqueOrThrow({
                where: { id },
                include: { userRoles: { include: { role: true } } }
            });
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
