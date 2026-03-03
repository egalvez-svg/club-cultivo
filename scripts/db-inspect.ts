
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('ORGANIZATIONS:', JSON.stringify(orgs, null, 2));

    const roles = await prisma.role.findMany();
    console.log('ROLES:', JSON.stringify(roles, null, 2));

    const users = await prisma.user.findMany({
        include: {
            userRoles: {
                include: {
                    role: true
                }
            }
        }
    });
    console.log('USERS:', JSON.stringify(users, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
