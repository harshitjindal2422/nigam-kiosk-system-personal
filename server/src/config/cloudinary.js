import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('☁️  [CLOUDINARY CONFIG]: Cloudinary configured successfully.');
} else {
  logger.warn('⚠️  [CLOUDINARY CONFIG]: Cloudinary environment variables are missing. Falling back to local storage.');
}

export { cloudinary, isCloudinaryConfigured };
