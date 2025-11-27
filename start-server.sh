#!/bin/bash
echo "🚀 Iniciando Red Social Kion-D..."

# Verificar si estamos en la carpeta correcta
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Debes ejecutar este script desde la carpeta principal del proyecto"
    exit 1
fi

# Configurar firewall (agregar esta parte)
echo "🔓 Configurando firewall..."
sudo pfctl -a com.apple/250.KionSocial -f - <<EOF 2>/dev/null
pass in proto tcp from any to any port 3001
pass in proto tcp from any to any port 27017
EOF

# Obtener IP local (agregar esta parte)
IP=$(ipconfig getifaddr en0)
echo "📍 Tu IP local: $IP"

# Navegar al backend
cd backend

# Verificar si package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json en la carpeta backend"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    npm install
fi

# Verificar si MongoDB está corriendo (versión mejorada)
echo "🗄️  Verificando MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB no está corriendo. Iniciando MongoDB..."
    
    # Intentar con Homebrew primero
    if brew services start mongodb/brew/mongodb-community 2>/dev/null; then
        echo "✅ MongoDB iniciado con Homebrew"
    else
        # Fallback: iniciar manualmente
        echo "🔧 Intentando inicio manual de MongoDB..."
        mkdir -p ~/mongodb/data
        mkdir -p ~/mongodb/logs
        mongod --dbpath ~/mongodb/data --logpath ~/mongodb/logs/mongod.log --fork
    fi
    sleep 5
else
    echo "✅ MongoDB ya está corriendo"
fi

# Verificar conexión a MongoDB (nuevo)
echo "🔍 Verificando conexión a MongoDB..."
if ! mongosh --eval "db.adminCommand('ismaster')" --quiet 2>/dev/null; then
    echo "❌ No se pudo conectar a MongoDB"
    echo "💡 Solución: Ejecuta primero: brew services start mongodb/brew/mongodb-community"
    exit 1
fi

# Información de acceso (nuevo)
echo ""
echo "🎉 ¡Todo listo!"
echo "📡 Backend API: http://localhost:3001/api"
echo "🌐 Frontend: http://localhost:3001"
echo "📱 Para otros dispositivos: http://$IP:3001"
echo ""
echo "⏹️  Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar el servidor
echo "🎯 Iniciando servidor Node.js..."
node server.js