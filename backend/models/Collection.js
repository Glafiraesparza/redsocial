const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    maxlength: 500,
    default: ''
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['publica', 'privada'],
    default: 'publica'
  },
  foto_portada: {
    type: String,
    default: ''
  },
  icono: {
    type: String,
    default: 'fas fa-folder'
  },
  color: {
    type: String,
    default: '#3498db'
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  etiquetas: [{
    type: String,
    trim: true
  }],
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  fecha_actualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Actualizar fecha_actualizacion cuando se modifique la colección
collectionSchema.pre('save', function(next) {
  this.fecha_actualizacion = Date.now();
  next();
});

// Índices para mejor performance
collectionSchema.index({ usuario: 1, fecha_creacion: -1 });
collectionSchema.index({ etiquetas: 1 });
collectionSchema.index({ tipo: 1 });

module.exports = mongoose.model('Collection', collectionSchema);