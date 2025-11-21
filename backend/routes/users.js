// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const Notification = require('../models/Notification');

// LOGIN - Autenticar usuario
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 Intentando login para usuario:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuario y contraseña son requeridos'
            });
        }

        // Buscar usuario por username
        const user = await User.findOne({ username: username });
        
        if (!user) {
            console.log('❌ Usuario no encontrado:', username);
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        // Verificar contraseña (comparación directa ya que no está hasheada)
        if (user.password !== password) {
            console.log('❌ Contraseña incorrecta para usuario:', username);
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        console.log('✅ Login exitoso para:', username);

        // Crear objeto de usuario sin la contraseña para enviar al frontend
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.json({
            success: true,
            message: 'Login exitoso',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al autenticar'
        });
    }
});

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

// BÚSQUEDA DE USUARIOS con filtros
router.post('/search', async (req, res) => {
    try {
        const { currentUserId, query, searchBy, includeInterests } = req.body;
        
        console.log('🔍 Búsqueda de usuarios:', { query, searchBy, includeInterests });

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID del usuario actual'
            });
        }

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario actual no encontrado'
            });
        }

        // Construir query de búsqueda
        let searchQuery = {
            _id: { $ne: currentUserId } // Excluir al usuario actual
        };

        // Filtrar usuarios bloqueados y que te han bloqueado
        const blockedUsers = [
            ...(currentUser.usuarios_bloqueados || []),
            ...(currentUser.bloqueado_por || [])
        ];
        
        if (blockedUsers.length > 0) {
            searchQuery._id.$nin = blockedUsers;
        }

        // Búsqueda por nombre de usuario o nombre real
        if (query && query.trim() !== '') {
            const searchRegex = new RegExp(query.trim(), 'i');
            
            if (searchBy === 'username') {
                searchQuery.username = searchRegex;
            } else if (searchBy === 'name') {
                searchQuery.nombre = searchRegex;
            } else if (searchBy === 'both') {
                searchQuery.$or = [
                    { username: searchRegex },
                    { nombre: searchRegex }
                ];
            }
        }

        // Búsqueda por intereses
        if (includeInterests && query && query.trim() !== '') {
            const interestsRegex = new RegExp(query.trim(), 'i');
            
            if (searchQuery.$or) {
                searchQuery.$or.push({ intereses: interestsRegex });
            } else {
                searchQuery.$or = [{ intereses: interestsRegex }];
            }
        }

        console.log('📋 Query de búsqueda:', JSON.stringify(searchQuery));

        const users = await User.find(searchQuery)
            .select('nombre username foto_perfil biografia intereses seguidores seguidos')
            .limit(50);

        console.log(`✅ Encontrados ${users.length} usuarios`);

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('❌ Error en búsqueda de usuarios:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER USUARIOS RECOMENDADOS basados en intereses
router.get('/recommendations/:userId', async (req, res) => {
    try {
        const currentUserId = req.params.userId;
        
        console.log('🎯 Obteniendo recomendaciones para usuario:', currentUserId);

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Si el usuario no tiene intereses, devolver usuarios aleatorios
        if (!currentUser.intereses || currentUser.intereses.length === 0) {
            console.log('ℹ️ Usuario sin intereses, devolviendo usuarios aleatorios');
            
            const randomUsers = await User.find({
                _id: { 
                    $ne: currentUserId,
                    $nin: [
                        ...(currentUser.usuarios_bloqueados || []),
                        ...(currentUser.bloqueado_por || [])
                    ]
                }
            })
            .select('nombre username foto_perfil biografia intereses seguidores seguidos')
            .limit(10);
            
            return res.json({
                success: true,
                data: randomUsers
            });
        }

        console.log('🔍 Buscando usuarios con intereses similares...');

        // Buscar usuarios con al menos 3 intereses en común
        const recommendedUsers = await User.aggregate([
            {
                $match: {
                    _id: { 
                        $ne: currentUser._id,
                        $nin: [
                            ...(currentUser.usuarios_bloqueados || []),
                            ...(currentUser.bloqueado_por || [])
                        ]
                    },
                    intereses: { $in: currentUser.intereses }
                }
            },
            {
                $addFields: {
                    commonInterests: {
                        $size: {
                            $setIntersection: ["$intereses", currentUser.intereses]
                        }
                    }
                }
            },
            {
                $match: {
                    commonInterests: { $gte: 3 } // Al menos 3 intereses en común
                }
            },
            {
                $sort: { commonInterests: -1 } // Ordenar por más intereses en común
            },
            {
                $limit: 15
            },
            {
                $project: {
                    nombre: 1,
                    username: 1,
                    foto_perfil: 1,
                    biografia: 1,
                    intereses: 1,
                    seguidores: 1,
                    seguidos: 1,
                    commonInterests: 1
                }
            }
        ]);

        console.log(`✅ ${recommendedUsers.length} usuarios recomendados encontrados`);

        res.json({
            success: true,
            data: recommendedUsers
        });

    } catch (error) {
        console.error('❌ Error obteniendo recomendaciones:', error);
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

        // ✅ CREAR NOTIFICACIÓN DE FOLLOW - VERSIÓN CORRECTA
        const notification = new Notification({
            usuario: targetUserId,
            emisor: currentUserId,
            tipo: 'follow'
        });
        await notification.save();

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

// VERIFICAR BLOQUEO PARA MENSAJES
router.get('/check-block-status/:currentUserId/:otherUserId', async (req, res) => {
    try {
        const { currentUserId, otherUserId } = req.params;

        console.log(`🔍 Verificando estado de bloqueo entre ${currentUserId} y ${otherUserId}`);

        const [currentUser, otherUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(otherUserId)
        ]);

        if (!currentUser || !otherUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el usuario actual bloqueó al otro
        const iBlockedThem = currentUser.usuarios_bloqueados.includes(otherUserId);
        // Verificar si el otro usuario bloqueó al actual
        const theyBlockedMe = otherUser.usuarios_bloqueados.includes(currentUserId);

        const isBlocked = iBlockedThem || theyBlockedMe;
        
        let status = null;
        if (isBlocked) {
            if (iBlockedThem && theyBlockedMe) {
                status = 'bloqueo_mutuo';
            } else if (iBlockedThem) {
                status = 'tu_has_bloqueado';
            } else {
                status = 'te_han_bloqueado';
            }
        }

        console.log(`📊 Estado de bloqueo:`, { isBlocked, status });

        res.json({
            success: true,
            data: {
                isBlocked,
                status,
                blockedBy: iBlockedThem ? 'you' : theyBlockedMe ? 'them' : null
            }
        });

    } catch (error) {
        console.error('❌ Error verificando estado de bloqueo:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al verificar bloqueo'
        });
    }
});

// ===== RUTAS PARA CAMBIAR CONFIGURACIÓN DE USUARIO =====

// CAMBIAR USERNAME
router.put('/:id/username', async (req, res) => {
    try {
        const { newUsername } = req.body;
        const userId = req.params.id;

        console.log('🔄 Intentando cambiar username:', { userId, newUsername });

        // Validaciones
        if (!newUsername || newUsername.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El nombre de usuario no puede estar vacío'
            });
        }

        const username = newUsername.trim();

        // Validar formato: solo caracteres alfanuméricos y guión bajo, 3-20 caracteres
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de usuario solo puede contener letras, números y guiones bajos (3-20 caracteres)'
            });
        }

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el nuevo username ya existe (excluyendo el usuario actual)
        const existingUser = await User.findOne({ 
            username: username,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Este nombre de usuario ya está en uso'
            });
        }

        // Guardar el username anterior para el log
        const oldUsername = user.username;

        // Actualizar username
        user.username = username;
        await user.save();

        console.log(`✅ Username cambiado: ${oldUsername} -> ${username}`);

        res.json({
            success: true,
            message: 'Nombre de usuario actualizado exitosamente',
            data: {
                username: user.username
            }
        });

    } catch (error) {
        console.error('❌ Error cambiando username:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al cambiar el nombre de usuario'
        });
    }
});

