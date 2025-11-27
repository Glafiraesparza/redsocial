// backend/routes/upload.js - VERSIÓN SIMPLIFICADA
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

// CONFIGURACIÓN MULTER SIMPLE (almacenamiento en memoria)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('audio/') || 
        file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado'), false);
    }
  }
});

// Función para subir a Cloudinary
const uploadToCloudinary = async (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        quality: 'auto:good',
        format: file.mimetype.startsWith('image/') ? 'webp' : undefined
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    uploadStream.end(file.buffer);
  });
};

// ========== RUTAS DE UPLOAD ==========

// SUBIR IMAGEN PARA POST
// SUBIR IMAGEN PARA POST - ACEPTAR AMBOS CAMPOS
router.post('/image', upload.single('imagen'), async (req, res) => {
  try {
    console.log('📝 Subiendo imagen para post...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen. Use el campo "imagen".'
      });
    }

    // Subir a Cloudinary
    const result = await uploadToCloudinary(req.file, 'red-social/posts');
    
    console.log('✅ Archivo subido a Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        filename: result.public_id,
        tipo: 'imagen',
        size: result.bytes
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

// RUTA ALTERNATIVA PARA 'image' (si tu frontend usa ese campo)
router.post('/image-alt', upload.single('image'), async (req, res) => {
  try {
    console.log('📝 Subiendo imagen (campo alternativo)...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen. Use el campo "image".'
      });
    }

    const result = await uploadToCloudinary(req.file, 'red-social/posts');
    
    console.log('✅ Archivo subido a Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        filename: result.public_id,
        tipo: 'imagen',
        size: result.bytes
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
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎵 Subiendo audio...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de audio'
      });
    }

    const result = await uploadToCloudinary(req.file, 'red-social/audio');
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
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de video'
      });
    }

    const result = await uploadToCloudinary(req.file, 'red-social/video');
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

    const result = await uploadToCloudinary(req.file, 'red-social/profiles');

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

    const result = await uploadToCloudinary(req.file, 'red-social/covers');
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

module.exports = router;