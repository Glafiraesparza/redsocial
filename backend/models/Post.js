// backend/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  autor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contenido: {
    type: String,
    required: false, // CAMBIAR de true a false
    maxlength: 1000,
    default: '' // Agregar valor por defecto
  },
  imagen: {
    type: String,
    default: ''
  },
  imagenFilename: {
    type: String,
    default: ''
  },
  audio: {
    type: String,
    default: ''
  },
  audioFilename: {
    type: String,
    default: ''
  },
  video: {
    type: String,
    default: ''
  },
  videoFilename: {
    type: String,
    default: ''
  },
  duracion: {
    type: Number,
    default: 0
  },
  tipoContenido: {
    type: String,
    enum: ['texto', 'imagen', 'audio', 'video'],
    default: 'texto'
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comentarios: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contenido: {
      type: String,
      required: true,
      maxlength: 500
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  tipo: {
    type: String,
    enum: ['original', 'share'],
    default: 'original'
  },
  postOriginal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  coleccion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  },
  fecha_publicacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// MODIFICAR el pre-save para validación condicional
postSchema.pre('save', function(next) {
  // Validar que haya al menos contenido o algún medio
  if (!this.contenido && !this.imagen && !this.audio && !this.video) {
    return next(new Error('El post debe tener contenido textual o un archivo multimedia'));
  }
  
  // Extraer hashtags solo si hay contenido
  if (this.contenido) {
    const hashtags = this.contenido.match(/#[\wáéíóúñ]+/g) || [];
    this.hashtags = hashtags.map(tag => tag.toLowerCase().slice(1));
  } else {
    this.hashtags = [];
  }
  
  // Determinar automáticamente el tipo de contenido
  if (this.video && this.video !== '') {
    this.tipoContenido = 'video';
  } else if (this.audio && this.audio !== '') {
    this.tipoContenido = 'audio';
  } else if (this.imagen && this.imagen !== '') {
    this.tipoContenido = 'imagen';
  } else {
    this.tipoContenido = 'texto';
  }
  
  next();
});

// Método para popular el post con datos del autor
postSchema.methods.popularPost = async function() {
  await this.populate('autor', 'nombre username foto_perfil');
  await this.populate('comentarios.usuario', 'nombre username foto_perfil');
  await this.populate('shares.usuario', 'nombre username foto_perfil');
  await this.populate('postOriginal');
  
  // Si es un share y el postOriginal está poblado, popularlo también
  if (this.tipo === 'share' && this.postOriginal && typeof this.postOriginal === 'object') {
    await this.postOriginal.populate('autor', 'nombre username foto_perfil');
  }
  
  return this;
};

// Índices para mejor performance
postSchema.index({ autor: 1, fecha_publicacion: -1 });
postSchema.index({ tipo: 1, postOriginal: 1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ tipoContenido: 1 }); // Nuevo índice

module.exports = mongoose.model('Post', postSchema);