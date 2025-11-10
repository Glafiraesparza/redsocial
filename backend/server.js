// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const path = require('path');

// Conectar a la base de datos
connectDB();

const app = express();

// Configuración CORS más permisiva
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 API de Red Social Kion-D funcionando!',
        version: '1.0.0',
        database: 'MongoDB Local'
    });
});

// Rutas - TODAS JUNTAS de la misma manera
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/upload', require('./routes/upload')); 
app.use('/api/profile', require('./routes/profile'));

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada: ' + req.path
    });
});

// ✅ FORZAR PUERTO 3001
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🎯 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🗄️  Base de datos: MongoDB Local`);
});