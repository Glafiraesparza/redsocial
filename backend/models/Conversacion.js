const mongoose = require('mongoose');

const conversacionSchema = new mongoose.Schema({
    participantes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    ultimo_mensaje: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    fecha_creacion: {
        type: Date,
        default: Date.now
    },
    fecha_actualizacion: {
        type: Date,
        default: Date.now
    }
});

// ÍNDICE CORREGIDO - Ordenar participantes para evitar duplicados
conversacionSchema.index({ participantes: 1 }, { 
    unique: true 
});

// Middleware para ordenar participantes antes de guardar
conversacionSchema.pre('save', function(next) {
    // Ordenar los participantes para consistencia
    if (this.participantes && this.participantes.length === 2) {
        this.participantes.sort();
    }
    this.fecha_actualizacion = Date.now();
    next();
});

module.exports = mongoose.model('Conversacion', conversacionSchema);