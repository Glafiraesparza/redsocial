// backend/routes/profile.js
const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const router = express.Router();

// Obtener perfil de usuario
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password') // Excluir contraseña
            .populate('seguidores', 'nombre username foto_perfil')
            .populate('seguidos', 'nombre username foto_perfil');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Obtener publicaciones del usuario
        const posts = await Post.find({ autor: req.params.userId })
            .populate('autor', 'nombre username foto_perfil')
            .populate('likes', 'username nombre')
            .populate('postOriginal')
            .sort({ fecha_publicacion: -1 });

        res.json({
            success: true,
            data: {
                usuario: user,
                publicaciones: posts
            }
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Actualizar perfil
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            nombre, 
            biografia, 
            intereses, 
            ubicacion, 
            fecha_nacimiento, 
            genero,
            foto_perfil,
            foto_portada 
        } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                nombre,
                biografia,
                intereses,
                ubicacion,
                fecha_nacimiento,
                genero,
                ...(foto_perfil && { foto_perfil }),
                ...(foto_portada && { foto_portada })
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'Perfil actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Agregar/actualizar foto de perfil
router.put('/:userId/foto-perfil', async (req, res) => {
    try {
        const { userId } = req.params;
        const { fotoUrl } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { foto_perfil: fotoUrl },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            data: user,
            message: 'Foto de perfil actualizada'
        });

    } catch (error) {
        console.error('Error actualizando foto de perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Agregar foto al carrusel de portada
router.post('/:userId/portada', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fotoUrl } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Si es la primera foto, también establecer como portada principal
    if (!user.foto_portada) {
      user.foto_portada = fotoUrl;
    }

    // Agregar al array de fotos de portada
    if (!user.fotos_portada) {
      user.fotos_portada = [];
    }
    
    user.fotos_portada.push(fotoUrl);
    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Foto agregada al carrusel de portada'
    });

  } catch (error) {
    console.error('Error agregando foto de portada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Eliminar foto del carrusel de portada
router.delete('/:userId/portada/:index', async (req, res) => {
  try {
    const { userId, index } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!user.fotos_portada || user.fotos_portada.length <= index) {
      return res.status(404).json({
        success: false,
        error: 'Foto no encontrada'
      });
    }

    // Remover la foto del array
    user.fotos_portada.splice(index, 1);
    
    // Si era la foto principal, establecer la primera disponible como principal
    if (user.fotos_portada.length > 0 && !user.fotos_portada.includes(user.foto_portada)) {
      user.foto_portada = user.fotos_portada[0];
    } else if (user.fotos_portada.length === 0) {
      user.foto_portada = '';
    }

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Foto eliminada del carrusel'
    });

  } catch (error) {
    console.error('Error eliminando foto de portada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Establecer foto principal de portada
router.put('/:userId/portada/principal/:index', async (req, res) => {
  try {
    const { userId, index } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!user.fotos_portada || user.fotos_portada.length <= index) {
      return res.status(404).json({
        success: false,
        error: 'Foto no encontrada'
      });
    }

    user.foto_portada = user.fotos_portada[index];
    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Foto principal actualizada'
    });

  } catch (error) {
    console.error('Error estableciendo foto principal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Agregar/actualizar foto de portada
router.put('/:userId/foto-portada', async (req, res) => {
    try {
        const { userId } = req.params;
        const { fotoUrl } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { foto_portada: fotoUrl },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            data: user,
            message: 'Foto de portada actualizada'
        });

    } catch (error) {
        console.error('Error actualizando foto de portada:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener lista de intereses predefinidos (extraídos del modelo)
router.get('/intereses/lista', async (req, res) => {
    try {
        // Extraer la lista de intereses del schema de User
        const interesesSchema = User.schema.path('intereses');
        const interesesDisponibles = interesesSchema.caster.enumValues || [
            'Tecnología', 'Ciencia', 'Arte', 'Música', 'Cine', 'Deportes',
            'Videojuegos', 'Lectura', 'Cocina', 'Viajes', 'Fotografía',
            'Programación', 'Diseño', 'Moda', 'Belleza', 'Salud',
            'Fitness', 'Negocios', 'Finanzas', 'Educación', 'Política',
            'Medio Ambiente', 'Animales', 'Jardinería', 'Manualidades',
            'Cultura', 'Historia', 'Filosofía', 'Astronomía', 'Matemáticas'
        ];

        res.json({
            success: true,
            data: interesesDisponibles
        });
    } catch (error) {
        console.error('Error obteniendo intereses:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Buscar usuarios por intereses (para futura funcionalidad de amigos)
router.get('/intereses/comunes/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Buscar usuarios con intereses similares (excluyendo al usuario actual)
        const usuariosSimilares = await User.find({
            _id: { $ne: user._id },
            intereses: { $in: user.intereses }
        })
        .select('nombre username foto_perfil intereses seguidores')
        .limit(10);

        // Calcular porcentaje de similitud
        const usuariosConSimilitud = usuariosSimilares.map(usuario => {
            const interesesComunes = usuario.intereses.filter(interes => 
                user.intereses.includes(interes)
            );
            const porcentajeSimilitud = user.intereses.length > 0 ? 
                (interesesComunes.length / user.intereses.length) * 100 : 0;
            
            return {
                ...usuario.toObject(),
                interesesComunes,
                porcentajeSimilitud: Math.round(porcentajeSimilitud)
            };
        });

        // Ordenar por mayor similitud
        usuariosConSimilitud.sort((a, b) => b.porcentajeSimilitud - a.porcentajeSimilitud);

        res.json({
            success: true,
            data: usuariosConSimilitud
        });

    } catch (error) {
        console.error('Error buscando usuarios similares:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;