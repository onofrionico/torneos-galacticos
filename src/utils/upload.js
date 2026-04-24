const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = process.env.UPLOADS_DIR || './public/uploads';

// Asegurarse de que existan los subdirectorios
['highlights', 'torneos', 'avatars'].forEach(dir => {
  const full = path.join(uploadsDir, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = req.uploadSubdir || 'highlights';
    cb(null, path.join(uploadsDir, subdir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const videoFilter = (req, file, cb) => {
  const allowed = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido. Usá: ${allowed.join(', ')}`), false);
  }
};

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido. Usá: ${allowed.join(', ')}`), false);
  }
};

const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '100');

const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: maxMB * 1024 * 1024 },
});

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB para imágenes
});

module.exports = { uploadVideo, uploadImage };
