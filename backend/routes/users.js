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

        // VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO - NUEVA VERIFICACIÓN
        if (targetUser.usuarios_bloqueados.includes(currentUserId)) {
            return res.status(403).json({
                success: false,
                error: 'No puedes seguir a este usuario porque te tiene bloqueado'
            });
        }

        // VERIFICAR SI TÚ TIENES BLOQUEADO AL USUARIO - NUEVA VERIFICACIÓN
        if (currentUser.usuarios_bloqueados.includes(targetUserId)) {
            return res.status(403).json({
                success: false,
                error: 'No puedes seguir a un usuario que tienes bloqueado'
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

// ELIMINAR SEGUIDOR (remover a alguien de tu lista de seguidores)
router.post('/:id/remove-follower', async (req, res) => {
    try {
        const currentUserId = req.body.currentUserId;
        const followerId = req.params.id; // ID del seguidor que quieres eliminar

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        const currentUser = await User.findById(currentUserId);
        const followerUser = await User.findById(followerId);

        if (!currentUser || !followerUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si realmente te sigue
        if (!currentUser.seguidores.includes(followerId)) {
            return res.status(400).json({
                success: false,
                error: 'Este usuario no te sigue'
            });
        }

        // Remover de MIS seguidores
        currentUser.seguidores = currentUser.seguidores.filter(
            id => id.toString() !== followerId
        );
        
        // Remover de SUS seguidos (opcional, dependiendo de cómo quieras el comportamiento)
        followerUser.seguidos = followerUser.seguidos.filter(
            id => id.toString() !== currentUserId
        );

        await currentUser.save();
        await followerUser.save();

        console.log(`🗑️ ${currentUser.username} eliminó a ${followerUser.username} de sus seguidores`);

        res.json({
            success: true,
            message: `Has eliminado a ${followerUser.nombre} de tus seguidores`,
            data: {
                seguidores: currentUser.seguidores.length,
                seguidos: followerUser.seguidos.length
            }
        });

    } catch (error) {
        console.error('❌ Error eliminando seguidor:', error);
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

// backend/routes/users.js - AGREGA ESTO AL FINAL, ANTES DE module.exports

// VERIFICAR BLOQUEO MUTUO entre usuarios
router.post('/:userId/check-blocked', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.body;

        console.log(`🔍 Verificando bloqueo entre ${currentUserId} y ${userId}`);

        const user = await User.findById(userId);
        const currentUser = await User.findById(currentUserId);

        if (!user || !currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el usuario actual está bloqueado por el otro usuario
        const isBlockedByThem = user.usuarios_bloqueados.includes(currentUserId);
        // Verificar si el usuario actual bloqueó al otro usuario
        const iBlockedThem = currentUser.usuarios_bloqueados.includes(userId);

        const isBlocked = isBlockedByThem || iBlockedThem;

        console.log(`📊 Resultado verificación bloqueo:`, {
            isBlocked,
            blockedByThem: isBlockedByThem,
            blockedByMe: iBlockedThem
        });

        res.json({
            success: true,
            data: {
                isBlocked: isBlocked,
                blockedByThem: isBlockedByThem,
                blockedByMe: iBlockedThem
            }
        });

    } catch (error) {
        console.error('❌ Error verificando bloqueo:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al verificar bloqueo'
        });
    }
});

// También sería bueno agregar este endpoint adicional para verificar bloqueo específico
// VERIFICAR si el usuario actual puede ver el perfil de otro usuario
router.post('/:userId/can-view-profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.body;

        const user = await User.findById(userId);
        const currentUser = await User.findById(currentUserId);

        if (!user || !currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar bloqueos mutuos
        const isBlockedByThem = user.usuarios_bloqueados.includes(currentUserId);
        const iBlockedThem = currentUser.usuarios_bloqueados.includes(userId);
        const isBlocked = isBlockedByThem || iBlockedThem;

        // Verificar si el perfil es privado (si implementas perfiles privados en el futuro)
        const isPrivate = user.configuracion?.perfil_privado || false;

        let canView = true;
        let reason = '';

        if (isBlocked) {
            canView = false;
            if (isBlockedByThem && iBlockedThem) {
                reason = 'bloqueo_mutuo';
            } else if (isBlockedByThem) {
                reason = 'ellos_te_bloquearon';
            } else {
                reason = 'tu_lo_bloqueaste';
            }
        }

        res.json({
            success: true,
            data: {
                canView: canView,
                isBlocked: isBlocked,
                reason: reason,
                userInfo: {
                    nombre: user.nombre,
                    username: user.username,
                    foto_perfil: user.foto_perfil
                }
            }
        });

    } catch (error) {
        console.error('❌ Error verificando visibilidad de perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor'
        });
    }
});

module.exports = router;