import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching products...');
    const products = await prisma.product.findMany({
        include: { lots: true },
    });

    console.log(`Found ${products.length} products total.`);

    let createdCount = 0;

    for (const product of products) {
        if (product.lots.length === 0) {
            console.log(`Product ${product.name} has no lots. Creating default lot...`);
            
            const totalGrams = product.currentStock * product.equivalentDryGrams;
            
            await prisma.productionLot.create({
                data: {
                    organizationId: product.organizationId,
                    strainId: product.strainId,
                    lotType: 'PACKAGING', // Valid enums: CULTIVATION, PACKAGING
                    lotCode: `DEFAULT-${product.name.replace(/\s+/g, '-').substring(0, 5).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
                    status: 'RELEASED',
                    totalOutputEquivalentGrams: totalGrams,
                    productId: product.id,
                }
            });
            createdCount++;
        }
    }

    console.log(`Done! Created ${createdCount} default lots.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
