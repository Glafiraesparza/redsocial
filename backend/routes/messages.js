// backend/routes/messages.js
const mongoose = require('mongoose');
const express = require('express');
const Message = require('../models/Message');
const Conversacion = require('../models/Conversacion');
const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

// AGREGAR ESTA RUTA - GET /api/messages/conversaciones (sin userId en params)
router.get('/conversaciones', async (req, res) => {
    try {
        console.log('💬 [MESSAGES] Ruta conversaciones - Obteniendo conversaciones...');
        
        // Obtener userId del query string
        const userId = req.query.userId;
        
        if (!userId) {
            console.log('⚠️  No se proporcionó userId, devolviendo array vacío');
            return res.json({
                success: true,
                data: []
            });
        }

        console.log('👤 UserID recibido:', userId);

        const conversaciones = await Conversacion.find({ 
            participantes: userId 
        })
        .populate('participantes', 'nombre username foto_perfil')
        .populate('ultimo_mensaje')
        .sort({ fecha_actualizacion: -1 });

        console.log(`📨 Conversaciones encontradas: ${conversaciones.length}`);

        res.json({
            success: true,
            data: conversaciones
        });
    } catch (error) {
        console.error('❌ Error obteniendo conversaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER todas las conversaciones del usuario
router.get('/conversaciones/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const conversaciones = await Conversacion.find({ 
            participantes: userId 
        })
        .populate('participantes', 'nombre username foto_perfil')
        .populate('ultimo_mensaje')
        .sort({ fecha_actualizacion: -1 });

        res.json({
            success: true,
            data: conversaciones
        });
    } catch (error) {
        console.error('❌ Error obteniendo conversaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OBTENER mensajes de una conversación
router.get('/conversacion/:conversacionId/mensajes', async (req, res) => {
    try {
        const { conversacionId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const mensajes = await Message.find({ conversacion: conversacionId })
            .populate('remitente', 'nombre username foto_perfil')
            .sort({ fecha_envio: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Marcar mensajes como leídos
        await Message.updateMany(
            { 
                conversacion: conversacionId, 
                remitente: { $ne: req.query.currentUserId },
                leido: false 
            },
            { leido: true }
        );

        res.json({
            success: true,
            data: mensajes.reverse() // Ordenar del más antiguo al más reciente
        });
    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// CREAR nueva conversación - VERSIÓN MEJORADA
router.post('/conversacion/nueva', async (req, res) => {
    try {
        const { usuario1Id, usuario2Id } = req.body;

        console.log('🚀 === NUEVA SOLICITUD DE CONVERSACIÓN ===');
        console.log('📦 Body completo recibido:', JSON.stringify(req.body, null, 2));
        console.log('👤 Usuario 1 ID:', usuario1Id);
        console.log('👤 Usuario 2 ID:', usuario2Id);
        console.log('🔍 Tipo de usuario1Id:', typeof usuario1Id);
        console.log('🔍 Tipo de usuario2Id:', typeof usuario2Id);

        // Validación EXTRA estricta
        if (!req.body.usuario1Id || !req.body.usuario2Id) {
            console.error('❌ FALTAN IDs EN EL BODY:', {
                tieneUsuario1: !!req.body.usuario1Id,
                tieneUsuario2: !!req.body.usuario2Id,
                bodyCompleto: req.body
            });
            return res.status(400).json({
                success: false,
                error: 'Se requieren ambos IDs de usuario'
            });
        }

        // 🔥 VALIDACIONES MEJORADAS
        if (!usuario1Id || !usuario2Id) {
            console.error('❌ Faltan IDs de usuario:', { usuario1Id, usuario2Id });
            return res.status(400).json({
                success: false,
                error: 'Se requieren ambos IDs de usuario'
            });
        }

        // Validar que los IDs no sean null, undefined o vacíos
        if (usuario1Id === 'null' || usuario1Id === 'undefined' || usuario1Id.trim() === '') {
            console.error('❌ usuario1Id inválido:', usuario1Id);
            return res.status(400).json({
                success: false,
                error: 'ID del primer usuario inválido'
            });
        }

        if (usuario2Id === 'null' || usuario2Id === 'undefined' || usuario2Id.trim() === '') {
            console.error('❌ usuario2Id inválido:', usuario2Id);
            return res.status(400).json({
                success: false,
                error: 'ID del segundo usuario inválido'
            });
        }

        if (usuario1Id === usuario2Id) {
            console.error('❌ Mismo usuario:', usuario1Id);
            return res.status(400).json({
                success: false,
                error: 'No puedes crear una conversación contigo mismo'
            });
        }

        // 🔥 CONVERSIÓN SEGURA A ObjectId
        let user1, user2;
        try {
            user1 = new mongoose.Types.ObjectId(usuario1Id);
            user2 = new mongoose.Types.ObjectId(usuario2Id);
            console.log('✅ ObjectIds creados:', { user1, user2 });
        } catch (idError) {
            console.error('❌ Error convirtiendo a ObjectId:', idError);
            return res.status(400).json({
                success: false,
                error: 'IDs de usuario inválidos'
            });
        }

        // ORDENAR participantes
        const participantesOrdenados = [user1, user2].sort((a, b) => 
            a.toString().localeCompare(b.toString())
        );

        console.log('📋 Participantes ordenados:', participantesOrdenados);

        // 🔍 BÚSQUEDA ROBUSTA
        console.log('🔍 Buscando conversación existente...');
        let conversacion = await Conversacion.findOne({
            $and: [
                { participantes: { $size: 2 } },
                { 
                    $or: [
                        { participantes: participantesOrdenados },
                        { participantes: { $all: participantesOrdenados } }
                    ]
                }
            ]
        })
        .populate('participantes', 'nombre username foto_perfil')
        .populate('ultimo_mensaje');

        console.log('🔍 Resultado búsqueda:', conversacion ? `Encontrada: ${conversacion._id}` : 'No encontrada');

        // Si existe, retornarla
        if (conversacion) {
            console.log('✅ Conversación existente retornada:', conversacion._id);
            return res.json({
                success: true,
                data: conversacion,
                message: 'Conversación existente recuperada'
            });
        }

        // Validar que los usuarios existen
        console.log('🔍 Validando existencia de usuarios...');
        const [usuario1, usuario2] = await Promise.all([
            User.findById(usuario1Id),
            User.findById(usuario2Id)
        ]);

        if (!usuario1 || !usuario2) {
            console.error('❌ Usuarios no encontrados:', { usuario1: !!usuario1, usuario2: !!usuario2 });
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        console.log('🆕 Creando NUEVA conversación...');
        
        // CREAR CONVERSACIÓN
        try {
            conversacion = new Conversacion({
                participantes: participantesOrdenados,
                fecha_creacion: new Date(),
                fecha_actualizacion: new Date()
            });

            console.log('💾 Guardando conversación...');
            await conversacion.save();
            
            await conversacion.populate('participantes', 'nombre username foto_perfil');

            console.log('✅ Nueva conversación creada exitosamente:', conversacion._id);

            return res.json({
                success: true,
                data: conversacion,
                message: 'Nueva conversación creada exitosamente'
            });

        } catch (saveError) {
            console.error('❌ Error guardando conversación:', saveError);
            
            // Si hay error de duplicado, buscar nuevamente
            if (saveError.code === 11000) {
                console.log('🔄 ERROR 11000 - Buscando conversación existente nuevamente...');
                
                const conversacionExistente = await Conversacion.findOne({
                    $and: [
                        { participantes: { $size: 2 } },
                        { participantes: { $all: participantesOrdenados } }
                    ]
                })
                .populate('participantes', 'nombre username foto_perfil')
                .populate('ultimo_mensaje');
                
                if (conversacionExistente) {
                    console.log('✅ Conversación encontrada después del error 11000:', conversacionExistente._id);
                    return res.json({
                        success: true,
                        data: conversacionExistente,
                        message: 'Conversación recuperada después de error de duplicado'
                    });
                }
            }
            
            throw saveError;
        }

    } catch (error) {
        console.error('❌ Error general creando conversación:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// ENVIAR mensaje
router.post('/mensaje/enviar', async (req, res) => {
    try {
        const { conversacionId, remitenteId, contenido } = req.body;

        if (!contenido || contenido.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje no puede estar vacío'
            });
        }

        if (contenido.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje no puede tener más de 150 caracteres'
            });
        }

        // Obtener la conversación para encontrar el receptor
        const conversacion = await Conversacion.findById(conversacionId);
        if (!conversacion) {
            return res.status(404).json({
                success: false,
                error: 'Conversación no encontrada'
            });
        }

        // Encontrar el receptor (el que NO es el remitente)
        const receptorId = conversacion.participantes.find(
            participant => participant.toString() !== remitenteId
        );

        console.log('🔍 Buscando receptor:', {
            conversacionId,
            remitenteId,
            participantes: conversacion.participantes,
            receptorEncontrado: receptorId
        });

        // Crear mensaje
        const mensaje = new Message({
            conversacion: conversacionId,
            remitente: remitenteId,
            contenido: contenido.trim()
        });

        await mensaje.save();

        // ✅ CREAR NOTIFICACIÓN DE MENSAJE - AGREGAR ESTE BLOQUE
        if (receptorId) {
            try {
                // Verificar bloqueos mutuos antes de crear notificación
                const receptor = await User.findById(receptorId);
                const remitente = await User.findById(remitenteId);

                const estaBloqueado = receptor.usuarios_bloqueados.includes(remitenteId);
                const loHeBloqueado = remitente.usuarios_bloqueados.includes(receptorId);

                if (!estaBloqueado && !loHeBloqueado) {
                    const notification = new Notification({
                        usuario: receptorId,
                        emisor: remitenteId,
                        tipo: 'message',
                        comentario: contenido.substring(0, 100) // Preview del mensaje
                    });
                    await notification.save();
                    
                    console.log(`📨 Notificación de mensaje creada para: ${receptorId}`);
                    console.log(`👤 De: ${remitenteId} -> Para: ${receptorId}`);
                } else {
                    console.log(`🚫 No se creó notificación - Bloqueo detectado:`, {
                        estaBloqueado,
                        loHeBloqueado
                    });
                }
            } catch (notifError) {
                console.error('❌ Error creando notificación:', notifError);
                // No fallar el envío del mensaje por error en notificación
            }
        }

        // Actualizar última mensaje en conversación
        await Conversacion.findByIdAndUpdate(conversacionId, {
            ultimo_mensaje: mensaje._id,
            fecha_actualizacion: Date.now()
        });

        // Populate para enviar datos completos
        await mensaje.populate('remitente', 'nombre username foto_perfil');

        res.json({
            success: true,
            data: mensaje
        });
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/usuarios-disponibles/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const usuario = await User.findById(userId)
            .populate('seguidos', 'nombre username foto_perfil seguidores');

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        console.log('👤 Usuario actual seguidos:', usuario.seguidos.length);
        
        // FILTRO CORREGIDO: Verificar que el seguido también te tiene como seguidor
        const usuariosDisponibles = usuario.seguidos.filter(seguido => {
            const teSigue = seguido.seguidores.includes(userId); // ✅ CORREGIDO
            console.log(`🔍 ${seguido.nombre} te sigue:`, teSigue);
            return teSigue;
        });

        console.log('✅ Usuarios disponibles para chat:', usuariosDisponibles.length);

        res.json({
            success: true,
            data: usuariosDisponibles
        });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios disponibles:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// MARCAR mensajes como leídos
router.post('/mensajes/marcar-leidos', async (req, res) => {
    try {
        const { conversacionId, userId } = req.body;

        await Message.updateMany(
            { 
                conversacion: conversacionId, 
                remitente: { $ne: userId },
                leido: false 
            },
            { leido: true }
        );

        res.json({
            success: true,
            message: 'Mensajes marcados como leídos'
        });
    } catch (error) {
        console.error('❌ Error marcando mensajes como leídos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;