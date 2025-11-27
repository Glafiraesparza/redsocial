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

// 🔥 ÍNDICE MEJORADO - Solo hacer único cuando hay 2 participantes diferentes
conversacionSchema.index({ 
    participantes: 1 
}, { 
    unique: true,
    partialFilterExpression: { 
        $expr: { 
            $and: [
                { $eq: [{ $size: "$participantes" }, 2] },
                { $ne: [{ $arrayElemAt: ["$participantes", 0] }, { $arrayElemAt: ["$participantes", 1] }] }
            ]
        }
    },
    name: 'participantes_unique_idx'
});

// MIDDLEWARE MEJORADO CON MÁS LOGS
conversacionSchema.pre('save', function(next) {
    console.log('🔍 [CONVERSACION] Validando conversación con participantes:', this.participantes);
    console.log('🔍 [CONVERSACION] Número de participantes:', this.participantes ? this.participantes.length : 0);
    
    // Validar que hay exactamente 2 participantes
    if (!this.participantes || this.participantes.length !== 2) {
        console.error('❌ [CONVERSACION] Error: Debe haber exactamente 2 participantes');
        return next(new Error('Debe haber exactamente 2 participantes'));
    }
    
    // Convertir a string para comparación
    const participant1 = this.participantes[0].toString();
    const participant2 = this.participantes[1].toString();
    
    console.log('🔍 [CONVERSACION] Participante 1:', participant1);
    console.log('🔍 [CONVERSACION] Participante 2:', participant2);
    
    // Validar que los participantes son diferentes
    if (participant1 === participant2) {
        console.error('❌ [CONVERSACION] Error: Los participantes deben ser diferentes');
        return next(new Error('Los participantes deben ser diferentes'));
    }
    
    // 🔥 ORDENAR CONSISTENTEMENTE
    this.participantes = [participant1, participant2].sort((a, b) => a.localeCompare(b));
    
    console.log('✅ [CONVERSACION] Participantes ordenados:', this.participantes);
    
    this.fecha_actualizacion = Date.now();
    next();
});

module.exports = mongoose.model('Conversacion', conversacionSchema);