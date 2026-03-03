import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'bialifornia@bialifornia.com';

    try {
        // 1. Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true }
        });

        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        console.log(`Found user: ${user.fullName} (${user.id}) in organization ${user.organization?.name}`);

        // 2. Find ADMIN role for that organization
        let adminRole = await prisma.role.findFirst({
            where: {
                name: 'ADMIN',
                OR: [
                    { organizationId: user.organizationId },
                    { organizationId: null }
                ]
            }
        });

        if (!adminRole) {
            console.log(`ADMIN role not found for organization. Creating it...`);
            adminRole = await prisma.role.create({
                data: {
                    name: 'ADMIN',
                    organizationId: user.organizationId
                }
            });
        }

        console.log(`Found/Created ADMIN role: ${adminRole.id}`);

        // 3. Assign role to user
        const userRole = await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId: adminRole.id,
                }
            },
            update: {
                isDefault: true // Set as default role
            },
            create: {
                userId: user.id,
                roleId: adminRole.id,
                isDefault: true
            }
        });

        // 4. Update the other role to not be default (optional, but good practice if ADMIN should be default)
        await prisma.userRole.updateMany({
            where: {
                userId: user.id,
                roleId: { not: adminRole.id }
            },
            data: { isDefault: false }
        })

        console.log(`Successfully assigned ADMIN role to user ${email}.`);

        // 5. Verify current roles
        const updatedUser = await prisma.user.findUnique({
            where: { email },
            include: { userRoles: { include: { role: true } } }
        });

        console.log('\nCurrent Roles for user:');
        updatedUser?.userRoles.forEach(ur => {
            console.log(`- ${ur.role.name} (Default: ${ur.isDefault})`);
        });

    } catch (error) {
        console.error('Error assigning role:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
