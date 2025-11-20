// backend/routes/posts.js
const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const router = express.Router();
const Notification = require('../models/Notification');

// Agrega esta ruta en tu archivo de rutas de posts
router.get('/explore', async (req, res) => {
    try {
        const {
            search,
            searchInText,
            searchInHashtags,
            excludeBlocked,
            currentUserId,
            limit = 50
        } = req.query;

        let query = {};

        // EXCLUIR USUARIOS BLOQUEADOS - tanto los que yo bloqueé como los que me bloquearon
        if (excludeBlocked === 'true' && currentUserId) {
            const currentUser = await User.findById(currentUserId);
            
            if (currentUser) {
                // Usuarios que yo he bloqueado
                const usersIBlocked = currentUser.usuarios_bloqueados || [];
                
                // Usuarios que me han bloqueado (necesitas verificar esto)
                const usersWhoBlockedMe = await User.find({ 
                    usuarios_bloqueados: currentUserId 
                }).select('_id');
                
                const blockedUserIds = [
                    ...usersIBlocked,
                    ...usersWhoBlockedMe.map(user => user._id)
                ];
                
                if (blockedUserIds.length > 0) {
                    query.autor = { $nin: blockedUserIds };
                }
            }
        }

        // BÚSQUEDA POR TEXTO Y HASHTAGS
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const searchConditions = [];

            // Buscar en texto normal
            if (searchInText === 'true') {
                searchConditions.push({ contenido: searchRegex });
            }

            // Buscar en hashtags
            if (searchInHashtags === 'true') {
                // Buscar hashtags exactos (#musica, #arte, etc.)
                const hashtagSearch = searchTerm.startsWith('#') ? searchTerm : `#${searchTerm}`;
                const hashtagRegex = new RegExp(hashtagSearch, 'i');
                searchConditions.push({ contenido: hashtagRegex });
                
                // También buscar palabras que puedan ser hashtags
                if (!searchTerm.startsWith('#')) {
                    const wordAsHashtagRegex = new RegExp(`#${searchTerm}\\b`, 'i');
                    searchConditions.push({ contenido: wordAsHashtagRegex });
                }
            }

            if (searchConditions.length > 0) {
                query.$or = searchConditions;
            }
        }

        console.log('🔍 Query de búsqueda:', {
            search: search,
            query: query,
            excludeBlocked: excludeBlocked
        });

        const posts = await Post.find(query)
            .populate('autor', 'nombre username foto_perfil seguidores seguidos usuarios_bloqueados')
            .populate({
                path: 'postOriginal',
                populate: {
                    path: 'autor',
                    select: 'nombre username foto_perfil'
                }
            })
            .sort({ fecha_publicacion: -1 })
            .limit(parseInt(limit));

        console.log(`✅ Encontradas ${posts.length} publicaciones`);

        res.json({
            success: true,
            data: posts,
            count: posts.length
        });

    } catch (error) {
        console.error('❌ Error en búsqueda de exploración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al buscar publicaciones'
        });
    }
});

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
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID de usuario'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Publicación no encontrada'
            });
        }

        const isLiked = post.likes.includes(userId);
        let likesCount = post.likes.length;

        if (isLiked) {
            // Quitar like
            post.likes = post.likes.filter(like => like.toString() !== userId);
            likesCount--;
        } else {
            // Agregar like
            post.likes.push(userId);
            likesCount++;
            
            // ✅ CREAR NOTIFICACIÓN - VERSIÓN CORRECTA
            if (post.autor.toString() !== userId) {
                const notification = new Notification({
                    usuario: post.autor,
                    emisor: userId,
                    tipo: 'like',
                    post: postId
                });
                await notification.save();
            }
        }

        await post.save();

        res.json({
            success: true,
            data: {
                isLiked: !isLiked,
                likesCount: likesCount
            }
        });

    } catch (error) {
        console.error('❌ Error dando like:', error);
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
        const { postId } = req.params;
        const { usuario, contenido } = req.body;

        if (!usuario || !contenido) {
            return res.status(400).json({
                success: false,
                error: 'Usuario y contenido son requeridos'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Publicación no encontrada'
            });
        }

        const nuevoComentario = {
            usuario: usuario,
            contenido: contenido,
            fecha: new Date()
        };

        post.comentarios.push(nuevoComentario);
        await post.save();

        // ✅ CREAR NOTIFICACIÓN - VERSIÓN CORRECTA
        if (post.autor.toString() !== usuario) {
            const notification = new Notification({
                usuario: post.autor,
                emisor: usuario,
                tipo: 'comment',
                post: postId,
                comentario: contenido.substring(0, 200) // Limitar longitud
            });
            await notification.save();
        }

        // Popular el comentario para la respuesta
        await post.populate('comentarios.usuario', 'nombre username foto_perfil');

        const comentarioAgregado = post.comentarios[post.comentarios.length - 1];

        res.json({
            success: true,
            data: comentarioAgregado
        });

    } catch (error) {
        console.error('❌ Error agregando comentario:', error);
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

// BACKEND - En routes/posts.js, MODIFICA la ruta de share:
router.post('/:postId/share', async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere ID de usuario'
            });
        }

        // Verificar si el post existe
        const postToShare = await Post.findById(postId).populate('autor');
        
        if (!postToShare) {
            return res.status(404).json({
                success: false,
                error: 'Publicación no encontrada'
            });
        }

        // **NUEVA VALIDACIÓN: No permitir compartir posts que ya son shares**
        if (postToShare.tipo === 'share') {
            return res.status(400).json({
                success: false,
                error: 'No puedes compartir una publicación que ya es compartida'
            });
        }

        // Obtener el post original (si es un share, usar postOriginal, sino el mismo post)
        const postOriginal = postToShare.tipo === 'share' ? 
            await Post.findById(postToShare.postOriginal).populate('autor') : 
            postToShare;

        if (!postOriginal) {
            return res.status(404).json({
                success: false,
                error: 'Publicación original no encontrada'
            });
        }

        // Verificar bloqueos con el autor ORIGINAL
        const currentUser = await User.findById(userId);
        const originalAuthor = await User.findById(postOriginal.autor._id);
        
        if (originalAuthor.usuarios_bloqueados?.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: 'No puedes compartir publicaciones de usuarios que te han bloqueado'
            });
        }

        if (currentUser.usuarios_bloqueados?.includes(postOriginal.autor._id)) {
            return res.status(403).json({
                success: false,
                error: 'No puedes compartir publicaciones de usuarios que has bloqueado'
            });
        }

        // Verificar si ya compartió esta publicación ORIGINAL
        const existingShare = await Post.findOne({
            tipo: 'share',
            postOriginal: postOriginal._id, // Usar el ID del post original
            autor: userId
        });

        if (existingShare) {
            return res.status(400).json({
                success: false,
                error: 'Ya compartiste esta publicación'
            });
        }

        // Crear el post de share apuntando al POST ORIGINAL
        const sharePost = new Post({
            autor: userId,
            tipo: 'share',
            postOriginal: postOriginal._id, // Siempre apuntar al post original
            fecha_publicacion: new Date(),
            contenido: '',
            tipoContenido: 'texto'
        });

        await sharePost.save();

        // Agregar el share a la publicación ORIGINAL
        await Post.findByIdAndUpdate(postOriginal._id, {
            $push: {
                shares: {
                    usuario: userId,
                    fecha: new Date()
                }
            }
        });

        // Crear notificación para el autor ORIGINAL
        if (postOriginal.autor._id.toString() !== userId) {
            const notification = new Notification({
                usuario: postOriginal.autor._id,
                emisor: userId,
                tipo: 'share',
                post: postOriginal._id,
                postCompartido: sharePost._id
            });
            await notification.save();
        }

        // Obtener conteo actualizado del post ORIGINAL
        const updatedOriginalPost = await Post.findById(postOriginal._id);
        const sharesCount = updatedOriginalPost.shares.length;

        // Popular el post para respuesta
        await sharePost.populate('autor', 'nombre username foto_perfil');
        await sharePost.populate({
            path: 'postOriginal',
            populate: {
                path: 'autor',
                select: 'nombre username foto_perfil'
            }
        });

        res.json({
            success: true,
            data: {
                sharesCount: sharesCount,
                shareId: sharePost._id,
                sharePost: sharePost
            }
        });

    } catch (error) {
        console.error('❌ Error compartiendo publicación:', error);
        res.status(500).json({
            success: false,
            error: error.message
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