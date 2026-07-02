import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/db.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // 1. Retrieve token from secure HTTP-only cookie, Auth Header, or query parameter
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token || req.query?.token;

    if (!token) {
      throw new ApiError(401, 'Unauthorized access: Token not found');
    }

    // 2. Verify token signature
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'nagar_nigam_secret_key_2026');

    // 3. Retrieve admin profile using correct schema mappings
    let user = null;
    
    if (decodedToken.role === 'SUPER_ADMIN') {
      user = await prisma.superAdmin.findUnique({
        where: { super_admin_id: decodedToken.id },
      });
      if (user) {
        user.role = 'SUPER_ADMIN';
        user.id = user.super_admin_id; // Normalize key
      }
    } else {
      user = await prisma.admin.findUnique({
        where: { admin_id: decodedToken.id },
      });
      if (user) {
        user.id = user.admin_id; // Normalize key
      }
    }

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token: Profile not found');
    }

    // 4. Attach session profile to request object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid Access Token');
  }
});

// Role-based authorization gate helper
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, `Access Forbidden: Role ${req.user?.role || 'ANONYMOUS'} is unauthorized`);
    }
    next();
  };
};
