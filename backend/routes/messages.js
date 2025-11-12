// backend/routes/messages.js
const mongoose = require('mongoose');
const express = require('express');
const Message = require('../models/Message');
const Conversacion = require('../models/Conversacion');
const User = require('../models/User');
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

        // Validaciones básicas
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

        // Verificar que los usuarios existen
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

        if (!usuario1SigueA2 || !usuario2SigueA1) {
            return res.status(403).json({
                success: false,
                error: 'Solo puedes chatear con usuarios que te siguen y tú sigues'
            });
        }

        // ORDENAR LOS IDs
        const participantesOrdenados = [usuario1Id, usuario2Id].sort();
        console.log('📋 Participantes ordenados:', participantesOrdenados);

        // BÚSQUEDA SIMPLE PERO EFECTIVA
        let conversacion = await Conversacion.findOne({
            participantes: participantesOrdenados
        });

        console.log('🔍 Conversación encontrada:', conversacion ? 'SÍ' : 'NO');

        // Si no existe, crear nueva con UPSERT (crear o actualizar)
        if (!conversacion) {
            console.log('🆕 Creando NUEVA conversación...');
            
            // Usar findOneAndUpdate con upsert para evitar race conditions
            conversacion = await Conversacion.findOneAndUpdate(
                { participantes: participantesOrdenados },
                { 
                    $setOnInsert: { 
                        participantes: participantesOrdenados,
                        fecha_creacion: new Date()
                    }
                },
                { 
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
            
            console.log('✅ Conversación procesada:', conversacion._id);
        }

        // Popular datos para respuesta
        await conversacion.populate('participantes', 'nombre username foto_perfil');
        if (conversacion.ultimo_mensaje) {
            await conversacion.populate('ultimo_mensaje');
        }

        console.log('🎯 Conversación final enviada:', conversacion._id);

        res.json({
            success: true,
            data: conversacion,
            message: conversacion.ultimo_mensaje ? 'Conversación encontrada' : 'Nueva conversación creada'
        });

    } catch (error) {
        console.error('❌ Error creando conversación:', error);
        
        // Manejar error de duplicado (aunque upsert debería prevenirlo)
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
                    message: 'Conversación ya existente'
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

        // Crear mensaje
        const mensaje = new Message({
            conversacion: conversacionId,
            remitente: remitenteId,
            contenido: contenido.trim()
        });

        await mensaje.save();

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