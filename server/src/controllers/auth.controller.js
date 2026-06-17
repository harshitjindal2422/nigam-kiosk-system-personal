import AuthService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/db.js';
import { getISTDate } from '../utils/dateHelper.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await AuthService.login(email, password);

  // Set secure HTTP-only cookie matching proposed 12h policy
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  });

  // Log login action for printer operator
  if (user.role === 'PRINTER_OPERATOR') {
    await prisma.printerAuditLog.create({
      data: {
        admin_id: user.id || user.admin_id,
        action: 'LOGIN',
        details: `Printer operator logged in: ${user.full_name} (${user.email})`,
        created_at: getISTDate()
      }
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user, token }, 'Logged in successfully'));
});

export const logout = asyncHandler(async (req, res) => {
  // Log logout action for printer operator
  if (req.user && req.user.role === 'PRINTER_OPERATOR') {
    await prisma.printerAuditLog.create({
      data: {
        admin_id: req.user.id || req.user.admin_id,
        action: 'LOGOUT',
        details: `Printer operator signed out: ${req.user.full_name} (${req.user.email})`,
        created_at: getISTDate()
      }
    });
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
  const profile = await AuthService.getMe(req.user.id, req.user.role);
  return res
    .status(200)
    .json(new ApiResponse(200, { user: profile }, 'Session retrieved successfully'));
});
