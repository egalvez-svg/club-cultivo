import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'bialifornia@bialifornia.com';
    const name = 'bialifornia';
    const orgName = 'bialifornia ong';
    const roleName = 'ADMINISTRADOR';

    console.log(`Iniciando inserción para ${email}...`);

    // 1. Encontrar o crear la organización
    let organization = await prisma.organization.findFirst({
        where: { name: orgName }
    });

    if (!organization) {
        console.log(`Creando organización: ${orgName}`);
        organization = await prisma.organization.create({
            data: { name: orgName }
        });
    }

    // 2. Encontrar o crear el rol
    let role = await prisma.role.findFirst({
        where: {
            name: roleName,
            organizationId: organization.id
        }
    });

    if (!role) {
        console.log(`Creando rol: ${roleName}`);
        role = await prisma.role.create({
            data: {
                name: roleName,
                organizationId: organization.id
            }
        });
    }

    // 3. Crear el usuario
    // Nota: Usaremos un documentNumber ficticio ya que es requerido por el esquema y único por org.
    const documentNumber = 'ADMIN-001';
    const passwordHash = await bcrypt.hash('Bialifornia2024!', 10);

    console.log(`Creando usuario: ${name} con email: ${email}`);
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            fullName: name,
            organizationId: organization.id,
            documentNumber,
            passwordHash,
        },
        create: {
            email,
            fullName: name,
            organizationId: organization.id,
            documentNumber,
            passwordHash,
        }
    });

    // 4. Asignar rol
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: user.id,
                roleId: role.id
            }
        },
        update: { isDefault: true },
        create: {
            userId: user.id,
            roleId: role.id,
            isDefault: true
        }
    });

    console.log('¡Usuario e inserciones completadas con éxito!');
    console.log('Credenciales temporales:');
    console.log(`Email: ${email}`);
    console.log(`Password: Bialifornia2024!`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
