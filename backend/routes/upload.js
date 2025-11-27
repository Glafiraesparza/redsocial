// backend/routes/upload.js - VERSIÓN CLOUDINARY
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../models/User');

const router = express.Router();

// ========== CONFIGURACIÓN CLOUDINARY ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// CONFIGURACIÓN MULTER CON CLOUDINARY
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determinar folder basado en el tipo de archivo
    let folder = 'red-social/posts'; // Por defecto
    
    if (file.fieldname === 'profilePicture') {
      folder = 'red-social/profiles';
    } else if (file.fieldname === 'coverPicture') {
      folder = 'red-social/covers';
    } else if (file.fieldname === 'audio') {
      folder = 'red-social/audio';
    } else if (file.fieldname === 'video') {
      folder = 'red-social/video';
    }

    // Determinar formato y calidad
    let format, quality;
    if (file.mimetype.startsWith('image/')) {
      format = 'webp'; // Convertir todas las imágenes a webp
      quality = 'auto:good';
    } else if (file.mimetype.startsWith('video/')) {
      format = 'mp4';
      quality = 'auto';
    } else if (file.mimetype.startsWith('audio/')) {
      format = 'mp3';
    }

    return {
      folder: folder,
      format: format,
      quality: quality,
      resource_type: 'auto',
      public_id: `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  }
});

// FILTRO DE ARCHIVOS (igual que antes)
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

// Middleware de errores (simplificado para Cloudinary)
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

// ========== RUTAS DE UPLOAD ACTUALIZADAS ==========

// SUBIR IMAGEN PARA POST
router.post('/image', upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  try {
    console.log('📝 Subiendo imagen para post...');
    
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
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen. Use el campo "imagen" o "image".'
      });
    }

    console.log('✅ Archivo subido a Cloudinary:', {
      fieldUsed: fieldUsed,
      originalname: file.originalname,
      url: file.path,
      size: file.size
    });

    res.json({
      success: true,
      data: {
        url: file.path, // URL de Cloudinary
        filename: file.filename,
        tipo: 'imagen',
        size: file.size,
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
});

// SUBIR AUDIO
router.post('/audio', upload.single('audio'), (req, res) => {
  try {
    console.log('🎵 Subiendo audio...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de audio'
      });
    }

    console.log('✅ Audio subido a Cloudinary:', req.file.path);

    res.json({
      success: true,
      data: {
        url: req.file.path, // URL de Cloudinary
        filename: req.file.filename,
        tipo: 'audio',
        size: req.file.size
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
router.post('/video', upload.single('video'), (req, res) => {
  try {
    console.log('🎬 Subiendo video...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de video'
      });
    }

    console.log('✅ Video subido a Cloudinary:', req.file.path);

    res.json({
      success: true,
      data: {
        url: req.file.path, // URL de Cloudinary
        filename: req.file.filename,
        tipo: 'video',
        size: req.file.size
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

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        foto_perfil: req.file.path, // URL de Cloudinary
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
      imageUrl: req.file.path
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

    const newCoverPhoto = req.file.path; // URL de Cloudinary
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

// En upload.js - Agrega esta ruta
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

        // Si la foto principal cambió de posición, actualizar referencia si es necesario
        // (opcional, dependiendo de cómo manejes la foto principal)

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

// ELIMINAR FOTO DE PORTADA - VERSIÓN CLOUDINARY
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

        // 🔥 ELIMINAR DE CLOUDINARY (opcional - si quieres eliminar físicamente)
        const photoToDelete = user.fotos_portada[photoIndex];
        /*
        // Si quieres eliminar el archivo de Cloudinary también:
        try {
            const publicId = photoToDelete.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
            console.log('✅ Foto eliminada de Cloudinary:', publicId);
        } catch (cloudinaryError) {
            console.log('⚠️ No se pudo eliminar de Cloudinary:', cloudinaryError.message);
        }
        */

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

// Aplicar middleware de errores
router.use(handleUploadErrors);

module.exports = router;