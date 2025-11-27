// backend/routes/upload.js - VERSIÓN CLOUDINARY
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');

const router = express.Router();

// ========== CONFIGURACIÓN CLOUDINARY ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// CONFIGURACIÓN MULTER (almacenamiento en memoria para Cloudinary)
const storage = multer.memoryStorage();

// FILTRO DE ARCHIVOS
const fileFilter = (req, file, cb) => {
  console.log(`🔍 Validando archivo: ${file.originalname} (${file.mimetype})`);
  
  if (file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('audio/') || 
      file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    console.log('❌ Tipo de archivo rechazado:', file.mimetype);
    cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes, audio y video.'), false);
  }
};

// CONFIGURACIÓN MULTER
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 1
  },
  fileFilter: fileFilter
});

// Middleware de errores
const handleUploadErrors = (err, req, res, next) => {
  console.log('🚨 Error en upload:', err.message);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo es demasiado grande. Máximo 50MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Demasiados archivos. Solo se permite uno por vez.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Campo de archivo no esperado.'
      });
    }
  }
  
  if (err.message) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  console.error('❌ Error interno en upload:', err);
  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor al subir el archivo'
  });
};

// Función para subir a Cloudinary
const uploadToCloudinary = async (file, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        quality: 'auto:good',
        format: file.mimetype.startsWith('image/') ? 'webp' : undefined
      },
      (error, result) => {
        if (error) {
          console.error('❌ Error Cloudinary:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    uploadStream.end(file.buffer);
  });
};

// ========== RUTAS DE UPLOAD ==========

// backend/routes/upload.js

// ========== RUTAS DE UPLOAD ==========

// SUBIR IMAGEN - RUTA EN INGLÉS (original)
router.post('/image', upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  await handleImageUpload(req, res);
});

// SUBIR IMAGEN - RUTA EN ESPAÑOL (nueva)
router.post('/imagen', upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  await handleImageUpload(req, res);
});

// Función común para manejar upload de imágenes
async function handleImageUpload(req, res) {
  try {
    console.log('📝 Subiendo imagen...');
    
    // Verificar qué campo se usó
    let file = null;
    let fieldUsed = '';
    
    if (req.files['imagen'] && req.files['imagen'][0]) {
      file = req.files['imagen'][0];
      fieldUsed = 'imagen';
    } else if (req.files['image'] && req.files['image'][0]) {
      file = req.files['image'][0];
      fieldUsed = 'image';
    }
    
    if (!file) {
      console.log('❌ No se recibió archivo');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen. Use el campo "imagen" o "image".'
      });
    }

    console.log('✅ Archivo recibido en campo:', fieldUsed, {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });

    // Subir a Cloudinary
    const result = await uploadToCloudinary(file, 'red-social/posts', 'image');

    console.log('✅ Imagen subida a Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        filename: result.public_id,
        tipo: 'imagen',
        size: result.bytes,
        fieldUsed: fieldUsed
      }
    });

  } catch (error) {
    console.error('❌ Error en upload de imagen:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al subir la imagen'
    });
  }
}

// Las rutas para audio y video se mantienen igual...
router.post('/audio', upload.single('audio'), async (req, res) => {
  // código existente...
});

router.post('/video', upload.single('video'), async (req, res) => {
  // código existente...
});

// SUBIR AUDIO
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎵 Subiendo audio...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de audio'
      });
    }

    console.log('✅ Archivo de audio recibido:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir a Cloudinary
    const result = await uploadToCloudinary(req.file, 'red-social/audio', 'video');

    console.log('✅ Audio subido a Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        filename: result.public_id,
        tipo: 'audio',
        size: result.bytes
      }
    });

  } catch (error) {
    console.error('❌ Error en upload de audio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al subir el audio'
    });
  }
});

// SUBIR VIDEO
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    console.log('🎬 Subiendo video...');
    
    if (!req.file) {
      console.log('❌ No se recibió archivo de video');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de video'
      });
    }

    console.log('✅ Archivo de video recibido:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir a Cloudinary
    const result = await uploadToCloudinary(req.file, 'red-social/video', 'video');

    console.log('✅ Video subido a Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        filename: result.public_id,
        tipo: 'video',
        size: result.bytes
      }
    });

  } catch (error) {
    console.error('❌ Error en upload de video:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al subir el video'
    });
  }
});

