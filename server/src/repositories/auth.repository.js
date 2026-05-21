import { prisma } from '../config/db.js';

export default class AuthRepository {
  static async findSuperAdminByEmail(email) {
    return prisma.superAdmin.findUnique({
      where: { email },
    });
  }

  static async findAdminByEmail(email) {
    return prisma.admin.findUnique({
      where: { email },
    });
  }

  static async findSuperAdminById(id) {
    return prisma.superAdmin.findUnique({
      where: { super_admin_id: id },
    });
  }

  static async findAdminById(id) {
    return prisma.admin.findUnique({
      where: { admin_id: id },
    });
  }
}
