// backend/routes/upload.js - VERSIÓN CORREGIDA PARA CLOUDINARY v2.8.0
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

// CONFIGURACIÓN MULTER CON CLOUDINARY - VERSIÓN CORREGIDA
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'red-social/posts', // Folder por defecto
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mp3', 'wav'],
    resource_type: 'auto',
    transformation: [
      { quality: 'auto:good' },
      { format: 'webp' } // Para imágenes
    ]
  }
});

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

// Middleware para determinar folder dinámico
const setUploadFolder = (req, res, next) => {
  // Determinar folder basado en la ruta
  if (req.route.path.includes('profile-picture')) {
    req.uploadFolder = 'red-social/profiles';
  } else if (req.route.path.includes('cover-picture')) {
    req.uploadFolder = 'red-social/covers';
  } else if (req.route.path.includes('/audio')) {
    req.uploadFolder = 'red-social/audio';
  } else if (req.route.path.includes('/video')) {
    req.uploadFolder = 'red-social/video';
  } else {
    req.uploadFolder = 'red-social/posts';
  }
  next();
};

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
router.post('/image', setUploadFolder, upload.single('imagen'), (req, res) => {
  try {
    console.log('📝 Subiendo imagen para post...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    console.log('✅ Archivo subido a Cloudinary:', {
      originalname: req.file.originalname,
      url: req.file.path,
      size: req.file.size,
      folder: req.uploadFolder
    });

    res.json({
      success: true,
      data: {
        url: req.file.path, // URL de Cloudinary
        filename: req.file.filename,
        tipo: 'imagen',
        size: req.file.size
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
router.post('/audio', setUploadFolder, upload.single('audio'), (req, res) => {
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
        url: req.file.path,
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
router.post('/video', setUploadFolder, upload.single('video'), (req, res) => {
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
        url: req.file.path,
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
router.post('/profile-picture/:userId', setUploadFolder, upload.single('profilePicture'), async (req, res) => {
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
        foto_perfil: req.file.path,
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
router.post('/cover-picture/:userId', setUploadFolder, upload.single('coverPicture'), async (req, res) => {
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

    const newCoverPhoto = req.file.path;
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

        // 🔥 OPCIONAL: Eliminar de Cloudinary (descomenta si quieres)
        /*
        const photoToDelete = user.fotos_portada[photoIndex];
        try {
            // Extraer public_id de la URL de Cloudinary
            const urlParts = photoToDelete.split('/');
            const publicIdWithExtension = urlParts[urlParts.length - 1];
            const publicId = publicIdWithExtension.split('.')[0];
            
            await cloudinary.uploader.destroy(publicId);
            console.log('✅ Foto eliminada de Cloudinary:', publicId);
        } catch (cloudinaryError) {
            console.log('⚠️ No se pudo eliminar de Cloudinary:', cloudinaryError.message);
        }
        */

        const photoToDelete = user.fotos_portada[photoIndex];
        
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