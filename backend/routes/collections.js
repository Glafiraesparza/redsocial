const express = require('express');
const Collection = require('../models/Collection');
const Post = require('../models/Post');
const router = express.Router();

// CREATE - Crear nueva colección
router.post('/', async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      usuario, 
      tipo, 
      foto_portada, 
      icono, 
      color, 
      etiquetas 
    } = req.body;

    if (!nombre || !usuario) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y usuario son requeridos'
      });
    }

    const coleccion = new Collection({
      nombre,
      descripcion: descripcion || '',
      usuario,
      tipo: tipo || 'publica',
      foto_portada: foto_portada || '',
      icono: icono || 'fas fa-folder',
      color: color || '#3498db',
      etiquetas: etiquetas || [],
      posts: []
    });

    await coleccion.save();
    
    // Popular datos del usuario
    await coleccion.populate('usuario', 'nombre username foto_perfil');

    res.status(201).json({
      success: true,
      data: coleccion,
      message: 'Colección creada exitosamente'
    });
  } catch (error) {
    console.error('Error creando colección:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener todas las colecciones de un usuario
router.get('/usuario/:userId', async (req, res) => {
  try {
    const colecciones = await Collection.find({ usuario: req.params.userId })
      .populate('usuario', 'nombre username foto_perfil')
      .populate('posts')
      .sort({ fecha_actualizacion: -1 });

    res.json({
      success: true,
      data: colecciones
    });
  } catch (error) {
    console.error('Error obteniendo colecciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener colecciones PÚBLICAS de un usuario específico
router.get('/user/:userId/public', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Buscando colecciones públicas del usuario:', userId);

    const colecciones = await Collection.find({ 
      usuario: userId, 
      tipo: 'publica' 
    })
    .populate('usuario', 'nombre username foto_perfil')
    .populate({
      path: 'posts',
      populate: {
        path: 'autor',
        select: 'nombre username foto_perfil'
      }
    })
    .sort({ fecha_actualizacion: -1 });

    console.log(`✅ Encontradas ${colecciones.length} colecciones públicas para usuario ${userId}`);

    res.json({
      success: true,
      data: colecciones
    });
  } catch (error) {
    console.error('❌ Error obteniendo colecciones públicas del usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener colección pública por ID (para otros usuarios)
router.get('/:id/public', async (req, res) => {
  try {
    const coleccion = await Collection.findOne({ 
      _id: req.params.id, 
      tipo: 'publica' 
    })
    .populate('usuario', 'nombre username foto_perfil')
    .populate({
      path: 'posts',
      populate: {
        path: 'autor',
        select: 'nombre username foto_perfil'
      }
    });

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada o no es pública'
      });
    }

    res.json({
      success: true,
      data: coleccion
    });
  } catch (error) {
    console.error('Error obteniendo colección pública:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener colección por ID con posts completos
router.get('/:id', async (req, res) => {
  try {
    const coleccion = await Collection.findById(req.params.id)
      .populate('usuario', 'nombre username foto_perfil')
      .populate({
        path: 'posts',
        populate: {
          path: 'autor',
          select: 'nombre username foto_perfil'
        }
      });

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    res.json({
      success: true,
      data: coleccion
    });
  } catch (error) {
    console.error('Error obteniendo colección:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Agregar múltiples posts a colección
router.post('/:id/posts', async (req, res) => {
  try {
    const { postIds } = req.body;
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de postIds'
      });
    }

    const coleccion = await Collection.findById(req.params.id);
    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    // Verificar que todos los posts existen
    const posts = await Post.find({ _id: { $in: postIds } });
    if (posts.length !== postIds.length) {
      return res.status(404).json({
        success: false,
        error: 'Uno o más posts no existen'
      });
    }

    // Filtrar posts que no estén ya en la colección
    const existingPostIds = coleccion.posts.map(post => post.toString());
    const newPostIds = postIds.filter(postId => !existingPostIds.includes(postId));

    if (newPostIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Todos los posts seleccionados ya están en la colección'
      });
    }

    // Agregar nuevos posts a la colección
    coleccion.posts.push(...newPostIds);
    coleccion.fecha_actualizacion = new Date();
    await coleccion.save();

    // Actualizar los posts para referenciar la colección
    await Post.updateMany(
      { _id: { $in: newPostIds } },
      { $set: { coleccion: coleccion._id } }
    );

    // Popular los datos completos de la colección actualizada
    await coleccion.populate({
      path: 'posts',
      populate: {
        path: 'autor',
        select: 'nombre username foto_perfil'
      }
    });

    res.json({
      success: true,
      data: coleccion,
      message: `Se agregaron ${newPostIds.length} posts a la colección`,
      addedCount: newPostIds.length
    });
  } catch (error) {
    console.error('Error agregando posts a colección:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Remover post de colección
router.delete('/:id/posts/:postId', async (req, res) => {
  try {
    const coleccion = await Collection.findById(req.params.id);
    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    // Verificar si el post existe en la colección
    const postIndex = coleccion.posts.findIndex(
      post => post.toString() === req.params.postId
    );

    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'El post no está en esta colección'
      });
    }

    // Remover el post de la colección
    coleccion.posts.splice(postIndex, 1);
    coleccion.fecha_actualizacion = new Date();
    await coleccion.save();

    // Remover referencia de colección del post
    await Post.findByIdAndUpdate(req.params.postId, {
      $unset: { coleccion: "" }
    });

    // Popular los datos actualizados
    await coleccion.populate({
      path: 'posts',
      populate: {
        path: 'autor',
        select: 'nombre username foto_perfil'
      }
    });

    res.json({
      success: true,
      data: coleccion,
      message: 'Post removido de la colección'
    });
  } catch (error) {
    console.error('Error removiendo post de colección:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Actualizar información de la colección
router.put('/:id', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, foto_portada, icono, color, etiquetas } = req.body;

    const coleccion = await Collection.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(nombre && { nombre }),
          ...(descripcion !== undefined && { descripcion }),
          ...(tipo && { tipo }),
          ...(foto_portada !== undefined && { foto_portada }),
          ...(icono && { icono }),
          ...(color && { color }),
          ...(etiquetas && { etiquetas })
        }
      },
      { new: true, runValidators: true }
    ).populate('usuario', 'nombre username foto_perfil')
     .populate('posts');

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    res.json({
      success: true,
      data: coleccion,
      message: 'Colección actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando colección:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Eliminar colección
router.delete('/:id', async (req, res) => {
  try {
    const coleccion = await Collection.findById(req.params.id);
    
    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    // Remover referencia de colección de todos los posts
    await Post.updateMany(
      { _id: { $in: coleccion.posts } },
      { $unset: { coleccion: "" } }
    );

    await Collection.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Colección eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando colección:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener colecciones públicas de otros usuarios
router.get('/explore/publicas', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const colecciones = await Collection.find({ tipo: 'publica' })
      .populate('usuario', 'nombre username foto_perfil')
      .sort({ fecha_actualizacion: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Collection.countDocuments({ tipo: 'publica' });

    res.json({
      success: true,
      data: colecciones,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo colecciones públicas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;