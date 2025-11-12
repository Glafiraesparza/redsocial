// backend/routes/posts.js
const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const router = express.Router();

// CREATE - Crear publicación (VERSIÓN ACTUALIZADA PARA MULTIMEDIA)
router.post('/', async (req, res) => {
  try {
    const { 
      autor, 
      contenido, 
      tipoContenido, 
      imagen, 
      audio, 
      video, 
      duracion,
      imagenFilename,
      audioFilename, 
      videoFilename 
    } = req.body;

    // Validar que el contenido no esté vacío si no hay multimedia
    if (!contenido && !imagen && !audio && !video) {
      return res.status(400).json({
        success: false,
        error: 'El contenido no puede estar vacío si no hay archivo multimedia'
      });
    }

    // Crear el objeto del post con todos los campos posibles
    const postData = {
      autor,
      contenido: contenido || '', // Permitir contenido vacío si hay multimedia
      tipoContenido: tipoContenido || 'texto',
      duracion: duracion || 0
    };

    // Agregar campos específicos según el tipo de contenido
    if (imagen) {
      postData.imagen = imagen;
      postData.imagenFilename = imagenFilename || '';
      postData.tipoContenido = 'imagen';
    }

    if (audio) {
      postData.audio = audio;
      postData.audioFilename = audioFilename || '';
      postData.tipoContenido = 'audio';
    }

    if (video) {
      postData.video = video;
      postData.videoFilename = videoFilename || '';
      postData.tipoContenido = 'video';
    }

    console.log('📝 Creando post con datos:', {
      autor: postData.autor,
      tipoContenido: postData.tipoContenido,
      tieneImagen: !!postData.imagen,
      tieneAudio: !!postData.audio,
      tieneVideo: !!postData.video,
      duracion: postData.duracion
    });

    const post = new Post(postData);
    await post.save();
    
    // Popular el autor para la respuesta
    await post.populate('autor', 'username nombre foto_perfil');
    
    console.log('✅ Post creado exitosamente:', {
      id: post._id,
      tipoContenido: post.tipoContenido,
      multimedia: {
        imagen: post.imagen,
        audio: post.audio,
        video: post.video
      }
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('❌ Error creando publicación:', error);
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

    // Log de depuración
    console.log('📥 Posts obtenidos:', posts.length);
    posts.forEach((post, index) => {
      console.log(`📝 Post ${index}:`, {
        id: post._id,
        tipoContenido: post.tipoContenido,
        imagen: post.imagen ? 'SÍ' : 'NO',
        audio: post.audio ? 'SÍ' : 'NO', 
        video: post.video ? 'SÍ' : 'NO',
        contenido: post.contenido?.substring(0, 50) + '...'
      });
    });
    

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

    const usersSeguidos = user.seguidos || [];
    console.log('👥 Usuarios seguidos:', usersSeguidos.length);

    const posts = await Post.find({
      $or: [
        { autor: { $in: [...usersSeguidos, user._id] } },
        { 
          tipo: 'share', 
          autor: { $in: [...usersSeguidos, user._id] }
        }
      ]
    })
      .populate('autor', 'username nombre foto_perfil')
      .populate('likes', 'username nombre')
      .populate('postOriginal')
      .sort({ fecha_publicacion: -1 })
      .limit(20);

    // LOGS DE DEPURACIÓN PARA MULTIMEDIA
    console.log('📝 Posts en feed:', posts.length);
    posts.forEach((post, index) => {
      console.log(`🎵 Post ${index} multimedia:`, {
        tipoContenido: post.tipoContenido,
        audio: post.audio || 'NO',
        video: post.video || 'NO',
        imagen: post.imagen || 'NO'
      });
    });

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

// UPDATE - Editar publicación (VERSIÓN ACTUALIZADA PARA MULTIMEDIA)
router.put('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { 
      userId, 
      contenido, 
      imagen, 
      audio, 
      video, 
      duracion,
      tipoContenido 
    } = req.body;

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

    // Actualizar el post con todos los campos posibles
    post.contenido = contenido !== undefined ? contenido : post.contenido;
    post.tipoContenido = tipoContenido || post.tipoContenido;
    post.duracion = duracion || post.duracion;

    // Manejar campos de multimedia (permitir eliminación estableciendo null o '')
    if (imagen !== undefined) {
      post.imagen = imagen;
      post.imagenFilename = imagen ? (req.body.imagenFilename || '') : '';
    }

    if (audio !== undefined) {
      post.audio = audio;
      post.audioFilename = audio ? (req.body.audioFilename || '') : '';
    }

    if (video !== undefined) {
      post.video = video;
      post.videoFilename = video ? (req.body.videoFilename || '') : '';
    }

    post.fecha_publicacion = new Date(); // Actualizar fecha de modificación

    await post.save();
    
    // Popular el autor para la respuesta
    await post.populate('autor', 'username nombre foto_perfil');
    await post.populate('likes', 'username nombre');

    console.log('✅ Post actualizado:', {
      id: post._id,
      tipoContenido: post.tipoContenido,
      multimedia: {
        imagen: post.imagen,
        audio: post.audio,
        video: post.video
      }
    });

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