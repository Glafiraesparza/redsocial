// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const path = require('path');

// Conectar a la base de datos
connectDB();

const app = express();

// Configuración CORS para acceso externo
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================================================
// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
// ================================================
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta de prueba de API
app.get('/api', (req, res) => {
    res.json({ 
        message: '🚀 API de Red Social Kion-D funcionando!',
        version: '1.0.0',
        database: 'MongoDB Local',
        features: 'Texto, Imágenes, Audio y Video',
        status: 'ONLINE'
    });
});

// Rutas de API
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/upload', require('./routes/upload')); 
app.use('/api/profile', require('./routes/profile'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/notifications', require('./routes/notifications'));

// ================================================
// MANEJO DE RUTAS DEL FRONTEND (SPA)
// ================================================
app.get('*', (req, res) => {
    // Si es una ruta de API, devolver 404
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return res.status(404).json({
            success: false,
            error: 'Ruta de API no encontrada: ' + req.path
        });
    }
    
    // Para cualquier otra ruta, servir el frontend (SPA)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🎯 Servidor ejecutándose en http://${HOST}:${PORT}`);
    console.log(`📡 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
    console.log(`🌐 Acceso externo: HABILITADO`);
});