const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuración de Cloudinary usando variables de entorno
cloudinary.config({
  cloud_name: 'dxj7tu0o5',
  api_key: '531914918791848',
  api_secret: '6XfMQWNuAgjBa4hTjYklsUBhhok',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'alumco_materials',
    resource_type: 'auto', // Permite subir imágenes, videos, pdfs, etc.
    allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'txt', 'zip'],
  },
});

const uploadCloudinary = multer({ storage: storage });

module.exports = {
  cloudinary,
  uploadCloudinary,
};
