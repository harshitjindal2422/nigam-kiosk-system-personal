// Get the backend base domain (removing /api/v1 suffix if present)
export const getBackendBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
};

// Resolves dynamic file URLs (Cloudinary URLs vs Local temporary paths)
export const getFileUrl = (docPath, subFolder = 'scans') => {
  if (!docPath) return '';
  
  // If it's a full Cloudinary URL, extract everything after "image/upload/" to preserve versioning/folders
  if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
    const key = 'image/upload/';
    const index = docPath.indexOf(key);
    if (index !== -1) {
      const relativePath = docPath.substring(index + key.length); // e.g. v123/folder/file.pdf
      const baseUrl = getBackendBaseUrl();
      return `${baseUrl}/temp/${subFolder}/${relativePath}`;
    }
  }

  let filename = docPath;
  if (docPath.startsWith('temp/')) {
    // If the path has temp/ prefix, extract filename
    const parts = docPath.split('/');
    filename = parts[parts.length - 1];
  }

  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}/temp/${subFolder}/${filename}`;
};
