import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records to prevent duplicates
  await prisma.token.deleteMany();
  await prisma.certificatePrintRecord.deleteMany();
  await prisma.counterCorrectionRecord.deleteMany();
  await prisma.pehchanCorrectionRecord.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.superAdmin.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Passwords (Plain Text)
  const superAdminPasswordHash = 'SuperAdmin@123';
  const adminPasswordHash = 'Admin@123';

  // 3. Create Super Admin
  const superAdmin = await prisma.superAdmin.create({
    data: {
      full_name: 'Nagar Nigam Super Admin',
      email: 'superadmin@nagarnigam.gov.in',
      password: superAdminPasswordHash,
    },
  });

  console.log(`👑 Super Admin created: ${superAdmin.email}`);

  // 4. Create Kiosk Admin
  const admin = await prisma.admin.create({
    data: {
      full_name: 'Nagar Nigam Kiosk Coordinator',
      email: 'admin@nagarnigam.gov.in',
      password: adminPasswordHash,
      role: 'ADMIN',
      super_admin_id: superAdmin.super_admin_id,
    },
  });

  console.log(`👨‍💼 Kiosk Admin created: ${admin.email}`);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
