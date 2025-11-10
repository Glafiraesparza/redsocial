// backend/routes/posts.js
const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const router = express.Router();

// CREATE - Crear publicación
router.post('/', async (req, res) => {
  try {
    const post = new Post(req.body);
    await post.save();
    
    // Popular el autor para la respuesta
    await post.populate('autor', 'username nombre foto_perfil');
    
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener todas las publicaciones (con paginación)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('autor', 'username nombre foto_perfil')
      .populate('likes', 'username nombre')
      .populate('postOriginal')
      .sort({ fecha_publicacion: -1 })
      .skip(skip)
      .limit(limit);

    // Popular posts originales en los shares
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        if (post.tipo === 'share' && post.postOriginal && typeof post.postOriginal === 'object') {
          await post.postOriginal.populate('autor', 'username nombre foto_perfil');
        }
        return post;
      })
    );

    const total = await Post.countDocuments();

    res.json({
      success: true,
      data: populatedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener publicaciones de un usuario específico
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ autor: req.params.userId })
      .populate('autor', 'username nombre foto_perfil')
      .populate('likes', 'username nombre')
      .populate('postOriginal')
      .sort({ fecha_publicacion: -1 });

    // Popular posts originales en los shares
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        if (post.tipo === 'share' && post.postOriginal && typeof post.postOriginal === 'object') {
          await post.postOriginal.populate('autor', 'username nombre foto_perfil');
        }
        return post;
      })
    );

    res.json({
      success: true,
      data: populatedPosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener publicaciones de usuarios seguidos (FEED MEJORADO)
// READ - Obtener publicaciones de usuarios seguidos (FEED MEJORADO)
router.get('/feed/:userId', async (req, res) => {
  try {
    console.log('📥 Solicitando feed para usuario:', req.params.userId);
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log('✅ Usuario encontrado:', user.nombre);
    
    // Verificar qué campos tiene el usuario
    console.log('📋 Campos del usuario:', Object.keys(user._doc));
    
    // Usar el campo correcto para usuarios seguidos
    // Si no existe 'seguidos', usar un array vacío
    const usersSeguidos = user.seguidos || user.following || user.siguiendo || [];
    console.log('👥 Usuarios seguidos:', usersSeguidos.length);

    const posts = await Post.find({
      $or: [
        { autor: { $in: [...usersSeguidos, user._id] } }, // Posts originales de seguidos + propios
        { 
          tipo: 'share', 
          autor: { $in: [...usersSeguidos, user._id] } // Shares de seguidos + propios
        }
      ]
    })
      .populate('autor', 'username nombre foto_perfil')
      .populate('likes', 'username nombre')
      .populate('postOriginal')
      .sort({ fecha_publicacion: -1 })
      .limit(20);

    console.log('📝 Posts encontrados:', posts.length);

    // Popular posts originales en los shares
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        if (post.tipo === 'share' && post.postOriginal && typeof post.postOriginal === 'object') {
          await post.postOriginal.populate('autor', 'username nombre foto_perfil');
        }
        return post;
      })
    );

    res.json({
      success: true,
      data: populatedPosts
    });

  } catch (error) {
    console.error('❌ Error obteniendo feed:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// UPDATE - Like/Unlike publicación
router.post('/:postId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    const likeIndex = post.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      // Quitar like
      post.likes.splice(likeIndex, 1);
    } else {
      // Agregar like
      post.likes.push(userId);
    }

    await post.save();
    await post.populate('likes', 'username nombre');

    res.json({
      success: true,
      data: {
        likes: post.likes,
        likesCount: post.likes.length,
        isLiked: likeIndex === -1 // true si acaba de dar like, false si quitó like
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Obtener publicación por ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('autor', 'username nombre foto_perfil')
      .populate('likes', 'username nombre')
      .populate('comentarios.usuario', 'username nombre foto_perfil')
      .populate('postOriginal');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    // Popular post original si es un share
    if (post.tipo === 'share' && post.postOriginal && typeof post.postOriginal === 'object') {
      await post.postOriginal.populate('autor', 'username nombre foto_perfil');
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// COMENTARIOS - Agregar comentario a una publicación
router.post('/:postId/comentarios', async (req, res) => {
  try {
    const { usuario, contenido } = req.body;
    
    if (!usuario || !contenido) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contenido son requeridos'
      });
    }

    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    const nuevoComentario = {
      usuario,
      contenido,
      fecha: new Date()
    };

    post.comentarios.push(nuevoComentario);
    await post.save();

    // Popular la información del usuario en el comentario
    await post.populate('comentarios.usuario', 'username nombre foto_perfil');

    const comentarioAgregado = post.comentarios[post.comentarios.length - 1];

    res.status(201).json({
      success: true,
      data: comentarioAgregado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// COMENTARIOS - Obtener comentarios de una publicación
router.get('/:postId/comentarios', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('comentarios.usuario', 'username nombre foto_perfil')
      .select('comentarios');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    res.json({
      success: true,
      data: post.comentarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== RUTAS DE SHARES ==========

// SHARE - Compartir una publicación
router.post('/:id/share', async (req, res) => {
  try {
    const { userId } = req.body;
    const postId = req.params.id;

    // Verificar si el post existe
    const postOriginal = await Post.findById(postId).populate('autor', 'nombre username');
    if (!postOriginal) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    // Verificar si el usuario ya compartió este post
    const alreadyShared = postOriginal.shares.some(share => 
      share.usuario.toString() === userId
    );

    if (alreadyShared) {
      return res.status(400).json({
        success: false,
        error: 'Ya compartiste esta publicación'
      });
    }

    // Agregar el share al post original
    postOriginal.shares.push({
      usuario: userId,
      fecha: new Date()
    });

    await postOriginal.save();

    // Crear nueva publicación como share
    const sharedPost = new Post({
      autor: userId,
      contenido: ` `,
      tipo: 'share',
      postOriginal: postId,
      fecha_publicacion: new Date()
    });

    await sharedPost.save();
    
    // Popular el post compartido para enviar datos completos
    await sharedPost.populate('autor', 'username nombre foto_perfil');
    await sharedPost.populate('postOriginal');

    res.json({ 
      success: true, 
      data: {
        sharesCount: postOriginal.shares.length,
        sharedPost: sharedPost
      }
    });

  } catch (error) {
    console.error('Error compartiendo publicación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// SHARES - Obtener shares de una publicación
router.get('/:id/shares', async (req, res) => {
  try {
    const postId = req.params.id;
    
    const post = await Post.findById(postId).populate('shares.usuario', 'nombre username foto_perfil');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    res.json({ 
      success: true, 
      data: post.shares 
    });

  } catch (error) {
    console.error('Error obteniendo shares:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// SHARES - Obtener cantidad de shares de una publicación
router.get('/:id/shares/count', async (req, res) => {
  try {
    const postId = req.params.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    res.json({ 
      success: true, 
      data: {
        sharesCount: post.shares.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo contador de shares:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE - Eliminar publicación (solo el autor puede eliminar)
router.delete('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body; // ID del usuario que intenta eliminar

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    // Verificar que el usuario es el autor del post
    if (post.autor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar esta publicación'
      });
    }

    // Eliminar el post
    await Post.findByIdAndDelete(postId);

    // Si es un post compartido, eliminar la referencia en el post original
    if (post.tipo === 'share' && post.postOriginal) {
      await Post.findByIdAndUpdate(post.postOriginal, {
        $pull: { shares: { usuario: userId } }
      });
    }

    res.json({
      success: true,
      message: 'Publicación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando publicación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// UPDATE - Editar publicación (solo el autor puede editar)
router.put('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId, contenido, imagen } = req.body;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    // Verificar que el usuario es el autor del post
    if (post.autor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar esta publicación'
      });
    }

    // No permitir editar posts compartidos
    if (post.tipo === 'share') {
      return res.status(400).json({
        success: false,
        error: 'No se pueden editar publicaciones compartidas'
      });
    }

    // Actualizar el post
    post.contenido = contenido || post.contenido;
    post.imagen = imagen !== undefined ? imagen : post.imagen;
    post.fecha_publicacion = new Date(); // Actualizar fecha de modificación

    await post.save();
    
    // Popular el autor para la respuesta
    await post.populate('autor', 'username nombre foto_perfil');
    await post.populate('likes', 'username nombre');

    res.json({
      success: true,
      data: post,
      message: 'Publicación actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error editando publicación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;