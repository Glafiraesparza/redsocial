// backend/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversacion',
        required: true
    },
    remitente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contenido: {
        type: String,
        required: true,
        maxlength: 150,
        trim: true
    },
    leido: {
        type: Boolean,
        default: false
    },
    fecha_envio: {
        type: Date,
        default: Date.now
    },
    tipo: {
        type: String,
        enum: ['texto'],
        default: 'texto'
    }
});

// Índice para búsquedas eficientes
messageSchema.index({ conversacion: 1, fecha_envio: 1 });

module.exports = mongoose.model('Message', messageSchema);