// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['like', 'comment', 'follow', 'share', 'message'],
    required: true
  },
  emisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  conversacion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversacion',
    default: null
  },
  comentario: {
    type: String,
    default: ''
  },
  leida: {
    type: Boolean,
    default: false
  },
  expiracion: {
    type: Date,
    default: function() {
      // Las notificaciones expiran después de 30 días
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejor performance
notificationSchema.index({ usuario: 1, leida: 1 });
notificationSchema.index({ fecha_creacion: -1 });
notificationSchema.index({ expiracion: 1 }, { expireAfterSeconds: 0 });

// Middleware para limpiar notificaciones expiradas automáticamente
notificationSchema.pre('find', function() {
  this.where({ expiracion: { $gt: new Date() } });
});

module.exports = mongoose.model('Notification', notificationSchema);