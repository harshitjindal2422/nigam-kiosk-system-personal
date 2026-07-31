// Get the backend base domain (removing /api/v1 suffix if present)
export const getBackendBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
};

// Resolves dynamic file URLs (Cloudinary URLs vs Local temporary paths)
export const getFileUrl = (docPath, subFolder = 'scans') => {
  if (!docPath) return '';
  
  // If it's already an absolute URL (like Cloudinary https://res.cloudinary.com/...)
  if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
    return docPath;
  }

  const baseUrl = getBackendBaseUrl();
  // If the path already has temp/ prefix
  if (docPath.startsWith('temp/')) {
    return `${baseUrl}/${docPath}`;
  }
  
  // Otherwise fallback to temp/downloads or temp/scans
  return `${baseUrl}/temp/${subFolder}/${docPath}`;
};
