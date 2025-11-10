// backend/routes/upload.js - VERSIÓN CORREGIDA
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// ========== CONFIGURACIÓN PARA TODOS LOS UPLOADS ==========
const createDirectories = () => {
    const directories = {
        posts: path.join(__dirname, '../uploads/images/posts'),
        profiles: path.join(__dirname, '../uploads/images/profiles'),
        covers: path.join(__dirname, '../uploads/images/covers')
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

// Configuración única de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir = directories.posts; // Por defecto
        
        if (file.fieldname === 'profilePicture') {
            uploadDir = directories.profiles;
        } else if (file.fieldname === 'coverPicture') {
            uploadDir = directories.covers;
        }
        
        console.log(`📂 Campo: ${file.fieldname} -> Destino: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${path.extname(file.originalname)}`;
        console.log(`📝 Nombre generado: ${uniqueName}`);
        cb(null, uniqueName);
    }
});

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        console.log(`🔍 Validando: ${file.originalname} (${file.mimetype})`);
        
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Middleware de errores mejorado
const handleUploadErrors = (err, req, res, next) => {
    console.log('🚨 Error en upload:', err.message);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'La imagen es demasiado grande (máximo 5MB)'
            });
        }
    }
    
    if (err.message.includes('Solo se permiten archivos de imagen')) {
        return res.status(400).json({
            success: false,
            error: 'Solo se permiten archivos de imagen'
        });
    }
    
    return res.status(500).json({
        success: false,
        error: 'Error al subir el archivo'
    });
};

// ========== RUTAS PARA POSTS ==========
router.post('/image', upload.single('image'), (req, res, next) => {
    try {
        console.log('📝 Subiendo imagen para post...');
        
        if (!req.file) {
            console.log('❌ No se recibió archivo');
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ninguna imagen'
            });
        }

        const imageUrl = `http://localhost:3001/uploads/images/posts/${req.file.filename}`;
        console.log('✅ Imagen de post subida:', imageUrl);

        res.json({
            success: true,
            data: {
                url: imageUrl,
                filename: req.file.filename
            }
        });

    } catch (error) {
        next(error);
    }
});

// ========== RUTAS PARA PERFIL Y PORTADA ==========

