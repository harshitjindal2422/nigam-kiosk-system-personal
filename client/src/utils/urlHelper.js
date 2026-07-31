// Get the backend base domain (removing /api/v1 suffix if present)
export const getBackendBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
};

// Resolves dynamic file URLs (Cloudinary URLs vs Local temporary paths)
export const getFileUrl = (docPath, subFolder = 'scans') => {
  if (!docPath) return '';
  
  let filename = docPath;
  
  // If it's an absolute URL (like Cloudinary), extract only the clean filename at the end
  if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
    const parts = docPath.split('/');
    filename = parts[parts.length - 1];
  } else if (docPath.startsWith('temp/')) {
    // If the path has temp/ prefix, extract filename
    const parts = docPath.split('/');
    filename = parts[parts.length - 1];
  }

  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}/temp/${subFolder}/${filename}`;
};
