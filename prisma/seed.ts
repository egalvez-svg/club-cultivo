
import { PrismaClient, PatientStatus, LotType, LotStatus, StrainType, ProductPresentationType, PhysicalUnitType } from '@prisma/client';

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
    const hashedPassword = await require('bcryptjs').hash('superadmin123', 10);

    await prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {},
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
    console.log('SuperAdmin user created: superadmin@clubcultivo.com / superadmin123');

    // 4. Demo Organization
    let org = await prisma.organization.findFirst({ where: { NOT: { name: 'SYSTEM' } } });
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Club Cultivo Demo',
            },
        });
    }
    const orgId = org.id;
    console.log(`Using Demo Organization: ${org.name} (${orgId})`);

    // 2. Roles
    const roles = ['ADMIN', 'PATIENT', 'PRODUCTION_MANAGER', 'DISPENSARY_OPERATOR'];
    for (const name of roles) {
        await prisma.role.upsert({
            where: { organizationId_name: { organizationId: orgId, name } },
            update: {},
            create: { organizationId: orgId, name },
        });
    }

    const patientRole = await prisma.role.findFirst({ where: { name: 'PATIENT', organizationId: orgId } });
    if (!patientRole) throw new Error('Patient role not found');

    // 3. Strains
    const strainsData = [
        { name: 'Amnesia Haze', type: StrainType.SATIVA, thc: 22.0, cbd: 0.1 },
        { name: 'Critical Mass', type: StrainType.INDICA, thc: 15.0, cbd: 1.5 },
        { name: 'Gelato #33', type: StrainType.HYBRID, thc: 20.0, cbd: 0.5 },
        { name: 'Charlotte\'s Web', type: StrainType.SATIVA, thc: 0.3, cbd: 15.0 },
    ];

    const createdStrains: any[] = [];
    for (const s of strainsData) {
        let created = await prisma.strain.findFirst({
            where: { organizationId: orgId, name: s.name }
        });

        if (!created) {
            created = await prisma.strain.create({
                data: {
                    organizationId: orgId,
                    name: s.name,
                    type: s.type,
                    thcPercentage: s.thc,
                    cbdPercentage: s.cbd,
                },
            });
        }
        createdStrains.push(created);
    }
    console.log(`Processed ${createdStrains.length} strains.`);

    // 4. Patients
    const patientsData = [
        { name: 'Lucas Thompson', doc: '35123456', dose: 1.0 },
        { name: 'Elena Rodriguez', doc: '40987654', dose: 2.5 },
        { name: 'Marcos Benitez', doc: '38222333', dose: 0.5 },
        { name: 'Sofía Martínez', doc: '42000111', dose: 3.0 },
    ];

    for (const p of patientsData) {
        await prisma.user.upsert({
            where: { organizationId_documentNumber: { organizationId: orgId, documentNumber: p.doc } },
            update: {},
            create: {
                organizationId: orgId,
                fullName: p.name,
                documentNumber: p.doc,
                email: `p_${p.doc}@example.com`,
                dailyDose: p.dose,
                status: PatientStatus.ACTIVE,
                userRoles: {
                    create: {
                        roleId: patientRole.id,
                        isDefault: true,
                    },
                },
            }
        });
    }
    console.log(`Upserted ${patientsData.length} patients.`);

    // 5. Lots and Products
    for (const strain of createdStrains) {
        let lot = await prisma.productionLot.findFirst({
            where: { organizationId: orgId, lotCode: `LOT-${strain.name.substring(0, 3).toUpperCase()}-2024` }
        });

        if (!lot) {
            lot = await prisma.productionLot.create({
                data: {
                    organizationId: orgId,
                    strainId: strain.id,
                    lotCode: `LOT-${strain.name.substring(0, 3).toUpperCase()}-2024`,
                    lotType: LotType.CULTIVATION,
                    status: LotStatus.RELEASED,
                    totalOutputEquivalentGrams: 1000,
                },
            });
        }

        // Flower
        const flowerName = `${strain.name} - Flores`;
        const existingFlower = await prisma.product.findFirst({
            where: { organizationId: orgId, name: flowerName }
        });

        if (!existingFlower) {
            await prisma.product.create({
                data: {
                    organizationId: orgId,
                    strainId: strain.id,
                    name: flowerName,
                    presentationType: ProductPresentationType.FLOWER,
                    physicalUnitType: PhysicalUnitType.GRAMS,
                    netPhysicalQuantity: 1,
                    equivalentDryGrams: 1,
                    price: 7500,
                    currentStock: 250,
                    lots: { connect: { id: lot.id } }
                }
            });
        }

        // Optional types
        if (strain.cbdPercentage > 10 || strain.type === StrainType.SATIVA) {
            const oilName = `Aceite de ${strain.name} 30ml`;
            const existingOil = await prisma.product.findFirst({
                where: { organizationId: orgId, name: oilName }
            });

            if (!existingOil) {
                await prisma.product.create({
                    data: {
                        organizationId: orgId,
                        strainId: strain.id,
                        name: oilName,
                        presentationType: ProductPresentationType.OIL,
                        physicalUnitType: PhysicalUnitType.ML,
                        netPhysicalQuantity: 30,
                        equivalentDryGrams: 3,
                        price: 18000,
                        currentStock: 15,
                        lots: { connect: { id: lot.id } }
                    }
                });
            }
        }

        if (strain.type === StrainType.INDICA || strain.type === StrainType.HYBRID) {
            const extractName = `Rosin ${strain.name}`;
            const existingExtract = await prisma.product.findFirst({
                where: { organizationId: orgId, name: extractName }
            });

            if (!existingExtract) {
                await prisma.product.create({
                    data: {
                        organizationId: orgId,
                        strainId: strain.id,
                        name: extractName,
                        presentationType: ProductPresentationType.EXTRACT,
                        physicalUnitType: PhysicalUnitType.GRAMS,
                        netPhysicalQuantity: 1,
                        equivalentDryGrams: 4,
                        price: 12000,
                        currentStock: 10,
                        lots: { connect: { id: lot.id } }
                    }
                });
            }
        }
    }

    // 6. Appointments
    const patients = await prisma.user.findMany({
        where: { organizationId: orgId, userRoles: { some: { role: { name: 'PATIENT' } } } },
        take: 3
    });

    const reasons = ['Renovación Reprocan', 'Consulta Médica', 'Retiro de flores'];
    const times = [15, 16, 17]; // Hours

    for (let i = 0; i < patients.length; i++) {
        const appointmentDate = new Date();
        appointmentDate.setHours(times[i], i * 15, 0, 0);

        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                organizationId: orgId,
                patientId: patients[i].id,
                date: {
                    gte: new Date(appointmentDate.setMinutes(0, 0, 0)),
                    lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
                }
            }
        });

        if (!existingAppointment) {
            await prisma.appointment.create({
                data: {
                    organizationId: orgId,
                    patientId: patients[i].id,
                    date: appointmentDate,
                    reason: reasons[i] || 'Consulta general',
                    status: 'PENDING'
                }
            });
        }
    }
    console.log(`Processed appointments for today.`);

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
