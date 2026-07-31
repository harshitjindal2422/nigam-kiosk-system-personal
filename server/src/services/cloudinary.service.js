import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { logger } from '../config/logger.js';
import path from 'path';

/**
 * Uploads a base64 string directly to Cloudinary
 * @param {string} base64Data - Raw base64 data (without mime type prefix)
 * @param {string} fileName - File name with extension
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string|null>} - Secure URL of the uploaded resource
 */
export const uploadBase64ToCloudinary = async (base64Data, fileName, folder = 'kiosk_scans') => {
  if (!isCloudinaryConfigured) {
    logger.warn('☁️ [CLOUDINARY SERVICE]: Cloudinary is not configured. Skipping upload.');
    return null;
  }

  try {
    const ext = path.extname(fileName).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    }

    const dataURI = `data:${mimeType};base64,${base64Data}`;

    const response = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      public_id: path.basename(fileName, ext),
      resource_type: 'auto',
    });

    logger.info(`☁️ [CLOUDINARY SERVICE]: Successfully uploaded base64 file to Cloudinary: ${response.secure_url}`);
    return response.secure_url;
  } catch (error) {
    logger.error(`❌ [CLOUDINARY SERVICE ERROR]: Failed to upload base64 file:`, error);
    throw error;
  }
};

/**
 * Uploads a local file path to Cloudinary
 * @param {string} localFilePath - Absolute path of the local file
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string|null>} - Secure URL of the uploaded resource
 */
export const uploadLocalFileToCloudinary = async (localFilePath, folder = 'kiosk_scans') => {
  if (!isCloudinaryConfigured) {
    logger.warn('☁️ [CLOUDINARY SERVICE]: Cloudinary is not configured. Skipping upload.');
    return null;
  }

  try {
    const ext = path.extname(localFilePath).toLowerCase();
    const fileName = path.basename(localFilePath);

    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      public_id: path.basename(fileName, ext),
      resource_type: 'auto',
    });

    logger.info(`☁️ [CLOUDINARY SERVICE]: Successfully uploaded local file ${fileName} to Cloudinary: ${response.secure_url}`);
    return response.secure_url;
  } catch (error) {
    logger.error(`❌ [CLOUDINARY SERVICE ERROR]: Failed to upload local file:`, error);
    throw error;
  }
};
