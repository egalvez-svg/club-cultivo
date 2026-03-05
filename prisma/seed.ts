import { PrismaClient, AppointmentReason } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Get or Create System Organization
    let sysOrg = await prisma.organization.findFirst({ where: { name: 'SYSTEM' } });
    if (!sysOrg) {
        sysOrg = await prisma.organization.create({
            data: { name: 'SYSTEM', active: true },
        });
    }
    console.log(`System Organization: ${sysOrg.id}`);

    // 2. Global Roles
    let superAdminRole = await prisma.role.findFirst({
        where: { organizationId: null, name: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
            data: { name: 'SUPER_ADMIN', organizationId: null },
        });
    }

    // 3. Create SuperAdmin User
    const superAdminEmail = 'superadmin@clubcultivo.com';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('superadmin123', 10);

    await prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {
            passwordHash: hashedPassword,
        },
        create: {
            email: superAdminEmail,
            passwordHash: hashedPassword,
            fullName: 'Super Admin',
            documentNumber: '00000000',
            organizationId: sysOrg.id,
            userRoles: {
                create: {
                    roleId: superAdminRole.id,
                    isDefault: true,
                },
            },
        },
    });
    console.log('SuperAdmin user: superadmin@clubcultivo.com / superadmin123');

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('SEED ERROR:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