// Subir foto de perfil
// Subir foto de perfil - VERSIÓN CORREGIDA
router.post('/profile-picture/:userId', upload.single('profilePicture'), async (req, res, next) => {
    let fileDeleted = false;
    
    try {
        console.log('📸 INICIANDO UPLOAD DE FOTO DE PERFIL');
        console.log('👤 User ID:', req.params.userId);
        
        if (!req.file) {
            console.log('❌ No se recibió archivo de perfil');
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ninguna imagen'
            });
        }

        console.log('📊 Detalles del archivo:', {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size
        });

        // Usar findByIdAndUpdate en lugar de save() para evitar conflictos de versión
        const imageUrl = `http://localhost:3001/uploads/images/profiles/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { 
                foto_perfil: imageUrl,
                $inc: { __v: 1 } // Incrementar versión manualmente
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!user) {
            console.log('❌ Usuario no encontrado:', req.params.userId);
            fs.unlinkSync(req.file.path);
            fileDeleted = true;
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        console.log('✅ Foto de perfil actualizada en BD:', imageUrl);

        res.json({
            success: true,
            message: 'Foto de perfil actualizada exitosamente',
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('❌ Error subiendo foto de perfil:', error);
        
        // Eliminar archivo en caso de error
        if (req.file && req.file.path && !fileDeleted) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('🗑️ Archivo eliminado por error');
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

// Subir foto de portada
router.post('/cover-picture/:userId', upload.single('coverPicture'), async (req, res, next) => {
    try {
        console.log('🏞️ INICIANDO UPLOAD DE FOTO DE PORTADA');
        console.log('👤 User ID:', req.params.userId);
        console.log('📁 Archivo recibido:', req.file ? 'SÍ' : 'NO');
        
        if (!req.file) {
            console.log('❌ No se recibió archivo de portada');
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ninguna imagen'
            });
        }

        console.log('📊 Detalles del archivo:', {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            path: req.file.path
        });

        const user = await User.findById(req.params.userId);
        if (!user) {
            console.log('❌ Usuario no encontrado:', req.params.userId);
            if (req.file) {
                fs.unlinkSync(req.file.path);
                console.log('🗑️ Archivo eliminado por usuario no encontrado');
            }
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        console.log('✅ Usuario encontrado:', user.username);

        // Inicializar array si no existe
        if (!user.fotos_portada) {
            user.fotos_portada = [];
        }

        console.log(`📊 Fotos de portada actuales: ${user.fotos_portada.length}`);

        // Verificar límite máximo (4 fotos)
        if (user.fotos_portada.length >= 4) {
            console.log('❌ Límite máximo alcanzado (4 fotos)');
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Máximo 4 fotos de portada permitidas. Elimina alguna antes de agregar una nueva.'
            });
        }

        // Agregar a la lista de fotos de portada
        const newCoverPhoto = `http://localhost:3001/uploads/images/covers/${req.file.filename}`;
        user.fotos_portada.push(newCoverPhoto);
        
        // Si es la primera foto de portada, establecerla como principal
        if (user.fotos_portada.length === 1) {
            user.foto_portada = newCoverPhoto;
        }

        await user.save();

        console.log('✅ Foto de portada agregada:', newCoverPhoto);
        console.log('📊 Total de fotos de portada:', user.fotos_portada.length);

        res.json({
            success: true,
            message: 'Foto de portada agregada exitosamente',
            imageUrl: newCoverPhoto,
            coverPhotos: user.fotos_portada,
            currentCount: user.fotos_portada.length,
            maxAllowed: 4
        });

    } catch (error) {
        console.error('❌ Error subiendo foto de portada:', error);
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('🗑️ Archivo eliminado por error');
            } catch (unlinkError) {
                console.log('⚠️ No se pudo eliminar el archivo:', unlinkError.message);
            }
        }
        next(error);
    }
});

// Eliminar foto de portada
router.delete('/cover-picture/:userId/:photoIndex', async (req, res) => {
    try {
        console.log('🗑️ Eliminando foto de portada:', req.params.photoIndex);
        
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

        // Verificar límite mínimo (2 fotos)
        if (user.fotos_portada.length <= 2) {
            return res.status(400).json({
                success: false,
                error: 'Mínimo 2 fotos de portada requeridas. Agrega más fotos antes de eliminar esta.'
            });
        }

        // Eliminar archivo físico
        const photoToDelete = user.fotos_portada[photoIndex];
        const imagePath = path.join(directories.covers, path.basename(photoToDelete));
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('🗑️ Archivo físico de portada eliminado');
        }

        // Eliminar de la lista
        user.fotos_portada.splice(photoIndex, 1);

        // Actualizar foto de portada principal si era la que se eliminó
        if (user.foto_portada === photoToDelete) {
            user.foto_portada = user.fotos_portada.length > 0 ? user.fotos_portada[0] : '';
        }

        await user.save();

        console.log('✅ Foto de portada eliminada. Total restante:', user.fotos_portada.length);

        res.json({
            success: true,
            message: 'Foto de portada eliminada exitosamente',
            coverPhotos: user.fotos_portada,
            mainCoverPhoto: user.foto_portada,
            currentCount: user.fotos_portada.length,
            minRequired: 2
        });

    } catch (error) {
        console.error('❌ Error eliminando foto de portada:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Establecer foto de portada principal
router.put('/cover-picture/main/:userId/:photoIndex', async (req, res) => {
    try {
        console.log('⭐ Estableciendo foto principal:', req.params.photoIndex);
        
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

        console.log('✅ Foto principal establecida:', user.foto_portada);

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

// Aplicar middleware de errores a todas las rutas
router.use(handleUploadErrors);

module.exports = router;