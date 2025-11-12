const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  foto_perfil: {
    type: String,
    default: ''
  },
  foto_portada: {
    type: String,
    default: ''
  },
  fotos_portada: [{
    type: String,
    default: ''
  }],
  biografia: {
    type: String,
    default: '',
    maxlength: 500
  },
  intereses: [{
    type: String,
    trim: true,
    enum: [
      'Tecnología', 'Ciencia', 'Arte', 'Música', 'Cine', 'Deportes',
      'Videojuegos', 'Lectura', 'Cocina', 'Viajes', 'Fotografía',
      'Programación', 'Diseño', 'Moda', 'Belleza', 'Salud',
      'Fitness', 'Negocios', 'Finanzas', 'Educación', 'Política',
      'Medio Ambiente', 'Animales', 'Jardinería', 'Manualidades',
      'Cultura', 'Historia', 'Filosofía', 'Astronomía', 'Matemáticas'
    ]
  }],
  ubicacion: {
    type: String,
    default: ''
  },
  fecha_nacimiento: {
    type: Date,
    default: null
  },
  genero: {
    type: String,
    enum: ['masculino', 'femenino', 'otro', 'prefiero_no_decir'],
    default: 'prefiero_no_decir'
  },
  // CORREGIDO: seguidores estaba duplicado
  seguidores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  seguidos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  usuarios_bloqueados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bloqueado_por: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Opcional: agregar configuración de privacidad para el futuro
  configuracion: {
    perfil_privado: {
      type: Boolean,
      default: false
    },
    mensajes_privados: {
      type: String,
      enum: ['todos', 'seguidos', 'nadie'],
      default: 'todos'
    },
    mostrar_fecha_nacimiento: {
      type: Boolean,
      default: true
    },
    mostrar_email: {
      type: Boolean,
      default: false
    }
  },
  fecha_registro: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);