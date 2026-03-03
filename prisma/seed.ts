
import { PrismaClient, PatientStatus, LotType, LotStatus, StrainType, ProductPresentationType, PhysicalUnitType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Get or Create Organization
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Club Cultivo Demo',
            },
        });
    }
    const orgId = org.id;
    console.log(`Using Organization: ${org.name} (${orgId})`);

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
        const created = await prisma.strain.create({
            data: {
                organizationId: orgId,
                name: s.name,
                type: s.type,
                thcPercentage: s.thc,
                cbdPercentage: s.cbd,
            },
        });
        createdStrains.push(created);
    }
    console.log(`Created ${createdStrains.length} strains.`);

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
        const lot = await prisma.productionLot.create({
            data: {
                organizationId: orgId,
                strainId: strain.id,
                lotCode: `LOT-${strain.name.substring(0, 3).toUpperCase()}-2024`,
                lotType: LotType.CULTIVATION,
                status: LotStatus.RELEASED,
                totalOutputEquivalentGrams: 1000,
            },
        });

        // Flower
        await prisma.product.create({
            data: {
                organizationId: orgId,
                strainId: strain.id,
                name: `${strain.name} - Flores`,
                presentationType: ProductPresentationType.FLOWER,
                physicalUnitType: PhysicalUnitType.GRAMS,
                netPhysicalQuantity: 1,
                equivalentDryGrams: 1,
                price: 7500,
                currentStock: 250,
                lots: { connect: { id: lot.id } }
            }
        });

        // Optional types
        if (strain.cbdPercentage > 10 || strain.type === StrainType.SATIVA) {
            await prisma.product.create({
                data: {
                    organizationId: orgId,
                    strainId: strain.id,
                    name: `Aceite de ${strain.name} 30ml`,
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

        if (strain.type === StrainType.INDICA || strain.type === StrainType.HYBRID) {
            await prisma.product.create({
                data: {
                    organizationId: orgId,
                    strainId: strain.id,
                    name: `Rosin ${strain.name}`,
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
    console.log(`Created ${patients.length} appointments for today.`);

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
