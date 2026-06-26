'use strict';

const path = require('path');
const fs   = require('fs');
const { body } = require('express-validator');
const multer = require('multer');
const sharp = require('sharp');
const UserModel = require('../models/user.model');
const { securityLog } = require('../utils/security-log.util');

// ─── Multer: almacenamiento de avatares ───────────────────────────────────────
const AVATARS_DIR = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const updateValidators = [
  body('avatar_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('avatar_url debe ser una URL válida'),
  body('bio').optional({ nullable: true, checkFalsy: false }).isLength({ max: 500 }).withMessage('La bio no puede superar 500 caracteres'),
];

function getProfile(req, res, next) {
  try {
    const user = UserModel.findById(req.params.id ? parseInt(req.params.id, 10) : req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

function updateProfile(req, res, next) {
  try {
    const { avatar_url, bio } = req.body;
    const updated = UserModel.update(req.user.id, { avatar_url: avatar_url || null, bio: bio || null });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    let outputBuffer;
    try {
      outputBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (_err) {
      securityLog('avatar_invalid_image_payload', { userId: req.user.id, mime: req.file.mimetype });
      return res.status(422).json({ error: 'Archivo de imagen inválido' });
    }

    // Borrar avatar anterior si era un archivo local
    const currentUser = UserModel.findById(req.user.id);
    if (currentUser?.avatar_url) {
      const prev = currentUser.avatar_url;
      // Solo borrar si es un path local (no una URL externa)
      if (prev.startsWith('/avatars/')) {
        const prevPath = path.join(__dirname, '../../public', prev);
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      }
    }

    const filename = `avatar-${req.user.id}-${Date.now()}.webp`;
    fs.writeFileSync(path.join(AVATARS_DIR, filename), outputBuffer);

    const avatarUrl = `/avatars/${filename}`;
    const updated = UserModel.update(req.user.id, { avatar_url: avatarUrl });
    securityLog('avatar_upload_success', { userId: req.user.id, size: outputBuffer.length });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, updateValidators, upload, uploadAvatar };
