import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records to prevent duplicates
  await prisma.token.deleteMany();
  await prisma.certificatePrintRecord.deleteMany();
  await prisma.counterCorrectionRecord.deleteMany();
  await prisma.pehchanCorrectionRecord.deleteMany();
  await prisma.application.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.superAdmin.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Passwords (Plain Text)
  const superAdminPasswordHash = 'SuperAdmin@123';
  const adminPasswordHash = 'Admin@123';
  const operatorPasswordHash = 'Operator@123';
  const checkerPasswordHash = 'Checker@123';
  const approvalPasswordHash = 'Approval@123';

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

  // 5. Create Counter Operators (seeded matches useAuthStore defaults)
  const op1 = await prisma.admin.create({
    data: {
      full_name: 'Suresh Kumar',
      email: 'suresh@nagarnigam.gov.in',
      password: operatorPasswordHash,
      role: 'COUNTER_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  const op2 = await prisma.admin.create({
    data: {
      full_name: 'Anjali Sharma',
      email: 'anjali@nagarnigam.gov.in',
      password: operatorPasswordHash,
      role: 'COUNTER_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  const op3 = await prisma.admin.create({
    data: {
      full_name: 'Vikram Singh',
      email: 'vikram@nagarnigam.gov.in',
      password: operatorPasswordHash,
      role: 'COUNTER_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  console.log(`📡 Counter Operators created: suresh, anjali, vikram`);

  // 6. Create Checker Operator
  const checker = await prisma.admin.create({
    data: {
      full_name: 'Jaipur Nigam Checker',
      email: 'checker@nagarnigam.gov.in',
      password: checkerPasswordHash,
      role: 'CHECKER_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  console.log(`🔍 Checker Operator created: ${checker.email}`);

  // 7. Create Approval Operator
  const approval = await prisma.admin.create({
    data: {
      full_name: 'Jaipur Nigam Approver',
      email: 'approval@nagarnigam.gov.in',
      password: approvalPasswordHash,
      role: 'APPROVAL_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  console.log(`✍️ Approval Operator created: ${approval.email}`);

  // 8. Create Cashier Operator
  const cashier = await prisma.admin.create({
    data: {
      full_name: 'Jaipur Nigam Cashier',
      email: 'cashier@nagarnigam.gov.in',
      password: 'Cashier@123',
      role: 'CASHIER_OPERATOR',
      super_admin_id: superAdmin.super_admin_id,
    }
  });
  console.log(`💰 Cashier Operator created: ${cashier.email}`);

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
