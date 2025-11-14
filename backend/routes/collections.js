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

// UPDATE - Agregar post a colección
router.post('/:id/posts', async (req, res) => {
  try {
    const { postId } = req.body;
    
    const coleccion = await Collection.findById(req.params.id);
    if (!coleccion) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada'
      });
    }

    // Verificar si el post ya está en la colección
    if (coleccion.posts.includes(postId)) {
      return res.status(400).json({
        success: false,
        error: 'El post ya está en esta colección'
      });
    }

    // Verificar que el post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post no encontrado'
      });
    }

    coleccion.posts.push(postId);
    await coleccion.save();

    // Actualizar el post para referenciar la colección
    post.coleccion = coleccion._id;
    await post.save();

    await coleccion.populate('posts');

    res.json({
      success: true,
      data: coleccion,
      message: 'Post agregado a la colección'
    });
  } catch (error) {
    console.error('Error agregando post a colección:', error);
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

    coleccion.posts = coleccion.posts.filter(
      post => post.toString() !== req.params.postId
    );
    
    await coleccion.save();

    // Remover referencia de colección del post
    await Post.findByIdAndUpdate(req.params.postId, {
      $unset: { coleccion: "" }
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