// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/red-social-kiond');
    console.log('✅ MongoDB LOCAL conectado exitosamente');
    console.log('📊 Base de datos:', mongoose.connection.name);
    console.log('🏠 Host:', mongoose.connection.host);
  } catch (error) {
    console.error('❌ Error conectando a MongoDB local:', error);
    process.exit(1);
  }
};

module.exports = connectDB;