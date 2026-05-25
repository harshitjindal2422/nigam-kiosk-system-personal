import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.superAdmin.updateMany({ data: { password: 'SuperAdmin@123' } });
  await prisma.admin.updateMany({ data: { password: 'Admin@123' } });
  console.log('Passwords updated to plain text!');
  await prisma.$disconnect();
}
run();
