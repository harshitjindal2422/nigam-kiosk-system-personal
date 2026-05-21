import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AuthRepository from '../repositories/auth.repository.js';
import { ApiError } from '../utils/ApiError.js';

export default class AuthService {
  static async login(email, password) {
    // 1. Try finding SuperAdmin
    let user = await AuthRepository.findSuperAdminByEmail(email);
    let role = 'SUPER_ADMIN';

    // 2. If not found, try finding Kiosk Admin
    if (!user) {
      user = await AuthRepository.findAdminByEmail(email);
      role = 'ADMIN';
    }

    // 3. Reject if neither exist
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // 4. Verify password match
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // 5. Extract correct database ID dynamically
    const userId = role === 'SUPER_ADMIN' ? user.super_admin_id : user.admin_id;

    // 6. Generate signed JWT token
    const token = jwt.sign(
      { id: userId, email: user.email, role },
      process.env.JWT_SECRET || 'nagar_nigam_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRY || '12h' }
    );

    // 7. Return logged-in user profile without password and token
    const { password: _, ...profile } = user;
    return {
      user: { ...profile, role, id: userId },
      token,
    };
  }

  static async getMe(id, role) {
    let user;
    if (role === 'SUPER_ADMIN') {
      user = await AuthRepository.findSuperAdminById(id);
    } else {
      user = await AuthRepository.findAdminById(id);
    }

    if (!user) {
      throw new ApiError(404, 'User session not found');
    }

    const { password: _, ...profile } = user;
    const userId = role === 'SUPER_ADMIN' ? user.super_admin_id : user.admin_id;
    return { ...profile, role, id: userId };
  }
}