// SUBIR FOTO DE PERFIL
router.post('/profile-picture/:userId', upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('📸 Subiendo foto de perfil...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    console.log('✅ Archivo de perfil recibido:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir a Cloudinary
    const result = await uploadToCloudinary(req.file, 'red-social/profiles', 'image');
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        foto_perfil: result.secure_url,
        $inc: { __v: 1 }
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log('✅ Foto de perfil actualizada en Cloudinary');

    res.json({
      success: true,
      message: 'Foto de perfil actualizada exitosamente',
      imageUrl: result.secure_url
    });

  } catch (error) {
    console.error('❌ Error subiendo foto de perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al subir la foto'
    });
  }
});

// SUBIR FOTO DE PORTADA
router.post('/cover-picture/:userId', upload.single('coverPicture'), async (req, res) => {
  try {
    console.log('🏞️ Subiendo foto de portada...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    console.log('✅ Archivo de portada recibido:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Subir a Cloudinary
    const result = await uploadToCloudinary(req.file, 'red-social/covers', 'image');
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!user.fotos_portada) {
      user.fotos_portada = [];
    }

    if (user.fotos_portada.length >= 4) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 4 fotos de portada permitidas'
      });
    }

    const newCoverPhoto = result.secure_url;
    user.fotos_portada.push(newCoverPhoto);
    
    if (user.fotos_portada.length === 1) {
      user.foto_portada = newCoverPhoto;
    }

    await user.save();

    console.log('✅ Foto de portada agregada a Cloudinary');

    res.json({
      success: true,
      message: 'Foto de portada agregada exitosamente',
      imageUrl: newCoverPhoto,
      coverPhotos: user.fotos_portada
    });

  } catch (error) {
    console.error('❌ Error subiendo foto de portada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ELIMINAR FOTO DE PORTADA
router.delete('/cover-picture/:userId/:photoIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const photoIndex = parseInt(req.params.photoIndex);
    if (photoIndex < 0 || photoIndex >= user.fotos_portada.length) {
      return res.status(400).json({
        success: false,
        error: 'Índice de foto inválido'
      });
    }

    const photoToDelete = user.fotos_portada[photoIndex];
    
    // Eliminar de Cloudinary
    try {
      const publicId = photoToDelete.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      console.log('✅ Foto eliminada de Cloudinary:', publicId);
    } catch (cloudinaryError) {
      console.log('⚠️ No se pudo eliminar de Cloudinary:', cloudinaryError.message);
    }

    // Eliminar de la lista
    user.fotos_portada.splice(photoIndex, 1);

    // Actualizar foto principal si era la que se eliminó
    if (user.foto_portada === photoToDelete) {
      user.foto_portada = user.fotos_portada.length > 0 ? user.fotos_portada[0] : '';
    }

    await user.save();

    res.json({
      success: true,
      message: 'Foto de portada eliminada exitosamente',
      coverPhotos: user.fotos_portada
    });

  } catch (error) {
    console.error('❌ Error eliminando foto de portada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ESTABLECER FOTO DE PORTADA PRINCIPAL
router.put('/cover-picture/main/:userId/:photoIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const photoIndex = parseInt(req.params.photoIndex);
    if (photoIndex < 0 || photoIndex >= user.fotos_portada.length) {
      return res.status(400).json({
        success: false,
        error: 'Índice de foto inválido'
      });
    }

    user.foto_portada = user.fotos_portada[photoIndex];
    await user.save();

    res.json({
      success: true,
      message: 'Foto de portada principal actualizada',
      mainCoverPhoto: user.foto_portada
    });

  } catch (error) {
    console.error('❌ Error actualizando foto de portada principal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// REORDENAR FOTOS DE PORTADA
router.put('/cover-picture/reorder/:userId', async (req, res) => {
  try {
    const { fromIndex, toIndex } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!user.fotos_portada || user.fotos_portada.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay fotos de portada para reordenar'
      });
    }

    // Validar índices
    if (fromIndex < 0 || fromIndex >= user.fotos_portada.length || 
        toIndex < 0 || toIndex >= user.fotos_portada.length) {
      return res.status(400).json({
        success: false,
        error: 'Índices inválidos'
      });
    }

    // Reordenar array
    const [movedItem] = user.fotos_portada.splice(fromIndex, 1);
    user.fotos_portada.splice(toIndex, 0, movedItem);

    await user.save();

    res.json({
      success: true,
      message: 'Fotos reordenadas exitosamente',
      coverPhotos: user.fotos_portada
    });

  } catch (error) {
    console.error('Error reordenando fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Aplicar middleware de errores
router.use(handleUploadErrors);

module.exports = router;