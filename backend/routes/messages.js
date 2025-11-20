// backend/routes/messages.js
const mongoose = require('mongoose');
const express = require('express');
const Message = require('../models/Message');
const Conversacion = require('../models/Conversacion');
const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

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

// CREAR nueva conversación
router.post('/conversacion/nueva', async (req, res) => {
    try {
        const { usuario1Id, usuario2Id } = req.body;

        console.log('🚀 === NUEVA SOLICITUD DE CONVERSACIÓN ===');
        console.log('Usuario 1:', usuario1Id);
        console.log('Usuario 2:', usuario2Id);

        // 🔥 VALIDACIÓN MEJORADA
        if (!usuario1Id || !usuario2Id) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren ambos IDs de usuario'
            });
        }

        if (usuario1Id === usuario2Id) {
            return res.status(400).json({
                success: false,
                error: 'No puedes crear una conversación contigo mismo'
            });
        }

        // ORDENAR participantes
        const participantesOrdenados = [usuario1Id, usuario2Id].sort();
        console.log('📋 Participantes ordenados:', participantesOrdenados);

        // 🔥 VERIFICAR QUE LOS IDs SON VÁLIDOS
        if (!mongoose.Types.ObjectId.isValid(usuario1Id) || !mongoose.Types.ObjectId.isValid(usuario2Id)) {
            return res.status(400).json({
                success: false,
                error: 'IDs de usuario no válidos'
            });
        }

        // Buscar conversación existente
        let conversacion = await Conversacion.findOne({
            participantes: participantesOrdenados
        }).populate('participantes', 'nombre username foto_perfil')
          .populate('ultimo_mensaje');

        console.log('🔍 Conversación encontrada:', conversacion ? 'SÍ' : 'NO');

        // Si existe, retornarla
        if (conversacion) {
            console.log('✅ Conversación existente retornada:', conversacion._id);
            return res.json({
                success: true,
                data: conversacion,
                message: 'Conversación existente'
            });
        }

        // Validar usuarios y seguimiento
        console.log('🆕 Validando usuarios para nueva conversación...');
        
        const [usuario1, usuario2] = await Promise.all([
            User.findById(usuario1Id),
            User.findById(usuario2Id)
        ]);

        if (!usuario1 || !usuario2) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar seguimiento mutuo
        const usuario1SigueA2 = usuario1.seguidos.includes(usuario2Id);
        const usuario2SigueA1 = usuario2.seguidores.includes(usuario1Id);

        console.log(`🔍 Seguimiento: ${usuario1.nombre} sigue a ${usuario2.nombre}:`, usuario1SigueA2);
        console.log(`🔍 Seguimiento: ${usuario2.nombre} sigue a ${usuario1.nombre}:`, usuario2SigueA1);

        if (!usuario1SigueA2 || !usuario2SigueA1) {
            return res.status(403).json({
                success: false,
                error: 'Solo puedes chatear con usuarios que te siguen y tú sigues'
            });
        }

        // 🔥 CREAR CONVERSACIÓN CON VALIDACIÓN EXPLÍCITA
        console.log('🆕 Creando NUEVA conversación...');
        
        // Verificar explícitamente que tenemos 2 participantes válidos
        if (participantesOrdenados.length !== 2) {
            throw new Error('Array de participantes no tiene 2 elementos');
        }

        try {
            conversacion = new Conversacion({
                participantes: participantesOrdenados,
                fecha_creacion: new Date(),
                fecha_actualizacion: new Date()
            });

            // 🔥 VALIDAR ANTES DE GUARDAR
            const validationError = conversacion.validateSync();
            if (validationError) {
                console.error('❌ Error de validación:', validationError);
                throw validationError;
            }

            await conversacion.save();
            
            // Populate después de guardar
            await conversacion.populate('participantes', 'nombre username foto_perfil');

            console.log('✅ Nueva conversación creada:', conversacion._id);
            console.log('📊 Participantes finales:', conversacion.participantes.map(p => p._id));

            res.json({
                success: true,
                data: conversacion,
                message: 'Nueva conversación creada'
            });

        } catch (error) {
            // Manejar error de duplicado
            if (error.code === 11000) {
                console.log('🔄 Conversación creada simultáneamente, buscando...');
                
                const conversacionExistente = await Conversacion.findOne({
                    participantes: participantesOrdenados
                }).populate('participantes', 'nombre username foto_perfil')
                  .populate('ultimo_mensaje');
                
                if (conversacionExistente) {
                    return res.json({
                        success: true,
                        data: conversacionExistente,
                        message: 'Conversación creada simultáneamente'
                    });
                }
            }
            
            // 🔥 MANEJO ESPECÍFICO DE ERROR DE VALIDACIÓN
            if (error.message.includes('Debe haber exactamente 2 participantes')) {
                console.error('❌ Error de validación de participantes:', participantesOrdenados);
                return res.status(400).json({
                    success: false,
                    error: 'Error en los datos de participantes: ' + error.message
                });
            }
            
            throw error;
        }

    } catch (error) {
        console.error('❌ Error creando conversación:', error);
        
        if (error.code === 11000) {
            console.log('🔄 Error de duplicado, buscando conversación existente...');
            
            const participantesOrdenados = [req.body.usuario1Id, req.body.usuario2Id].sort();
            const conversacionExistente = await Conversacion.findOne({
                participantes: participantesOrdenados
            }).populate('participantes', 'nombre username foto_perfil');
            
            if (conversacionExistente) {
                return res.json({
                    success: true,
                    data: conversacionExistente,
                    message: 'Conversación ya existente (recuperada)'
                });
            }
        }
        
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

// OBTENER usuarios disponibles para chat (seguimiento mutuo)
// OBTENER usuarios disponibles para chat (seguimiento mutuo) - CORREGIDO
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