// CAMBIAR EMAIL
router.put('/:id/email', async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.params.id;

        console.log('🔄 Intentando cambiar email:', { userId, newEmail });

        // Validaciones
        if (!newEmail || newEmail.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El correo electrónico no puede estar vacío'
            });
        }

        const email = newEmail.trim().toLowerCase();

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa un correo electrónico válido'
            });
        }

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el nuevo email ya existe (excluyendo el usuario actual)
        const existingUser = await User.findOne({ 
            email: email,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Este correo electrónico ya está en uso'
            });
        }

        // Guardar el email anterior para el log
        const oldEmail = user.email;

        // Actualizar email
        user.email = email;
        await user.save();

        console.log(`✅ Email cambiado: ${oldEmail} -> ${email}`);

        res.json({
            success: true,
            message: 'Correo electrónico actualizado exitosamente',
            data: {
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Error cambiando email:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al cambiar el correo electrónico'
        });
    }
});

// CAMBIAR PASSWORD
router.put('/:id/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.params.id;

        console.log('🔄 Intentando cambiar password para usuario:', userId);

        // Validaciones
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        // Validar longitud de nueva contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual (comparación directa ya que no está hasheada)
        if (user.password !== currentPassword) {
            return res.status(401).json({
                success: false,
                error: 'La contraseña actual es incorrecta'
            });
        }

        // Verificar que la nueva contraseña no sea igual a la actual
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // Actualizar contraseña
        user.password = newPassword;
        await user.save();

        console.log(`✅ Password cambiado exitosamente para usuario: ${user.username}`);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error cambiando password:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al cambiar la contraseña'
        });
    }
});

module.exports = router;
