// backend/routes/notifications.js - VERSIÓN CORREGIDA
const express = require('express');
const mongoose = require('mongoose'); // ← ¡AGREGA ESTA LÍNEA!
const Notification = require('../models/Notification');
const router = express.Router();

// backend/routes/notifications.js - AGREGAR ESTA RUTA

// RUTA RAÍZ - GET /api/notifications (sin userId)
router.get('/', async (req, res) => {
  try {
    console.log('🔔 [NOTIFICATIONS] Ruta raíz - Obteniendo notificaciones...');
    
    // Obtener userId del query string o headers
    const userId = req.query.userId || req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere userId'
      });
    }

    console.log('👤 UserID recibido en ruta raíz:', userId);

    // Validar que userId es un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ ID de usuario inválido:', userId);
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('📅 Consultando notificaciones desde:', thirtyDaysAgo);

    const notifications = await Notification.find({ 
      usuario: new mongoose.Types.ObjectId(userId),
      fecha_creacion: { $gte: thirtyDaysAgo }
    })
      .populate('emisor', 'nombre username foto_perfil')
      .populate('post', 'contenido imagen audio video tipoContenido')
      .sort({ fecha_creacion: -1 })
      .limit(50);

    console.log(`📨 Notificaciones encontradas: ${notifications.length}`);

    const total = await Notification.countDocuments({ 
      usuario: new mongoose.Types.ObjectId(userId),
      fecha_creacion: { $gte: thirtyDaysAgo }
    });
    
    const noLeidas = await Notification.countDocuments({ 
      usuario: new mongoose.Types.ObjectId(userId), 
      leida: false,
      fecha_creacion: { $gte: thirtyDaysAgo }
    });

    console.log(`📊 Total: ${total}, No leídas: ${noLeidas}`);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        noLeidas
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones (ruta raíz):', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OBTENER notificaciones del usuario
router.get('/:userId', async (req, res) => {
  try {
    console.log('🔔 [NOTIFICATIONS] Iniciando solicitud...');
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    console.log('👤 UserID recibido:', userId);
    console.log('📋 Limit:', limit);

    // Validar que userId es un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ ID de usuario inválido:', userId);
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('📅 Consultando notificaciones desde:', thirtyDaysAgo);

    const notifications = await Notification.find({ 
      usuario: new mongoose.Types.ObjectId(userId), // ← Usar ObjectId
      fecha_creacion: { $gte: thirtyDaysAgo }
    })
      .populate('emisor', 'nombre username foto_perfil')
      .populate('post', 'contenido imagen audio video tipoContenido')
      .sort({ fecha_creacion: -1 })
      .limit(parseInt(limit));

    console.log(`📨 Notificaciones encontradas: ${notifications.length}`);

    const total = await Notification.countDocuments({ 
      usuario: new mongoose.Types.ObjectId(userId),
      fecha_creacion: { $gte: thirtyDaysAgo }
    });
    
    const noLeidas = await Notification.countDocuments({ 
      usuario: new mongoose.Types.ObjectId(userId), 
      leida: false,
      fecha_creacion: { $gte: thirtyDaysAgo }
    });

    console.log(`📊 Total: ${total}, No leídas: ${noLeidas}`);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        noLeidas
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MARCAR como leída
router.post('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MARCAR TODAS como leídas
router.post('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await Notification.updateMany(
      { 
        usuario: new mongoose.Types.ObjectId(userId), 
        leida: false,
        fecha_creacion: { $gte: thirtyDaysAgo }
      },
      { leida: true }
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });

  } catch (error) {
    console.error('❌ Error marcando todas las notificaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ELIMINAR notificación
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada'
    });

  } catch (error) {
    console.error('❌ Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// LIMPIAR TODAS las notificaciones
router.delete('/:userId/clear-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await Notification.deleteMany({ 
      usuario: new mongoose.Types.ObjectId(userId),
      fecha_creacion: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      message: 'Todas las notificaciones han sido eliminadas'
    });

  } catch (error) {
    console.error('❌ Error eliminando todas las notificaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;