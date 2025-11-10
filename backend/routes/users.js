// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();

// CREATE - Crear usuario
router.post('/', async (req, res) => {
    try {
        console.log('📝 Intentando crear usuario:', req.body);
        const user = new User(req.body);
        await user.save();
        console.log('✅ Usuario creado:', user.username);
        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ Error creando usuario:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// READ - Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        console.log('📋 Solicitando lista de usuarios');
        const users = await User.find().select('-password');
        console.log(`✅ Encontrados ${users.length} usuarios`);
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// READ - Obtener usuario por ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// backend/routes/users.js - AGREGA ESTO AL FINAL

// SEGUIR a un usuario
router.post('/:id/follow', async (req, res) => {
    try {
        const currentUserId = req.body.currentUserId;
        const targetUserId = req.params.id;

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        // Verificar que no sea el mismo usuario
        if (currentUserId === targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'No puedes seguirte a ti mismo'
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si ya lo sigue
        if (currentUser.seguidos.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Ya sigues a este usuario'
            });
        }

        // Agregar a seguidos del currentUser
        currentUser.seguidos.push(targetUserId);
        // Agregar a seguidores del targetUser
        targetUser.seguidores.push(currentUserId);

        await currentUser.save();
        await targetUser.save();

        console.log(`✅ ${currentUser.username} sigue a ${targetUser.username}`);

        res.json({
            success: true,
            message: `Ahora sigues a ${targetUser.nombre}`,
            data: {
                seguidores: targetUser.seguidores.length,
                seguidos: currentUser.seguidos.length
            }
        });

    } catch (error) {
        console.error('❌ Error al seguir usuario:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DEJAR DE SEGUIR a un usuario
router.post('/:id/unfollow', async (req, res) => {
    try {
        const currentUserId = req.body.currentUserId;
        const targetUserId = req.params.id;

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si realmente lo sigue
        if (!currentUser.seguidos.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'No sigues a este usuario'
            });
        }

        // Remover de seguidos
        currentUser.seguidos = currentUser.seguidos.filter(
            id => id.toString() !== targetUserId
        );
        // Remover de seguidores
        targetUser.seguidores = targetUser.seguidores.filter(
            id => id.toString() !== currentUserId
        );

        await currentUser.save();
        await targetUser.save();

        console.log(`❌ ${currentUser.username} dejó de seguir a ${targetUser.username}`);

        res.json({
            success: true,
            message: `Dejaste de seguir a ${targetUser.nombre}`,
            data: {
                seguidores: targetUser.seguidores.length,
                seguidos: currentUser.seguidos.length
            }
        });

    } catch (error) {
        console.error('❌ Error al dejar de seguir:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER SEGUIDORES de un usuario
router.get('/:id/followers', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('seguidores', 'nombre username foto_perfil')
            .select('seguidores');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user.seguidores
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER SEGUIDOS de un usuario
router.get('/:id/following', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('seguidos', 'nombre username foto_perfil')
            .select('seguidos');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user.seguidos
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// VERIFICAR si un usuario sigue a otro
router.get('/:id/isfollowing/:targetId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const isFollowing = user.seguidos.includes(req.params.targetId);

        res.json({
            success: true,
            data: { isFollowing }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// backend/routes/users.js - AGREGA estas rutas al final

// BLOQUEAR usuario
router.post('/:id/block', async (req, res) => {
    try {
        const currentUserId = req.body.currentUserId;
        const targetUserId = req.params.id;

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        // Verificar que no sea el mismo usuario
        if (currentUserId === targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'No puedes bloquearte a ti mismo'
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si ya está bloqueado
        if (currentUser.usuarios_bloqueados.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Ya tienes bloqueado a este usuario'
            });
        }

        // Remover de seguidores/seguidos si existen
        currentUser.seguidores = currentUser.seguidores.filter(
            id => id.toString() !== targetUserId
        );
        currentUser.seguidos = currentUser.seguidos.filter(
            id => id.toString() !== targetUserId
        );

        targetUser.seguidores = targetUser.seguidores.filter(
            id => id.toString() !== currentUserId
        );
        targetUser.seguidos = targetUser.seguidos.filter(
            id => id.toString() !== currentUserId
        );

        // Agregar a bloqueados
        currentUser.usuarios_bloqueados.push(targetUserId);
        targetUser.bloqueado_por.push(currentUserId);

        await currentUser.save();
        await targetUser.save();

        console.log(`🚫 ${currentUser.username} bloqueó a ${targetUser.username}`);

        res.json({
            success: true,
            message: `Has bloqueado a ${targetUser.nombre}`,
            data: {
                usuarios_bloqueados: currentUser.usuarios_bloqueados.length
            }
        });

    } catch (error) {
        console.error('❌ Error bloqueando usuario:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DESBLOQUEAR usuario
router.post('/:id/unblock', async (req, res) => {
    try {
        const currentUserId = req.body.currentUserId;
        const targetUserId = req.params.id;

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si realmente está bloqueado
        if (!currentUser.usuarios_bloqueados.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'No tienes bloqueado a este usuario'
            });
        }

        // Remover de bloqueados
        currentUser.usuarios_bloqueados = currentUser.usuarios_bloqueados.filter(
            id => id.toString() !== targetUserId
        );
        targetUser.bloqueado_por = targetUser.bloqueado_por.filter(
            id => id.toString() !== currentUserId
        );

        await currentUser.save();
        await targetUser.save();

        console.log(`✅ ${currentUser.username} desbloqueó a ${targetUser.username}`);

        res.json({
            success: true,
            message: `Has desbloqueado a ${targetUser.nombre}`,
            data: {
                usuarios_bloqueados: currentUser.usuarios_bloqueados.length
            }
        });

    } catch (error) {
        console.error('❌ Error desbloqueando usuario:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER usuarios bloqueados
router.get('/:id/blocked', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('usuarios_bloqueados', 'nombre username foto_perfil biografia seguidores seguidos')
            .select('usuarios_bloqueados');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user.usuarios_bloqueados
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// VERIFICAR si un usuario está bloqueado
router.get('/:id/isblocked/:targetId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const isBlocked = user.usuarios_bloqueados.includes(req.params.targetId);

        res.json({
            success: true,
            data: { isBlocked }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;