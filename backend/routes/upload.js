// backend/routes/upload.js - VERSIÓN SIMPLIFICADA Y CORREGIDA
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// ========== CONFIGURACIÓN SIMPLIFICADA ==========
const createDirectories = () => {
    const directories = {
        posts: path.join(__dirname, '../uploads/images/posts'),
        profiles: path.join(__dirname, '../uploads/images/profiles'),
        covers: path.join(__dirname, '../uploads/images/covers'),
        audio: path.join(__dirname, '../uploads/audio'),
        video: path.join(__dirname, '../uploads/video')
    };

    Object.values(directories).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Directorio creado: ${dir}`);
        }
    });

    return directories;
};

const directories = createDirectories();

// SOLO UNA CONFIGURACIÓN MULTER - SIMPLIFICADA
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir = directories.posts; // Por defecto para imágenes de posts
        
        // Determinar directorio basado en el campo del formulario
        if (file.fieldname === 'profilePicture') {
            uploadDir = directories.profiles;
        } else if (file.fieldname === 'coverPicture') {
            uploadDir = directories.covers;
        } else if (file.fieldname === 'audio') {
            uploadDir = directories.audio;
        } else if (file.fieldname === 'video') {
            uploadDir = directories.video;
        }
        // 'image' field va a posts por defecto
        
        console.log(`📂 Campo: ${file.fieldname} -> Destino: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${path.extname(file.originalname)}`;
        console.log(`📝 Nombre generado: ${uniqueName}`);
        cb(null, uniqueName);
    }
});

// FILTRO DE ARCHIVOS MEJORADO
const fileFilter = (req, file, cb) => {
    console.log(`🔍 Validando archivo: ${file.originalname} (${file.mimetype})`);
    
    // Permitir imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    // Permitir audio
    else if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    }
    // Permitir video
    else if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    }
    // Rechazar otros tipos
    else {
        console.log('❌ Tipo de archivo rechazado:', file.mimetype);
        cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes, audio y video.'), false);
    }
};

// CONFIGURACIÓN MULTER ÚNICA
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB máximo general
        files: 1 // Solo un archivo por vez
    },
    fileFilter: fileFilter
});

// Middleware de errores mejorado
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

// ========== RUTAS DE UPLOAD ==========

// SUBIR IMAGEN PARA POST
router.post('/image', upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), (req, res) => {
    try {
        console.log('📝 Subiendo imagen para post...');
        
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
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype
        });

        const imageUrl = `http://localhost:3001/uploads/images/posts/${file.filename}`;
        console.log('✅ Imagen subida:', imageUrl);

        res.json({
            success: true,
            data: {
                url: imageUrl,
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

        const audioUrl = `http://localhost:3001/uploads/audio/${req.file.filename}`;
        console.log('✅ Audio subido:', audioUrl);

        res.json({
            success: true,
            data: {
                url: audioUrl,
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
// En upload.js - Ruta para video
router.post('/video', upload.single('video'), (req, res) => {
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
            fieldname: req.file.fieldname, // Debe decir 'video'
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        const videoUrl = `http://localhost:3001/uploads/video/${req.file.filename}`;
        console.log('✅ Video subido:', videoUrl);

        res.json({
            success: true,
            data: {
                url: videoUrl,
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

        const imageUrl = `http://localhost:3001/uploads/images/profiles/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { 
                foto_perfil: imageUrl,
                $inc: { __v: 1 }
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!user) {
            // Eliminar archivo subido
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        console.log('✅ Foto de perfil actualizada');

        res.json({
            success: true,
            message: 'Foto de perfil actualizada exitosamente',
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('❌ Error subiendo foto de perfil:', error);
        
        // Eliminar archivo en caso de error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.log('⚠️ No se pudo eliminar el archivo:', unlinkError.message);
            }
        }
        
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
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Inicializar array si no existe
        if (!user.fotos_portada) {
            user.fotos_portada = [];
        }

        // Verificar límite máximo
        if (user.fotos_portada.length >= 4) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Máximo 4 fotos de portada permitidas'
            });
        }

        const newCoverPhoto = `http://localhost:3001/uploads/images/covers/${req.file.filename}`;
        user.fotos_portada.push(newCoverPhoto);
        
        // Si es la primera foto, establecer como principal
        if (user.fotos_portada.length === 1) {
            user.foto_portada = newCoverPhoto;
        }

        await user.save();

        console.log('✅ Foto de portada agregada');

        res.json({
            success: true,
            message: 'Foto de portada agregada exitosamente',
            imageUrl: newCoverPhoto,
            coverPhotos: user.fotos_portada
        });

    } catch (error) {
        console.error('❌ Error subiendo foto de portada:', error);
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.log('⚠️ No se pudo eliminar el archivo:', unlinkError.message);
            }
        }
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

        // Verificar límite mínimo
        if (user.fotos_portada.length <= 2) {
            return res.status(400).json({
                success: false,
                error: 'Mínimo 2 fotos de portada requeridas'
            });
        }

        // Eliminar archivo físico
        const photoToDelete = user.fotos_portada[photoIndex];
        const imagePath = path.join(directories.covers, path.basename(photoToDelete));
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
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

// Aplicar middleware de errores
router.use(handleUploadErrors);

module.exports = router;