const mongoose = require('mongoose');

const conversacionSchema = new mongoose.Schema({
    participantes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
        // 🔥 REMOVER LA VALIDACIÓN QUE CAUSA PROBLEMAS
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

// Índice único para prevenir duplicados
conversacionSchema.index({ 
    participantes: 1 
}, { 
    unique: true,
    name: 'participantes_unique_idx'
});

// 🔥 MIDDLEWARE MEJORADO - Validación personalizada
conversacionSchema.pre('save', function(next) {
    // Validar que hay exactamente 2 participantes
    if (!this.participantes || this.participantes.length !== 2) {
        return next(new Error('Debe haber exactamente 2 participantes'));
    }
    
    // Validar que los participantes son diferentes
    if (this.participantes[0].toString() === this.participantes[1].toString()) {
        return next(new Error('Los participantes deben ser diferentes'));
    }
    
    // Ordenar consistentemente
    this.participantes.sort((a, b) => a.toString().localeCompare(b.toString()));
    this.fecha_actualizacion = Date.now();
    next();
});

// Método estático útil
conversacionSchema.statics.findByUsers = function(userId1, userId2) {
    const participantes = [userId1, userId2].sort((a, b) => a.toString().localeCompare(b.toString()));
    return this.findOne({ participantes });
};

module.exports = mongoose.model('Conversacion', conversacionSchema);