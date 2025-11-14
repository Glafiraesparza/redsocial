// frontend/js/dashboard.js
const API_URL = 'http://localhost:3001/api';

// Variables globales
let currentUser = null;
let currentPosts = [];
let currentPostId = null;
let currentMediaType = 'imagen'; // 'imagen', 'audio', 'video'
let toastTimeout = null;
let errorHighlightTimeout = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    console.log('🚀 Inicializando Dashboard...');
    
    // DEBUG: Verificar elementos del DOM
    console.log('🔍 Elementos del DOM:');
    console.log(' - postContent:', document.getElementById('postContent'));
    console.log(' - submitPost:', document.getElementById('submitPost'));
    console.log(' - media buttons:', document.querySelectorAll('.media-type-btn').length);
    
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        window.currentUser = currentUser;
    }
    
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    console.log('✅ Usuario actual cargado:', currentUser.nombre);
    
    // VERIFICAR SI HAY SECCIÓN EN LA URL
    const urlSection = getUrlParameter('section');
    
    if (urlSection) {
        showSection(urlSection);
    } else {
        showSection('feed');
    }

    // Inicializar mensajes si es necesario
    if (window.initializeMessages) {
        window.initializeMessages();
    }
    
    initializeUserInfo();
    initializeEventListeners();
    initializeProfileCardClick();
    makeOptionsFunctionsGlobal();
    
    // INICIALIZAR TIPOS DE MEDIO - AGREGAR ESTA LÍNEA
    initializeMediaTypeButtons();
    
    console.log('✅ Dashboard inicializado correctamente');
}


// ========== FUNCIONES DE USUARIO ==========
function initializeUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userGreeting').textContent = `Hola, ${currentUser.nombre}`;
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userUsername').textContent = `@${currentUser.username}`;
    document.getElementById('seguidoresCount').textContent = currentUser.seguidores?.length || 0;
    document.getElementById('seguidosCount').textContent = currentUser.seguidos?.length || 0;
    
    const userAvatar = document.getElementById('userAvatar');
    if (currentUser.foto_perfil) {
        userAvatar.innerHTML = `<img src="${currentUser.foto_perfil}" alt="${currentUser.nombre}">`;
    }
}

// Función para obtener parámetros de la URL
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function initializeEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('submitPost').addEventListener('click', handleCreatePost);
    
    // Event listener para el clic en tu perfil del sidebar
    const userProfileCard = document.querySelector('.user-profile-card');
    if (userProfileCard) {
        userProfileCard.addEventListener('click', function() {
            showSection('profile');
        });
    }
    
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    
    postContent.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/500`;
        charCount.style.color = length > 400 ? '#e74c3c' : length > 300 ? '#f39c12' : '#7f8c8d';
    });
    
    postContent.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleCreatePost();
        }
    });
    
    // INICIALIZAR EVENT LISTENERS PARA MULTIMEDIA - VERSIÓN MEJORADA
    initializeMediaEventListeners();
    
    // INICIALIZAR BOTONES DE TIPO DE MEDIO
    initializeMediaTypeButtons();
}

function initializeMediaEventListeners() {
    console.log('🔧 Inicializando event listeners de multimedia...');
    
    // Remover event listeners existentes primero
    const postImageInput = document.getElementById('postImage');
    const postAudioInput = document.getElementById('postAudio');
    const postVideoInput = document.getElementById('postVideo');
    
    // Clonar y reemplazar para limpiar event listeners
    if (postImageInput) {
        const newImageInput = postImageInput.cloneNode(true);
        postImageInput.parentNode.replaceChild(newImageInput, postImageInput);
    }
    
    if (postAudioInput) {
        const newAudioInput = postAudioInput.cloneNode(true);
        postAudioInput.parentNode.replaceChild(newAudioInput, postAudioInput);
    }
    
    if (postVideoInput) {
        const newVideoInput = postVideoInput.cloneNode(true);
        postVideoInput.parentNode.replaceChild(newVideoInput, postVideoInput);
    }
    
    // Agregar nuevos event listeners
    document.getElementById('postImage').addEventListener('change', handleImageUpload);
    document.getElementById('postAudio').addEventListener('change', handleAudioUpload);
    document.getElementById('postVideo').addEventListener('change', handleVideoUpload);
}

function initializeMediaTypeButtons() {
    console.log('🔧 Inicializando botones de tipo de medio...');
    
    // Remover event listeners existentes
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Agregar nuevos event listeners usando addEventListener
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const type = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            changeMediaType(type);
        });
    });
    
    // Establecer imagen como tipo por defecto
    currentMediaType = 'imagen';
    document.getElementById('imageUpload').style.display = 'block';
    document.getElementById('audioUpload').style.display = 'none';
    document.getElementById('videoUpload').style.display = 'none';
    
    // Establecer botón activo
    const imageBtn = document.querySelector('[onclick*="imagen"]');
    if (imageBtn) {
        imageBtn.classList.add('active');
    }
    
    console.log('✅ Botones de tipo de medio inicializados');
}

function highlightTextareaError() {
    const textarea = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    
    // Limpiar timeout anterior si existe
    if (errorHighlightTimeout) {
        clearTimeout(errorHighlightTimeout);
        errorHighlightTimeout = null;
    }
    
    // Agregar clase de error
    textarea.classList.add('error');
    charCount.classList.add('error');
    
    // Hacer scroll al textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Enfocar el textarea
    textarea.focus();
    
    // Remover el error después de 8 segundos (mismo tiempo que el toast de error)
    errorHighlightTimeout = setTimeout(() => {
        textarea.classList.remove('error');
        charCount.classList.remove('error');
        errorHighlightTimeout = null;
    }, 8000);
}


// ========== PUBLICACIONES ==========
async function handleCreatePost() {
    const content = document.getElementById('postContent').value.trim();
    
    let mediaFile = null;
    let mediaType = currentMediaType;
    
    if (mediaType === 'imagen') {
        mediaFile = document.getElementById('postImage').files[0];
    } else if (mediaType === 'audio') {
        mediaFile = document.getElementById('postAudio').files[0];
    } else if (mediaType === 'video') {
        mediaFile = document.getElementById('postVideo').files[0];
    }
    
    console.log('🔍 DEBUG handleCreatePost:');
    console.log(' - content:', content);
    console.log(' - mediaType:', mediaType);
    console.log(' - mediaFile:', mediaFile);
    
    // SOLO ESTA VALIDACIÓN - PERMITIR MEDIOS SIN TEXTO
    if (!content && !mediaFile) {
        console.log('❌ Sin contenido y sin archivo');
        showToast('❌ Escribe algo o selecciona un archivo para publicar', 'error');
        highlightTextareaError();
        return;
    }
    
    // Si llegamos aquí, es porque hay contenido O hay archivo (o ambos)
    console.log('✅ Validación pasada, procediendo a publicar...');
    
    try {
        let mediaUrl = '';
        let mediaFilename = '';
        let duracion = 0;
        
        if (mediaFile) {
            showToast(`📤 Subiendo ${mediaType}...`, 'info');
            
            const fieldName = mediaType === 'imagen' ? 'image' : mediaType;
            const uploadResult = await uploadMediaFile(mediaFile, fieldName);
            mediaUrl = uploadResult.url;
            mediaFilename = uploadResult.filename;
            duracion = uploadResult.duracion || 0;
        }
        
        const postData = {
            autor: currentUser._id,
            contenido: content || '', // Enviar string vacío si no hay contenido
            duracion: duracion,
            tipoContenido: mediaFile ? mediaType : 'texto'
        };
        
        if (mediaType === 'imagen' && mediaUrl) {
            postData.imagen = mediaUrl;
            postData.imagenFilename = mediaFilename;
        } else if (mediaType === 'audio' && mediaUrl) {
            postData.audio = mediaUrl;
            postData.audioFilename = mediaFilename;
        } else if (mediaType === 'video' && mediaUrl) {
            postData.video = mediaUrl;
            postData.videoFilename = mediaFilename;
        }
        
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Publicación creada exitosamente', 'success');
            resetPostForm();
            loadFeed();
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error creando publicación:', error);
        showToast('❌ Error al crear la publicación', 'error');
    }
}

async function loadFeed() {
    try {
        const response = await fetch(`${API_URL}/posts/feed/${currentUser._id}`);
        const result = await response.json();
        
        if (result.success) {
            currentPosts = result.data;
            displayPosts(currentPosts);
        } else {
            showToast('❌ Error al cargar el feed', 'error');
        }
    } catch (error) {
        console.error('Error cargando feed:', error);
        showToast('❌ Error de conexión', 'error');
    }
}


// Función para cambiar el tipo de contenido
function changeEditMediaType(type) {
    // Verificar si hay algún medio existente
    const hasExistingMedia = document.querySelector('.current-media-preview');
    if (hasExistingMedia) {
        showToast('❌ Primero elimina el medio actual para agregar uno nuevo', 'error');
        return;
    }
    
    // Ocultar todos los uploaders
    document.getElementById('editImageUpload').style.display = 'none';
    document.getElementById('editAudioUpload').style.display = 'none';
    document.getElementById('editVideoUpload').style.display = 'none';
    
    // Limpiar previews
    document.getElementById('editImagePreview').innerHTML = '';
    document.getElementById('editAudioPreview').innerHTML = '';
    document.getElementById('editVideoPreview').innerHTML = '';
    
    // Mostrar el uploader seleccionado
    document.getElementById(`edit${type.charAt(0).toUpperCase() + type.slice(1)}Upload`).style.display = 'block';
    
    // Actualizar botones activos
    document.querySelectorAll('.media-type-btn-edit').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Abrir selector de archivos
    setTimeout(() => {
        document.getElementById(`editPost${type.charAt(0).toUpperCase() + type.slice(1)}`).click();
    }, 100);
}




function displayPosts(posts) {
    const postsFeed = document.getElementById('postsFeed');
    
    console.log('🔍 DEBUG - Posts recibidos:', posts);
    
    // Verificar específicamente las URLs de imágenes
    posts.forEach((post, index) => {
        console.log(`📷 Post ${index}:`, {
            id: post._id,
            tieneImagen: !!post.imagen,
            imagenURL: post.imagen,
            contenido: post.contenido.substring(0, 50) + '...'
        });
    });
    
    if (posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                <h3>No hay publicaciones aún</h3>
                <p>Sé el primero en publicar algo o sigue a más usuarios para ver su contenido.</p>
            </div>
        `;
        return;
    }
    
    postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');
    initializePostInteractions('postsFeed', posts);
}

function createPostHTML(post) {
    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const likeCount = post.likes.length;
    const shareCount = post.shares ? post.shares.length : 0;
    const timeAgo = getTimeAgo(new Date(post.fecha_publicacion));
    
    const isSharedPost = post.tipo === 'share';
    const hasOriginalPost = isSharedPost && post.postOriginal;
    const isAuthor = post.autor._id === currentUser._id;

    return `
        <div class="post-card" id="post-${post._id}">
            <div class="post-header">
                <div class="post-avatar" onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer;">
                    ${post.autor.foto_perfil ? 
                        `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="post-user-info">
                    <h4 onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #3498db;">
                        ${post.autor.nombre}
                    </h4>
                    <p onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                        @${post.autor.username}
                    </p>
                </div>
                <div class="post-time">${timeAgo}</div>
                
                ${isAuthor ? `
                    <div class="post-options">
                        <button class="btn-icon post-options-btn" id="optionsBtn-${post._id}">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div class="post-options-menu" id="optionsMenu-${post._id}">
                            <button class="option-item edit-option" onclick="editPost('${post._id}')">
                                <i class="fas fa-edit"></i>
                                <span>Editar publicación</span>
                            </button>
                            <button class="option-item delete-option" onclick="confirmDeletePost('${post._id}')">
                                <i class="fas fa-trash"></i>
                                <span>Eliminar publicación</span>
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${isSharedPost ? `
                <div class="post-share-header">
                    <i class="fas fa-share"></i>
                    <span>${post.autor.nombre} compartió esto</span>
                </div>
            ` : ''}
            
            <div class="post-content" id="postContent-${post._id}">
                ${formatPostContent(post.contenido)}
            </div>
            
            ${hasOriginalPost ? `
                <div class="original-post-preview">
                    <div class="original-post-header">
                        <div class="original-post-avatar" onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer;">
                            ${post.postOriginal.autor.foto_perfil ? 
                                `<img src="${post.postOriginal.autor.foto_perfil}" alt="${post.postOriginal.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="original-post-info">
                            <strong onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer; color: #3498db;">
                                ${post.postOriginal.autor.nombre}
                            </strong>
                            <span onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                                @${post.postOriginal.autor.username}
                            </span>
                        </div>
                    </div>
                    <div class="original-post-content">
                        ${formatPostContent(post.postOriginal.contenido)}
                    </div>
                    
                    <!-- MOSTRAR MEDIA DEL POST ORIGINAL - CORRECCIÓN -->
                    ${post.postOriginal.imagen ? `
                        <div class="original-post-media">
                            <img src="${post.postOriginal.imagen}" alt="Imagen" class="original-post-image">
                        </div>
                    ` : ''}
                    
                    ${post.postOriginal.audio ? `
                        <div class="original-post-media">
                            <div class="audio-player-container">
                                <audio controls class="audio-player">
                                    <source src="${post.postOriginal.audio}" type="audio/mpeg">
                                    <source src="${post.postOriginal.audio}" type="audio/wav">
                                    <source src="${post.postOriginal.audio}" type="audio/ogg">
                                    Tu navegador no soporta el elemento de audio.
                                </audio>
                                ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${post.postOriginal.video ? `
                        <div class="original-post-media">
                            <div class="video-player-container">
                                <video controls class="video-player" poster="${post.postOriginal.videoThumbnail || ''}">
                                    <source src="${post.postOriginal.video}" type="video/mp4">
                                    <source src="${post.postOriginal.video}" type="video/webm">
                                    <source src="${post.postOriginal.video}" type="video/ogg">
                                    Tu navegador no soporta el elemento de video.
                                </video>
                                ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- MEDIA DEL POST ACTUAL (solo si no es compartido) -->
            ${!isSharedPost ? `
                ${post.imagen ? `
                    <div class="post-media">
                        <img src="${post.imagen}" alt="Imagen de publicación" class="post-image" id="postImage-${post._id}">
                    </div>
                ` : ''}
                
                ${post.audio ? `
                    <div class="post-media">
                        <div class="audio-player-container">
                            <audio controls class="audio-player" id="audio-${post._id}">
                                <source src="${post.audio}" type="audio/mpeg">
                                <source src="${post.audio}" type="audio/wav">
                                <source src="${post.audio}" type="audio/ogg">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                            ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${post.video ? `
                    <div class="post-media">
                        <div class="video-player-container">
                            <video controls class="video-player" id="video-${post._id}" poster="${post.videoThumbnail || ''}">
                                <source src="${post.video}" type="video/mp4">
                                <source src="${post.video}" type="video/webm">
                                <source src="${post.video}" type="video/ogg">
                                Tu navegador no soporta el elemento de video.
                            </video>
                            ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
            ` : ''}
            
            <div class="post-actions-bar">
                <button class="post-action ${isLiked ? 'liked' : ''}" id="likeBtn-${post._id}">
                    <i class="fas fa-heart"></i>
                    <span>${likeCount}</span>
                </button>
                <button class="post-action" id="viewBtn-${post._id}">
                    <i class="fas fa-comment"></i>
                    <span>${post.comentarios?.length || 0}</span>
                </button>
                <button class="post-action" id="shareBtn-${post._id}">
                    <i class="fas fa-share"></i>
                    <span>${shareCount}</span>
                </button>
            </div>
        </div>
    `;
}


// ========== FUNCIONES DE MULTIMEDIA ==========
function formatDuracion(segundos) {
    if (!segundos) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

// Función para manejar la vista previa de audio
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('audio/')) {
            showToast('❌ Por favor selecciona un archivo de audio válido', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('❌ El audio no debe superar los 10MB', 'error');
            event.target.value = '';
            return;
        }
        
        document.getElementById('audioPreview').innerHTML = `
            <div class="audio-preview-item">
                <i class="fas fa-music"></i>
                <div class="audio-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeAudioPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

// Función para manejar la vista previa de video
function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('video/')) {
            showToast('❌ Por favor selecciona un archivo de video válido', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            showToast('❌ El video no debe superar los 50MB', 'error');
            event.target.value = '';
            return;
        }
        
        const url = URL.createObjectURL(file);
        document.getElementById('videoPreview').innerHTML = `
            <div class="video-preview-item">
                <video controls class="preview-video">
                    <source src="${url}" type="${file.type}">
                    Tu navegador no soporta el elemento video.
                </video>
                <div class="video-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeVideoPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

function removeAudioPreview() {
    document.getElementById('audioPreview').innerHTML = '';
    document.getElementById('postAudio').value = '';
}

function removeVideoPreview() {
    document.getElementById('videoPreview').innerHTML = '';
    document.getElementById('postVideo').value = '';
}

// ========== FUNCIONALIDAD DE EDICIÓN ==========

// Función para abrir el modal de edición
// Función para abrir el modal de edición mejorado
function editPost(postId) {
    closeAllPostOptions();
    
    // Buscar el post en currentPosts
    const post = currentPosts.find(p => p._id === postId);
    if (!post) {
        showToast('❌ No se pudo encontrar la publicación', 'error');
        return;
    }

    // No permitir editar posts compartidos
    if (post.tipo === 'share') {
        showToast('❌ No se pueden editar publicaciones compartidas', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Editar Publicación</h3>
                <span class="close-modal" onclick="closeEditModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="edit-post-form">
                    <div class="form-group">
                        <label for="editPostContent">
                            <i class="fas fa-pencil-alt"></i> Contenido
                        </label>
                        <textarea 
                            id="editPostContent" 
                            placeholder="¿Qué estás pensando?" 
                            maxlength="1000"
                            rows="4"
                        >${post.contenido}</textarea>
                        <div class="char-count-edit">
                            <span id="editCharCount">${post.contenido.length}/1000</span>
                        </div>
                    </div>
                    
                    <!-- Sección para medios existentes -->
                    <div class="current-media-section">
                        ${post.imagen ? `
                            <div class="current-media-preview">
                                <label>
                                    <i class="fas fa-image"></i> Imagen actual
                                </label>
                                <div class="media-preview-container">
                                    <img src="${post.imagen}" alt="Imagen actual" class="current-media">
                                    <button type="button" class="btn-remove-media" onclick="removeCurrentMedia('${postId}', 'imagen')">
                                        <i class="fas fa-times"></i> Eliminar imagen
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${post.audio ? `
                            <div class="current-media-preview">
                                <label>
                                    <i class="fas fa-music"></i> Audio actual
                                </label>
                                <div class="media-preview-container">
                                    <div class="audio-preview-item">
                                        <i class="fas fa-music"></i>
                                        <div class="audio-info">
                                            <strong>Audio actual</strong>
                                            <span>Duración: ${formatDuracion(post.duracion)}</span>
                                        </div>
                                        <button type="button" class="btn-remove-media" onclick="removeCurrentMedia('${postId}', 'audio')">
                                            <i class="fas fa-times"></i> Eliminar audio
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${post.video ? `
                            <div class="current-media-preview">
                                <label>
                                    <i class="fas fa-video"></i> Video actual
                                </label>
                                <div class="media-preview-container">
                                    <video controls class="current-media-preview-video">
                                        <source src="${post.video}" type="video/mp4">
                                        Tu navegador no soporta el elemento de video.
                                    </video>
                                    <button type="button" class="btn-remove-media" onclick="removeCurrentMedia('${postId}', 'video')">
                                        <i class="fas fa-times"></i> Eliminar video
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Sección para agregar nuevos medios (solo mostrar si no hay medio existente) -->
                    ${!post.imagen && !post.audio && !post.video ? `
                    <div class="add-media-section">
                        <h4><i class="fas fa-plus"></i> Agregar medio (opcional)</h4>
                        
                        <div class="media-type-selector-edit">
                            <button type="button" class="media-type-btn-edit active" onclick="changeEditMediaType('imagen')">
                                <i class="fas fa-image"></i> Imagen
                            </button>
                            <button type="button" class="media-type-btn-edit" onclick="changeEditMediaType('audio')">
                                <i class="fas fa-music"></i> Audio
                            </button>
                            <button type="button" class="media-type-btn-edit" onclick="changeEditMediaType('video')">
                                <i class="fas fa-video"></i> Video
                            </button>
                        </div>
                        
                        <div id="editImageUpload" class="media-upload-edit" style="display: block;">
                            <input type="file" id="editPostImage" accept="image/*" style="display: none;">
                            <label for="editPostImage" class="btn-secondary btn-media-upload">
                                <i class="fas fa-upload"></i> Seleccionar Imagen
                            </label>
                            <div id="editImagePreview" class="media-preview"></div>
                        </div>
                        
                        <div id="editAudioUpload" class="media-upload-edit" style="display: none;">
                            <input type="file" id="editPostAudio" accept="audio/*" style="display: none;">
                            <label for="editPostAudio" class="btn-secondary btn-media-upload">
                                <i class="fas fa-upload"></i> Seleccionar Audio
                            </label>
                            <div id="editAudioPreview" class="media-preview"></div>
                        </div>
                        
                        <div id="editVideoUpload" class="media-upload-edit" style="display: none;">
                            <input type="file" id="editPostVideo" accept="video/*" style="display: none;">
                            <label for="editPostVideo" class="btn-secondary btn-media-upload">
                                <i class="fas fa-upload"></i> Seleccionar Video
                            </label>
                            <div id="editVideoPreview" class="media-preview"></div>
                        </div>
                    </div>
                    ` : `
                    <div class="media-info-message">
                        <div class="info-alert">
                            <i class="fas fa-info-circle"></i>
                            <span>Para agregar un nuevo medio, primero elimina el medio actual.</span>
                        </div>
                    </div>
                    `}
                    
                    <div class="form-actions" style="margin-top: 2rem;">
                        <button class="btn-secondary" onclick="closeEditModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn-primary" onclick="updatePost('${postId}')">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Inicializar eventos del modal de edición
    initializeEditModalEvents(postId);
    openModal('edit');
}



// Función para inicializar eventos del modal de edición
function initializeEditModalEvents(postId) {
    const editContent = document.getElementById('editPostContent');
    const editCharCount = document.getElementById('editCharCount');
    
    // Contador de caracteres
    if (editContent && editCharCount) {
        editContent.addEventListener('input', function() {
            const length = this.value.length;
            editCharCount.textContent = `${length}/1000`;
            editCharCount.style.color = length > 900 ? '#e74c3c' : length > 700 ? '#f39c12' : '#7f8c8d';
        });
        
        // Atajos de teclado
        editContent.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                updatePost(postId);
            }
        });
    }
    
    // Inicializar eventos de medios
    initializeEditMediaEvents();
}


// Función para manejar upload de imagen en edición
function handleEditImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            showToast('❌ Por favor selecciona una imagen válida', 'error');
            return;
        }
        
        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('❌ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editImagePreview').innerHTML = `
                <div class="media-preview-item">
                    <img src="${e.target.result}" alt="Vista previa" class="preview-media">
                    <button type="button" class="btn-remove-preview" onclick="removeEditImagePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

// Función para manejar upload de audio en edición
function handleEditAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('audio/')) {
            showToast('❌ Por favor selecciona un archivo de audio válido', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('❌ El audio no debe superar los 10MB', 'error');
            return;
        }
        
        document.getElementById('editAudioPreview').innerHTML = `
            <div class="media-preview-item">
                <i class="fas fa-music"></i>
                <div class="audio-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeEditAudioPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

// Función para manejar upload de video en edición
function handleEditVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('video/')) {
            showToast('❌ Por favor selecciona un archivo de video válido', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            showToast('❌ El video no debe superar los 50MB', 'error');
            return;
        }
        
        const url = URL.createObjectURL(file);
        document.getElementById('editVideoPreview').innerHTML = `
            <div class="media-preview-item">
                <video controls class="preview-media-video">
                    <source src="${url}" type="${file.type}">
                    Tu navegador no soporta el elemento video.
                </video>
                <div class="video-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeEditVideoPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}


// Funciones para remover previews en edición
function removeEditImagePreview() {
    document.getElementById('editImagePreview').innerHTML = '';
    document.getElementById('editPostImage').value = '';
}

function removeEditAudioPreview() {
    document.getElementById('editAudioPreview').innerHTML = '';
    document.getElementById('editPostAudio').value = '';
}

function removeEditVideoPreview() {
    document.getElementById('editVideoPreview').innerHTML = '';
    document.getElementById('editPostVideo').value = '';
}

// Función para remover medio actual
function removeCurrentMedia(postId, mediaType) {
    const post = currentPosts.find(p => p._id === postId);
    if (!post) return;
    
    // Remover el medio específico
    if (mediaType === 'imagen') {
        post.imagen = '';
        post.imagenFilename = '';
    } else if (mediaType === 'audio') {
        post.audio = '';
        post.audioFilename = '';
    } else if (mediaType === 'video') {
        post.video = '';
        post.videoFilename = '';
    }
    
    // Mostrar sección para agregar nuevos medios
    showAddMediaSection();
    
    showToast('✅ Medio eliminado. Ahora puedes agregar uno nuevo si lo deseas.', 'success');
}

function showAddMediaSection() {
    const currentMediaSection = document.querySelector('.current-media-section');
    const mediaInfoMessage = document.querySelector('.media-info-message');
    
    if (currentMediaSection) {
        // Remover todos los medios existentes del DOM
        currentMediaSection.innerHTML = '';
    }
    
    if (mediaInfoMessage) {
        // Reemplazar el mensaje por la sección de agregar medios
        mediaInfoMessage.outerHTML = `
            <div class="add-media-section">
                <h4><i class="fas fa-plus"></i> Agregar medio (opcional)</h4>
                
                <div class="media-type-selector-edit">
                    <button type="button" class="media-type-btn-edit active" onclick="changeEditMediaType('imagen')">
                        <i class="fas fa-image"></i> Imagen
                    </button>
                    <button type="button" class="media-type-btn-edit" onclick="changeEditMediaType('audio')">
                        <i class="fas fa-music"></i> Audio
                    </button>
                    <button type="button" class="media-type-btn-edit" onclick="changeEditMediaType('video')">
                        <i class="fas fa-video"></i> Video
                    </button>
                </div>
                
                <div id="editImageUpload" class="media-upload-edit" style="display: block;">
                    <input type="file" id="editPostImage" accept="image/*" style="display: none;">
                    <label for="editPostImage" class="btn-secondary btn-media-upload">
                        <i class="fas fa-upload"></i> Seleccionar Imagen
                    </label>
                    <div id="editImagePreview" class="media-preview"></div>
                </div>
                
                <div id="editAudioUpload" class="media-upload-edit" style="display: none;">
                    <input type="file" id="editPostAudio" accept="audio/*" style="display: none;">
                    <label for="editPostAudio" class="btn-secondary btn-media-upload">
                        <i class="fas fa-upload"></i> Seleccionar Audio
                    </label>
                    <div id="editAudioPreview" class="media-preview"></div>
                </div>
                
                <div id="editVideoUpload" class="media-upload-edit" style="display: none;">
                    <input type="file" id="editPostVideo" accept="video/*" style="display: none;">
                    <label for="editPostVideo" class="btn-secondary btn-media-upload">
                        <i class="fas fa-upload"></i> Seleccionar Video
                    </label>
                    <div id="editVideoPreview" class="media-preview"></div>
                </div>
            </div>
        `;
        
        // Re-inicializar eventos para los nuevos elementos
        initializeEditMediaEvents();
    }
}

function initializeEditMediaEvents() {
    const editImageInput = document.getElementById('editPostImage');
    const editAudioInput = document.getElementById('editPostAudio');
    const editVideoInput = document.getElementById('editPostVideo');
    
    if (editImageInput) {
        editImageInput.addEventListener('change', handleEditImageUpload);
    }
    
    if (editAudioInput) {
        editAudioInput.addEventListener('change', handleEditAudioUpload);
    }
    
    if (editVideoInput) {
        editVideoInput.addEventListener('change', handleEditVideoUpload);
    }
}


// Función para cerrar el modal de edición
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

// Función para subir imagen al servidor
async function uploadImageToServer(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_URL}/upload/image`, {
        method: 'POST',
        // NO agregar Content-Type header, FormData lo hace automáticamente
        body: formData
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error);
    }
    
    return result.data;
}

// Función para remover preview de imagen
function removeImagePreview() {
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('postImage').value = '';
}

// Función para resetear el formulario
function resetPostForm() {
    document.getElementById('postContent').value = '';
    document.getElementById('charCount').textContent = '0/1000';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageUpload').style.display = 'none';
    document.getElementById('postImage').value = '';
}

// Función para actualizar el post
async function updatePost(postId) {
    const editContent = document.getElementById('editPostContent');
    const editImageInput = document.getElementById('editPostImage');
    const editAudioInput = document.getElementById('editPostAudio');
    const editVideoInput = document.getElementById('editPostVideo');
    
    if (!editContent) {
        showToast('❌ Error: No se pudo encontrar el contenido', 'error');
        return;
    }
    
    const contenido = editContent.value.trim();
    const post = currentPosts.find(p => p._id === postId);
    
    // Validación: debe haber contenido o algún medio
    const hasExistingMedia = post.imagen || post.audio || post.video;
    const hasNewMedia = (editImageInput && editImageInput.files[0]) || 
                       (editAudioInput && editAudioInput.files[0]) || 
                       (editVideoInput && editVideoInput.files[0]);
    
    if (!contenido && !hasExistingMedia && !hasNewMedia) {
        showToast('❌ La publicación debe tener contenido o un archivo multimedia', 'error');
        return;
    }
    
    try {
        const postData = {
            userId: currentUser._id,
            contenido: contenido
        };
        
        // Procesar nuevos archivos de medios (si existen)
        let newMediaType = null;
        let newMediaFile = null;
        
        if (editImageInput && editImageInput.files[0]) {
            newMediaType = 'imagen';
            newMediaFile = editImageInput.files[0];
        } else if (editAudioInput && editAudioInput.files[0]) {
            newMediaType = 'audio';
            newMediaFile = editAudioInput.files[0];
        } else if (editVideoInput && editVideoInput.files[0]) {
            newMediaType = 'video';
            newMediaFile = editVideoInput.files[0];
        }
        
        // Si hay un nuevo archivo, subirlo y reemplazar el medio existente
        if (newMediaFile) {
            showToast(`📤 Subiendo ${newMediaType}...`, 'info');
            
            const fieldName = newMediaType === 'imagen' ? 'image' : newMediaType;
            const uploadResult = await uploadMediaFile(newMediaFile, fieldName);
            
            // Configurar el nuevo medio
            postData.tipoContenido = newMediaType;
            postData.duracion = uploadResult.duracion || 0;
            
            // Limpiar todos los medios existentes
            postData.imagen = '';
            postData.audio = '';
            postData.video = '';
            
            // Establecer el nuevo medio
            if (newMediaType === 'imagen') {
                postData.imagen = uploadResult.url;
                postData.imagenFilename = uploadResult.filename;
            } else if (newMediaType === 'audio') {
                postData.audio = uploadResult.url;
                postData.audioFilename = uploadResult.filename;
            } else if (newMediaType === 'video') {
                postData.video = uploadResult.url;
                postData.videoFilename = uploadResult.filename;
            }
        } else {
            // Si no hay nuevo archivo, mantener los medios existentes
            postData.tipoContenido = post.imagen ? 'imagen' : post.audio ? 'audio' : post.video ? 'video' : 'texto';
            postData.duracion = post.duracion || 0;
        }
        
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Publicación actualizada exitosamente', 'success');
            closeEditModal();
            
            // Actualizar el post en el DOM
            updatePostInDOM(postId, result.data);
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error actualizando publicación:', error);
        showToast('❌ Error al actualizar la publicación', 'error');
    }
}


// Función para subir imagen (placeholder - en producción usarías un servicio como Cloudinary)
async function uploadImage(file) {
    // En una implementación real, aquí subirías el archivo a tu servidor
    // o a un servicio como Cloudinary, AWS S3, etc.
    // Por ahora, devolvemos una data URL como ejemplo
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function updatePostInDOM(postId, updatedPost) {
    const postElement = document.getElementById(`post-${postId}`);
    if (!postElement) return;
    
    // Actualizar contenido
    const contentElement = document.getElementById(`postContent-${postId}`);
    if (contentElement) {
        contentElement.innerHTML = formatPostContent(updatedPost.contenido);
    }
    
    // Actualizar medios
    updateMediaInDOM(postId, updatedPost);
    
    // Actualizar la hora (mostrar "Editado")
    const timeElement = postElement.querySelector('.post-time');
    if (timeElement) {
        timeElement.textContent = `${getTimeAgo(new Date(updatedPost.fecha_publicacion))} (editado)`;
    }
    
    // Actualizar el post en currentPosts
    const postIndex = currentPosts.findIndex(p => p._id === postId);
    if (postIndex !== -1) {
        currentPosts[postIndex] = updatedPost;
    }
}

// Función auxiliar para actualizar medios en el DOM
function updateMediaInDOM(postId, updatedPost) {
    const postElement = document.getElementById(`post-${postId}`);
    if (!postElement) return;
    
    // Remover todos los medios existentes
    const existingMedia = postElement.querySelector('.post-media');
    if (existingMedia) {
        existingMedia.remove();
    }
    
    // Agregar el nuevo medio si existe
    if (updatedPost.imagen) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'post-media';
        mediaDiv.innerHTML = `
            <img src="${updatedPost.imagen}" alt="Imagen de publicación" class="post-image" id="postImage-${postId}">
        `;
        postElement.querySelector('.post-content').after(mediaDiv);
    } else if (updatedPost.audio) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'post-media';
        mediaDiv.innerHTML = `
            <div class="audio-player-container">
                <audio controls class="audio-player" id="audio-${postId}">
                    <source src="${updatedPost.audio}" type="audio/mpeg">
                    <source src="${updatedPost.audio}" type="audio/wav">
                    Tu navegador no soporta el elemento de audio.
                </audio>
                ${updatedPost.duracion ? `<div class="media-duration">Duración: ${formatDuracion(updatedPost.duracion)}</div>` : ''}
            </div>
        `;
        postElement.querySelector('.post-content').after(mediaDiv);
    } else if (updatedPost.video) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'post-media';
        mediaDiv.innerHTML = `
            <div class="video-player-container">
                <video controls class="video-player" id="video-${postId}">
                    <source src="${updatedPost.video}" type="video/mp4">
                    <source src="${updatedPost.video}" type="video/webm">
                    Tu navegador no soporta el elemento de video.
                </video>
                ${updatedPost.duracion ? `<div class="media-duration">Duración: ${formatDuracion(updatedPost.duracion)}</div>` : ''}
            </div>
        `;
        postElement.querySelector('.post-content').after(mediaDiv);
    }
}

// ========== INTERACCIONES ==========
function initializePostInteractions(feedId, posts) {
    const feedElement = document.getElementById(feedId);
    if (!feedElement) return;
    
    posts.forEach(post => {
        const likeBtn = document.getElementById(`likeBtn-${post._id}`);
        if (likeBtn) likeBtn.addEventListener('click', () => handleLike(post._id));
        
        const viewBtn = document.getElementById(`viewBtn-${post._id}`);
        if (viewBtn) viewBtn.addEventListener('click', () => viewPost(post._id));
        
        const shareBtn = document.getElementById(`shareBtn-${post._id}`);
        if (shareBtn) shareBtn.addEventListener('click', () => handleShare(post._id));
        
        // Agregar evento para el botón de opciones
        const optionsBtn = document.getElementById(`optionsBtn-${post._id}`);
        if (optionsBtn) {
            optionsBtn.addEventListener('click', (e) => togglePostOptions(post._id, e));
        }
    });
    
    // Cerrar menús de opciones al hacer click fuera de ellos
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-options')) {
            closeAllPostOptions();
        }
    });
}

async function handleLike(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const likeBtn = document.getElementById(`likeBtn-${postId}`);
            const likeCount = likeBtn.querySelector('span');
            
            if (result.data.isLiked) {
                likeBtn.classList.add('liked');
                likeCount.textContent = result.data.likesCount;
            } else {
                likeBtn.classList.remove('liked');
                likeCount.textContent = result.data.likesCount;
            }
        }
    } catch (error) {
        console.error('Error dando like:', error);
        showToast('❌ Error al dar like', 'error');
    }
}

// ========== FUNCIONALIDAD DE SHARES ==========
async function handleShare(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const shareBtn = document.getElementById(`shareBtn-${postId}`);
            const shareCount = shareBtn.querySelector('span');
            
            shareCount.textContent = result.data.sharesCount;
            showToast('✅ Publicación compartida exitosamente', 'success');
            
            // Recargar el feed para mostrar el nuevo post compartido
            setTimeout(() => {
                loadFeed();
            }, 1000);
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error compartiendo publicación:', error);
        showToast('❌ Error al compartir la publicación', 'error');
    }
}

// ========== MODAL DE PUBLICACIÓN ==========
async function viewPost(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`);
        const result = await response.json();
        
        if (result.success) {
            showPostModal(result.data);
        } else {
            showToast('❌ Error al cargar la publicación', 'error');
        }
    } catch (error) {
        console.error('Error viendo publicación:', error);
        showToast('❌ Error al cargar la publicación', 'error');
    }
}

function showPostModal(post) {
    console.log('🎯 Abriendo modal para post:', post._id);
    currentPostId = post._id;
    
    const modal = document.getElementById('postModal');
    const modalContent = document.getElementById('postModalContent');
    
    if (!modal || !modalContent) {
        console.error('❌ Modal no encontrado');
        return;
    }

    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const shareCount = post.shares ? post.shares.length : 0;
    const isAuthor = post.autor._id === currentUser._id;
    const isSharedPost = post.tipo === 'share';

    // Cargar contenido COMPLETO del modal - SIN ESTILOS FACEBOOK
    modalContent.innerHTML = `
    <!-- Contenido Principal -->
    <div class="post-content-modal-adjusted">
        <div class="post-header">
            <div class="post-avatar" onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer;">
                ${post.autor.foto_perfil ? 
                    `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="post-user-info">
                <h4 onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #3498db;">
                    ${post.autor.nombre}
                </h4>
                <p onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                    @${post.autor.username}
                </p>
            </div>
            <div class="post-time">${new Date(post.fecha_publicacion).toLocaleString()}</div>
            
            ${isAuthor && !isSharedPost ? `
    <div class="post-options">
        <button class="btn-icon post-options-btn" id="modalOptionsBtn-${post._id}">
            <i class="fas fa-ellipsis-h"></i>
        </button>
        <div class="post-options-menu" id="modalOptionsMenu-${post._id}">
            <button class="option-item edit-option" onclick="editPost('${post._id}'); closeModal('post');">
                <i class="fas fa-edit"></i>
                <span>Editar publicación</span>
            </button>
            <button class="option-item delete-option" onclick="confirmDeletePost('${post._id}'); closeModal('post');">
                <i class="fas fa-trash"></i>
                <span>Eliminar publicación</span>
            </button>
        </div>
    </div>
` : ''}
        </div>
            
            <div class="post-content">
                ${formatPostContent(post.contenido)}
            </div>
            
            ${post.imagen ? `
                <div class="post-media-container-adjusted">
                    <img src="${post.imagen}" alt="Imagen de publicación" class="post-image-modal">
                </div>
            ` : ''}

            ${post.audio ? `
                <div class="post-media-container-adjusted">
                    <div class="audio-player-container">
                        <audio controls class="audio-player">
                            <source src="${post.audio}" type="audio/mpeg">
                            <source src="${post.audio}" type="audio/wav">
                            Tu navegador no soporta el elemento de audio.
                        </audio>
                        ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                    </div>
                </div>
            ` : ''}

            ${post.video ? `
                <div class="post-media-container-adjusted">
                    <div class="video-player-container">
                        <video controls class="video-player">
                            <source src="${post.video}" type="video/mp4">
                            <source src="${post.video}" type="video/webm">
                            Tu navegador no soporta el elemento de video.
                        </video>
                        ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                    </div>
                </div>
            ` : ''}

            ${isSharedPost && post.postOriginal ? `
    <div class="original-post-preview-adjusted">
        <div class="original-post-header-adjusted">
            <div class="original-post-avatar-adjusted">
                ${post.postOriginal.autor.foto_perfil ? 
                    `<img src="${post.postOriginal.autor.foto_perfil}" alt="${post.postOriginal.autor.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="original-post-info-adjusted">
                <strong class="original-post-name">${post.postOriginal.autor.nombre}</strong>
                <span class="original-post-username">@${post.postOriginal.autor.username}</span>
            </div>
            <div class="original-post-time">${getTimeAgo(new Date(post.postOriginal.fecha_publicacion))}</div>
        </div>
        <div class="original-post-content-adjusted">
            ${formatPostContent(post.postOriginal.contenido)}
        </div>
        
        <!-- AGREGAR AQUÍ LOS MEDIOS DEL POST ORIGINAL EN EL MODAL -->
        ${post.postOriginal.imagen ? `
            <div class="original-post-media-container">
                <img src="${post.postOriginal.imagen}" alt="Imagen" class="original-post-image-adjusted">
            </div>
        ` : ''}
        
        ${post.postOriginal.audio ? `
            <div class="original-post-media-container">
                <div class="audio-player-container">
                    <audio controls class="audio-player">
                        <source src="${post.postOriginal.audio}" type="audio/mpeg">
                        <source src="${post.postOriginal.audio}" type="audio/wav">
                        Tu navegador no soporta el elemento de audio.
                    </audio>
                    ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                </div>
            </div>
        ` : ''}
        
        ${post.postOriginal.video ? `
            <div class="original-post-media-container">
                <div class="video-player-container">
                    <video controls class="video-player">
                        <source src="${post.postOriginal.video}" type="video/mp4">
                        <source src="${post.postOriginal.video}" type="video/webm">
                        Tu navegador no soporta el elemento de video.
                    </video>
                    ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                </div>
            </div>
        ` : ''}
    </div>
` : ''}
        </div>

        <!-- Estadísticas -->
        <div class="post-stats-adjusted">
            <div class="stats-container">
                <span class="stat-item">
                    <i class="fas fa-heart"></i>
                    <span id="likesCountModal">${post.likes.length}</span> me gusta
                </span>
                <span class="stat-item">
                    <i class="fas fa-comment"></i>
                    <span id="comentariosCountModal">${post.comentarios?.length || 0}</span> comentarios
                </span>
                ${shareCount > 0 ? `
                    <span class="stat-item">
                        <i class="fas fa-share"></i>
                        <span>${shareCount}</span> compartidos
                    </span>
                ` : ''}
            </div>
        </div>

        <!-- Acciones -->
        <div class="post-actions-modal-adjusted">
            <button class="post-action-btn ${isLiked ? 'liked' : ''}" id="likeBtnModal">
                <i class="fas ${isLiked ? 'fa-heart' : 'far fa-heart'}"></i>
                <span>Me gusta</span>
            </button>
            <button class="post-action-btn" id="commentBtnModal">
                <i class="far fa-comment"></i>
                <span>Comentar</span>
            </button>
            <button class="post-action-btn" id="shareBtnModal">
                <i class="fas fa-share"></i>
                <span>Compartir</span>
            </button>
        </div>

       <!-- Sección de Comentarios INTEGRADA CON EL DISEÑO DEL MODAL -->
        <div class="comentarios-section-modal-integrated">
            <!-- Header de comentarios -->
            <div class="comentarios-header-integrated">
                <h4 class="comentarios-title">
                    <i class="fas fa-comments"></i> Comentarios
                    <span class="comentarios-count">(${post.comentarios?.length || 0})</span>
                </h4>
            </div>
            
            <!-- Lista de comentarios con scroll -->
            <div class="lista-comentarios-modal" id="listaComentariosModal">
                <div class="empty-comments">
                    <i class="fas fa-comments"></i>
                    <p>Cargando comentarios...</p>
                </div>
            </div>

            <!-- Área de comentario FIJA adaptada al modal -->
            <div class="comentario-fixed-modal">
                <div class="comentario-fixed-content-modal">
                    <div class="comentario-avatar-modal">
                        ${currentUser.foto_perfil ? 
                            `<img src="${currentUser.foto_perfil}" alt="${currentUser.nombre}">` : 
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="comentario-input-modal">
                        <textarea 
                            id="nuevoComentario" 
                            placeholder="Escribe un comentario..." 
                            rows="1"
                        ></textarea>
                    </div>
                    <button class="btn-comentario-modal" id="btnEnviarComentario" disabled>
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="char-counter-modal">
                    <span id="comentarioCharCount"> </span>
                </div>
            </div>
        </div>
    `;

    // Configurar eventos
    setupModalEvents(post, isLiked, shareCount);
    loadComentariosModal(post._id);
    openModal('post');
}

function setupModalEvents(post, isLiked, shareCount) {
    // Evento para like
    const likeBtnModal = document.getElementById('likeBtnModal');
    likeBtnModal.onclick = () => handleLikeModal(post._id);
    
    // Evento para comentar (focus en textarea)
    const commentBtnModal = document.getElementById('commentBtnModal');
    const comentarioTextarea = document.getElementById('nuevoComentario');
    commentBtnModal.onclick = () => {
        comentarioTextarea.focus();
        comentarioTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    
    // Evento para compartir
    const shareBtnModal = document.getElementById('shareBtnModal');
    shareBtnModal.onclick = () => handleShareModal(post._id);
    
    // Evento para el botón de opciones
    const modalOptionsBtn = document.getElementById(`modalOptionsBtn-${post._id}`);
    if (modalOptionsBtn) {
        modalOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modalOptionsMenu = document.getElementById(`modalOptionsMenu-${post._id}`);
            if (modalOptionsMenu) {
                modalOptionsMenu.style.display = modalOptionsMenu.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    
    // Inicializar eventos del comentario
    initializeComentarioEvents();
}

async function handleLikeModal(postId) {
    const likeBtn = document.getElementById('likeBtnModal');
    const likeIcon = likeBtn.querySelector('i');
    const likesCount = document.getElementById('likesCountModal');
    
    const wasLiked = likeBtn.classList.contains('liked');
    const currentCount = parseInt(likesCount.textContent);
    
    if (!wasLiked) {
        likeBtn.classList.add('liked');
        likeIcon.className = 'fas fa-heart';
        likesCount.textContent = currentCount + 1;
    } else {
        likeBtn.classList.remove('liked');
        likeIcon.className = 'far fa-heart';
        likesCount.textContent = currentCount - 1;
    }
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            if (!wasLiked) {
                likeBtn.classList.remove('liked');
                likeIcon.className = 'far fa-heart';
                likesCount.textContent = currentCount;
            } else {
                likeBtn.classList.add('liked');
                likeIcon.className = 'fas fa-heart';
                likesCount.textContent = currentCount;
            }
        }
    } catch (error) {
        console.error('Error dando like:', error);
        if (!wasLiked) {
            likeBtn.classList.remove('liked');
            likeIcon.className = 'far fa-heart';
            likesCount.textContent = currentCount;
        } else {
            likeBtn.classList.add('liked');
            likeIcon.className = 'fas fa-heart';
            likesCount.textContent = currentCount;
        }
    }
}


async function handleShareModal(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Publicación compartida exitosamente', 'success');
            closeModal('post');
            
            // Recargar el feed para mostrar el nuevo post compartido
            setTimeout(() => {
                loadFeed();
            }, 500);
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error compartiendo publicación:', error);
        showToast('❌ Error al compartir la publicación', 'error');
    }
}

// ========== COMENTARIOS ==========
function initializeComentarioEvents() {
    const comentarioTextarea = document.getElementById('nuevoComentario');
    const btnEnviarComentario = document.getElementById('btnEnviarComentario');
    
    if (!comentarioTextarea || !btnEnviarComentario) {
        console.error('❌ Elementos de comentario no encontrados');
        return;
    }

    console.log('✅ Inicializando eventos de comentarios...');

    // Habilitar/deshabilitar botón según contenido
    comentarioTextarea.addEventListener('input', function() {
        const hasText = this.value.trim().length > 0;
        btnEnviarComentario.disabled = !hasText;
        
        // Auto-ajustar altura
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Enviar con Enter (Ctrl+Enter para nueva línea)
    comentarioTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            if (!btnEnviarComentario.disabled) {
                enviarComentarioModal();
            }
        }
    });
    
    // Evento de clic en el botón enviar
    btnEnviarComentario.addEventListener('click', enviarComentarioModal);
}


// FUNCIÓN CORREGIDA - Cargar comentarios del modal
async function loadComentariosModal(postId) {
    console.log('🔄 Cargando comentarios para post:', postId);
    
    const listaComentarios = document.getElementById('listaComentariosModal');
    if (!listaComentarios) {
        console.error('❌ Elemento listaComentariosModal no encontrado');
        return;
    }

    try {
        // Mostrar loading
        listaComentarios.innerHTML = `
            <div class="empty-comments">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando comentarios...</p>
            </div>
        `;

        const response = await fetch(`${API_URL}/posts/${postId}/comentarios`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📨 Respuesta comentarios:', result);

        if (result.success && result.data && result.data.length > 0) {
            console.log(`✅ ${result.data.length} comentarios encontrados`);
            
            const comentariosHTML = result.data.map(comentario => {
                // VERIFICACIÓN DE SEGURIDAD con los nuevos nombres de campo
                const usuario = comentario.usuario || {};
                const nombre = usuario.nombre || 'Usuario';
                const username = usuario.username || 'usuario';
                const foto_perfil = usuario.foto_perfil || '';
                const contenido = comentario.contenido || '';
                
                // CORREGIR: Manejo de fecha - probar diferentes campos de fecha
                const fechaComentario = comentario.fecha_creacion || 
                                      comentario.fecha_publicacion || 
                                      comentario.createdAt ||
                                      comentario.fecha;
                
                const fechaDisplay = fechaComentario ? 
                    getTimeAgo(new Date(fechaComentario)) : 
                    'Recién';
                
                console.log('📅 Fecha comentario:', { 
                    fechaComentario, 
                    fechaDisplay,
                    campos: Object.keys(comentario) 
                });
                
                return `
                    <div class="comentario-item">
                        <div class="comentario-avatar">
                            ${foto_perfil ? 
                                `<img src="${foto_perfil}" alt="${nombre}">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="comentario-content">
                            <div class="comentario-header">
                                <span class="comentario-user">${nombre}</span>
                                <span class="comentario-time">${fechaDisplay}</span>
                            </div>
                            <div class="comentario-text">${contenido}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            listaComentarios.innerHTML = comentariosHTML;
            
            // Scroll al final de los comentarios
            setTimeout(() => {
                listaComentarios.scrollTop = listaComentarios.scrollHeight;
            }, 100);
            
        } else {
            console.log('ℹ️ No hay comentarios o respuesta vacía');
            listaComentarios.innerHTML = `
                <div class="empty-comments">
                    <i class="fas fa-comments"></i>
                    <p>No hay comentarios aún</p>
                    <small>Sé el primero en comentar</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error cargando comentarios:', error);
        listaComentarios.innerHTML = `
            <div class="empty-comments error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar comentarios</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function displayComentarios(comentarios) {
    const listaComentarios = document.getElementById('listaComentarios');
    const comentariosCount = document.getElementById('comentariosCountModal');
    
    comentariosCount.textContent = comentarios.length;
    
    if (comentarios.length === 0) {
        listaComentarios.innerHTML = `
            <div class="comentario-vacio-facebook">
                <i class="far fa-comment-dots"></i>
                <p>No hay comentarios aún</p>
                <small>Sé el primero en comentar</small>
            </div>
        `;
        return;
    }
    
    listaComentarios.innerHTML = comentarios.map(comentario => `
        <div class="comentario-item-facebook">
            <div class="comentario-avatar-facebook">
                ${comentario.usuario.foto_perfil ? 
                    `<img src="${comentario.usuario.foto_perfil}" alt="${comentario.usuario.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="comentario-content-facebook">
                <div class="comentario-bubble">
                    <div class="comentario-header-facebook">
                        <span class="comentario-user-facebook">${comentario.usuario.nombre}</span>
                        <span class="comentario-time-facebook">${getTimeAgo(new Date(comentario.fecha))}</span>
                    </div>
                    <div class="comentario-text-facebook">${comentario.contenido}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    listaComentarios.scrollTop = listaComentarios.scrollHeight;
}

async function enviarComentarioModal() {
    console.log('🔄 Intentando enviar comentario...');
    
    const comentarioTextarea = document.getElementById('nuevoComentario');
    const btnEnviarComentario = document.getElementById('btnEnviarComentario');
    
    if (!comentarioTextarea || !btnEnviarComentario || !currentPostId) {
        console.error('❌ Elementos necesarios no disponibles');
        return;
    }
    
    const contenido = comentarioTextarea.value.trim();
    if (!contenido) {
        console.error('❌ Contenido de comentario vacío');
        return;
    }

    try {
        console.log('📤 Enviando comentario:', { 
            postId: currentPostId, 
            contenido: contenido,
            usuario: currentUser._id 
        });
        
        btnEnviarComentario.disabled = true;
        btnEnviarComentario.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // USAR LOS NOMBRES DE CAMPO CORRECTOS que espera el servidor
        const requestBody = {
            usuario: currentUser._id,  // CAMBIADO: userId -> usuario
            contenido: contenido       // CAMBIADO: texto -> contenido
        };
        
        console.log('📦 Request body (CORREGIDO):', requestBody);
        
        const response = await fetch(`${API_URL}/posts/${currentPostId}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📨 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Respuesta enviar comentario:', result);
        
        if (result.success) {
            // Limpiar textarea
            comentarioTextarea.value = '';
            comentarioTextarea.style.height = 'auto';
            
            // Recargar comentarios
            await loadComentariosModal(currentPostId);
            
            // Actualizar contador de comentarios
            const comentariosCount = document.getElementById('comentariosCountModal');
            if (comentariosCount) {
                const currentCount = parseInt(comentariosCount.textContent) || 0;
                comentariosCount.textContent = currentCount + 1;
            }
            
            showToast('✅ Comentario publicado', 'success');
        } else {
            throw new Error(result.error || 'Error desconocido del servidor');
        }
    } catch (error) {
        console.error('❌ Error enviando comentario:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    } finally {
        btnEnviarComentario.disabled = false;
        btnEnviarComentario.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

async function handleNuevoComentario() {
    const comentarioInput = document.getElementById('nuevoComentario');
    const enviarBtn = document.getElementById('enviarComentario');
    const contenido = comentarioInput.value.trim();
    
    if (!contenido || !currentPostId) return;
    
    enviarBtn.disabled = true;
    comentarioInput.disabled = true;
    
    try {
        const comentarioData = {
            usuario: currentUser._id,
            contenido: contenido
        };
        
        const response = await fetch(`${API_URL}/posts/${currentPostId}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comentarioData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            comentarioInput.value = '';
            comentarioInput.style.height = 'auto';
            loadComentarios(currentPostId);
            
            const comentarioBtn = document.querySelector(`#viewBtn-${currentPostId}`);
            if (comentarioBtn) {
                const countSpan = comentarioBtn.querySelector('span');
                const currentCount = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = currentCount + 1;
            }
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error agregando comentario:', error);
        showToast('❌ Error de conexión', 'error');
    } finally {
        comentarioInput.disabled = false;
        comentarioInput.focus();
    }
}

// ========== NAVEGACIÓN ==========
function showSection(sectionId) {
    // Limpiar mensajes si estamos saliendo de esa sección
    const currentActive = document.querySelector('.content-section.active');
    if (currentActive && currentActive.id === 'messagesSection' && sectionId !== 'messages') {
        if (typeof cleanupMessages === 'function') {
            cleanupMessages();
        }
    }
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los botones de navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId + 'Section').classList.add('active');
    
    // Activar el botón de navegación correspondiente
    const activeButton = document.querySelector(`.nav-item[onclick*="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // MOSTRAR/OCULTAR FORMULARIO DE CREAR PUBLICACIÓN
    const createPostCard = document.querySelector('.create-post-card');
    if (createPostCard) {
        createPostCard.style.display = sectionId === 'feed' ? 'block' : 'none';
    }
    
    // CARGAR LOS DATOS DE LA SECCIÓN
    switch(sectionId) {
        case 'feed': 
            loadFeed(); 
            break;
        case 'profile': 
            // LIMPIAR el usuario que estábamos viendo y cargar nuestro perfil
            localStorage.removeItem('viewingUserProfile');
            loadUserProfile(); 
            break;
        case 'explore': 
            loadExplore(); 
            break;
        case 'users': 
            loadUsers(); 
            break;
        case 'messages':
            // Pequeño delay para asegurar que el DOM esté listo
            setTimeout(() => {
                if (typeof initializeMessages === 'function') {
                    initializeMessages();
                }
            }, 100);
            break;
    }
}

// ========== SECCIONES ==========
async function loadUserProfile() {
    const userProfile = document.getElementById('userProfile');
    
    userProfile.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar-large">
                    ${currentUser.foto_perfil ? 
                        `<img src="${currentUser.foto_perfil}" alt="${currentUser.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="profile-info">
                    <h2>${currentUser.nombre}</h2>
                    <p>@${currentUser.username}</p>
                    <p class="profile-bio">${currentUser.biografia || 'Aún no has agregado una biografía'}</p>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail">
                    <strong>Email:</strong>
                    <span>${currentUser.email}</span>
                </div>
                <div class="detail">
                    <strong>Fecha de nacimiento:</strong>
                    <span>${currentUser.fecha_nacimiento ? new Date(currentUser.fecha_nacimiento).toLocaleDateString() : 'No especificada'}</span>
                </div>
                <div class="detail">
                    <strong>Género:</strong>
                    <span>${getGenderDisplay(currentUser.genero)}</span>
                </div>
                <div class="detail">
                    <strong>Ubicación:</strong>
                    <span>${currentUser.ubicacion || 'No especificada'}</span>
                </div>
                <div class="detail">
                    <strong>Fecha de registro:</strong>
                    <span>${new Date(currentUser.fecha_registro).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="profile-actions">
                <button id="submitPost" onclick="editProfile()">
                    <i class="fas fa-edit"></i> Editar Perfil
                </button>
            </div>
        </div>
    `;
}

async function loadExplore() {
    const exploreContent = document.getElementById('exploreContent');
    
    try {
        exploreContent.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando publicaciones...</p>
            </div>
        `;

        const response = await fetch(`${API_URL}/posts?limit=20`);
        const result = await response.json();
        
        if (result.success) {
            exploreContent.innerHTML = `
                <h3 style="color: #2c3e50; margin-bottom: 1.5rem; font-size: 1.4rem;">
                    <i class="fas fa-compass"></i> Explorar Publicaciones
                </h3>
                <div class="posts-feed" id="explorePostsFeed">
                    ${result.data.map(post => createPostHTML(post)).join('')}
                </div>
            `;
            
            initializePostInteractions('explorePostsFeed', result.data);
            
        } else {
            exploreContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Error al cargar las publicaciones</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando exploración:', error);
        exploreContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi" style="color: #e74c3c; font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Error de conexión al cargar exploración</p>
            </div>
        `;
    }
}

async function loadUsers() {
    const usersList = document.getElementById('usersList');
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        usersList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando usuarios...</p>
            </div>
        `;

        const response = await fetch(`${API_URL}/users`);
        const result = await response.json();
        
        if (result.success) {
            const otherUsers = result.data.filter(user => user._id !== currentUser._id);
            
            // Verificar seguimiento para cada usuario
            const usersWithFollowStatus = await Promise.all(
                otherUsers.map(async (user) => {
                    const isFollowing = currentUser.seguidos?.includes(user._id);
                    return { ...user, isFollowing };
                })
            );
            
            usersList.innerHTML = `
                <div class="section-header">
                    <h3><i class="fas fa-users"></i> Todos los Usuarios</h3>
                    <p>Conecta con otros usuarios de la comunidad</p>
                </div>
                <div class="users-grid" id="usersGrid">
                    ${usersWithFollowStatus.map(user => createUserCardHTML(user)).join('')}
                </div>
            `;
            
        } else {
            usersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar usuarios</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi"></i>
                <p>Error de conexión</p>
            </div>
        `;
    }
}


// En createUserCardHTML - SIMPLIFICA el HTML
function createUserCardHTML(user) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isCurrentUser = currentUser._id === user._id;
    const isFollowing = currentUser.seguidos?.includes(user._id);
    const isFollower = currentUser.seguidores?.includes(user._id);
    const isBlocked = currentUser.usuarios_bloqueados?.includes(user._id);
    
    return `
        <div class="user-card-main" data-user-id="${user._id}">
            <!-- Menú de opciones -->
            <div class="user-card-options">
                ${!isCurrentUser ? `
                    <button class="btn-options" onclick="toggleOptionsMenu('${user._id}', event)">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="options-menu" id="optionsMenu-${user._id}">
                        ${isBlocked ? `
                            <button class="option-item unblock-option" data-user-id="${user._id}">
                                <i class="fas fa-lock-open"></i>
                                <span>Desbloquear</span>
                            </button>
                        ` : `
                            <button class="option-item block-option" data-user-id="${user._id}" data-user-name="${user.nombre}">
                                <i class="fas fa-ban"></i>
                                <span>Bloquear usuario</span>
                            </button>
                            ${isFollower ? `
                                <button class="option-item remove-follower-option" data-user-id="${user._id}">
                                    <i class="fas fa-user-times"></i>
                                    <span>Eliminar seguidor</span>
                                </button>
                            ` : ''}
                        `}
                    </div>
                ` : ''}
            </div>


            <div class="user-card-header">
                <div class="user-avatar-medium">
                    ${user.foto_perfil ? 
                        `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="user-info">
                    <h4>${user.nombre} </h4>
                    <p class="user-username">@${user.username} ${isBlocked ? `<span class="blocked-indicator">BLOQUEADO</span>` : ''}</p>
                    ${user.biografia ? `<p class="user-bio">${user.biografia}</p>` : ''}
                </div>
            </div>
            
            <div class="user-stats">
                <div class="stat">
                    <strong>${user.seguidores?.length || 0}</strong>
                    <span>Seguidores</span>
                </div>
                <div class="stat">
                    <strong>${user.seguidos?.length || 0}</strong>
                    <span>Seguidos</span>
                </div>
            </div>
            
            <div class="user-actions">
                <button class="btn-view-profile" onclick="viewUserProfile('${user._id}')">
                    <i class="fas fa-eye"></i> Ver Perfil
                </button>
                ${!isCurrentUser && !isBlocked ? `
                    <button class="btn-follow ${isFollowing ? 'following' : ''}" 
                            onclick="toggleFollow('${user._id}')">
                        <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                        ${isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Si tienes botones pequeños en otros lugares, agrega esta función también
function updateSmallFollowButton(userId, isFollowing) {
    const button = document.querySelector(`button[onclick="toggleFollow('${userId}')"].btn-small`);
    if (button) {
        button.innerHTML = isFollowing ? 
            '<i class="fas fa-user-check"></i> Siguiendo' : 
            '<i class="fas fa-user-plus"></i> Seguir';
        
        button.className = isFollowing ? 
            'btn-secondary btn-small following' : 
            'btn-secondary btn-small';
    }
}


// ========== UTILIDADES ==========



function formatPostContent(content) {
    return content.replace(/#[\wáéíóúñ]+/g, '<span class="hashtag">$&</span>');
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    
    return date.toLocaleDateString();
}

function getGenderDisplay(gender) {
    const genderMap = {
        'masculino': 'Masculino',
        'femenino': 'Femenino',
        'otro': 'Otro',
        'prefiero_no_decir': 'Prefiero no decir'
    };
    return genderMap[gender] || 'No especificado';
}

function openModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

function closeModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        
        if (type === 'post') {
            currentPostId = null;
            document.getElementById('nuevoComentario').value = '';
        }
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    // Limpiar timeout anterior
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    // Evitar animaciones raras
    toast.style.transition = 'none';
    setTimeout(() => {
        toast.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    }, 30);

    toastMessage.textContent = message;

    switch (type) {
        case 'error':
            toast.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            toastIcon.className = 'fas fa-exclamation-circle toast-icon';
            break;
        case 'info':
            toast.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
            toastIcon.className = 'fas fa-info-circle toast-icon';
            break;
        default:
            toast.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            toastIcon.className = 'fas fa-check-circle toast-icon';
    }

    // Mostrar
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 20);

    const duration = type === 'error' ? 10000 : type === 'info' ? 8000 : 6000;

    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => (toast.style.display = 'none'), 350);
    }, duration);
}



function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

function toggleImageUpload() {
    const uploadContainer = document.getElementById('imageUpload');
    uploadContainer.style.display = uploadContainer.style.display === 'none' ? 'block' : 'none';
}


function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            showToast('❌ Por favor selecciona una imagen válida', 'error');
            event.target.value = '';
            return;
        }
        
        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('❌ La imagen no debe superar los 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML = `
                <div class="image-preview-item">
                    <img src="${e.target.result}" alt="Vista previa" class="preview-image">
                    <button type="button" class="btn-remove-preview" onclick="removeImagePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}


function focusComentario() {
    const comentarioInput = document.getElementById('nuevoComentario');
    if (comentarioInput) comentarioInput.focus();
}

// Funciones placeholder
function editProfile() { showToast('🔧 Función en desarrollo', 'info'); }

async function viewUserProfile(userId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        // Obtener datos del usuario
        const userResponse = await fetch(`${API_URL}/users/${userId}`);
        const userResult = await userResponse.json();
        
        if (!userResult.success) {
            showToast('❌ Error al cargar el perfil', 'error');
            return;
        }
        
        const user = userResult.data;
        const isCurrentUser = user._id === currentUser._id;
        const isFollowing = currentUser.seguidos?.includes(userId);
        
        // Crear modal de perfil
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'userProfileModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user"></i> Perfil de Usuario</h3>
                    <span class="close-modal" onclick="closeUserProfileModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="user-profile-modal">
                        <div class="profile-header-modal">
                            <div class="profile-avatar-large">
                                ${user.foto_perfil ? 
                                    `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div class="profile-info-modal">
                                <h2>${user.nombre}</h2>
                                <p class="username">@${user.username}</p>
                                ${user.biografia ? `<p class="bio">${user.biografia}</p>` : ''}
                            </div>
                        </div>
                        
                        <div class="profile-stats-modal">
                            <div class="stat">
                                <strong>${user.seguidores?.length || 0}</strong>
                                <span>Seguidores</span>
                            </div>
                            <div class="stat">
                                <strong>${user.seguidos?.length || 0}</strong>
                                <span>Seguidos</span>
                            </div>
                            <div class="stat">
                                <strong>${user.fecha_registro ? new Date(user.fecha_registro).getFullYear() : 'N/A'}</strong>
                                <span>Se unió</span>
                            </div>
                        </div>
                        
                        ${user.intereses && user.intereses.length > 0 ? `
                            <div class="profile-interests">
                                <h4>Intereses</h4>
                                <div class="interests-list">
                                    ${user.intereses.map(interes => `
                                        <span class="interest-tag">${interes}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="profile-actions-modal">
                            ${!isCurrentUser ? `
                                <button class="btn-follow-large ${isFollowing ? 'following' : ''}" 
                                        onclick="toggleFollowModal('${user._id}')">
                                    <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                                    ${isFollowing ? 'Siguiendo' : 'Seguir'}
                                </button>
                            ` : `
                                <button class="btn-secondary" onclick="window.location.href='profile.html'">
                                    <i class="fas fa-user-edit"></i> Mi Perfil
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        openModal('userProfile');
        
    } catch (error) {
        console.error('Error cargando perfil de usuario:', error);
        showToast('❌ Error al cargar el perfil', 'error');
    }
}

async function toggleFollowModal(userId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        const isFollowing = currentUser.seguidos?.includes(userId);
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        
        const response = await fetch(`${API_URL}/users/${userId}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Actualizar localStorage
            if (isFollowing) {
                currentUser.seguidos = currentUser.seguidos.filter(id => id !== userId);
            } else {
                if (!currentUser.seguidos) currentUser.seguidos = [];
                currentUser.seguidos.push(userId);
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Cerrar modal y recargar
            closeUserProfileModal();
            setTimeout(() => {
                if (document.getElementById('usersSection').classList.contains('active')) {
                    loadUsers();
                }
            }, 500);
            
        } else {
            if (response.status === 403) {
                showToast(`❌ ${result.error}`, 'error');
                closeUserProfileModal();
                setTimeout(() => {
                    if (document.getElementById('usersSection').classList.contains('active')) {
                        loadUsers();
                    }
                }, 1000);
            } else {
                showToast(`❌ ${result.error}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error en follow/unfollow modal:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}




async function toggleFollow(userId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        // Verificar estado actual
        const isFollowing = currentUser.seguidos?.includes(userId);
        
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        
        const response = await fetch(`${API_URL}/users/${userId}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Actualizar currentUser en localStorage
            if (isFollowing) {
                // Dejar de seguir
                currentUser.seguidos = currentUser.seguidos.filter(id => id !== userId);
            } else {
                // Seguir
                if (!currentUser.seguidos) currentUser.seguidos = [];
                currentUser.seguidos.push(userId);
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Actualizar el botón en la interfaz
            updateFollowButton(userId, !isFollowing);
            
            // Actualizar contadores en sidebar
            updateSidebarCounters();
            
        } else {
            // Manejar error específico de bloqueo
            if (response.status === 403) {
                showToast(`❌ ${result.error}`, 'error');
                // Si el usuario está bloqueado, recargar la lista para reflejar el estado actual
                setTimeout(() => {
                    if (document.getElementById('usersSection').classList.contains('active')) {
                        loadUsers();
                    }
                }, 1000);
            } else {
                showToast(`❌ ${result.error}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error en follow/unfollow:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

function updateFollowButton(userId, isFollowing) {
    const button = document.querySelector(`button[onclick="toggleFollow('${userId}')"]`);
    if (button) {
        // Actualizar el HTML completo del botón, no solo el texto
        button.innerHTML = isFollowing ? 
            '<i class="fas fa-user-check"></i> Siguiendo' : 
            '<i class="fas fa-user-plus"></i> Seguir';
        
        button.className = isFollowing ? 
            'btn-follow following' : 
            'btn-follow';
    }
}

function updateSidebarCounters() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    document.getElementById('seguidoresCount').textContent = currentUser.seguidores?.length || 0;
    document.getElementById('seguidosCount').textContent = currentUser.seguidos?.length || 0;
}

// ========== FUNCIONALIDAD DE ELIMINACIÓN ==========

// Función para mostrar/ocultar menú de opciones del post
function togglePostOptions(postId, event) {
    event.stopPropagation();
    closeAllPostOptions();
    
    const optionsMenu = document.getElementById(`optionsMenu-${postId}`);
    if (optionsMenu) {
        optionsMenu.style.display = 'block';
    }
}

// Función para cerrar todos los menús de opciones
function closeAllPostOptions() {
    document.querySelectorAll('.post-options-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

// Función para confirmar eliminación
function confirmDeletePost(postId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'deleteModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Confirmar eliminación</h3>
                <span class="close-modal" onclick="closeDeleteModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p>¿Estás seguro de que quieres eliminar esta publicación?</p>
                <p style="font-size: 0.9rem; color: #7f8c8d; margin-top: 0.5rem;">
                    Esta acción no se puede deshacer.
                </p>
                <div class="form-actions" style="margin-top: 2rem;">
                    <button class="btn-secondary" onclick="closeDeleteModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary" onclick="deletePost('${postId}')" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    openModal('delete');
}

// Función para cerrar el modal de confirmación
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

// Función para eliminar el post
async function deletePost(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Publicación eliminada exitosamente', 'success');
            closeDeleteModal();
            
            // Remover el post del DOM
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                postElement.remove();
            }
            
            // Recargar el feed después de un momento
            setTimeout(() => {
                loadFeed();
            }, 500);
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
            closeDeleteModal();
        }
    } catch (error) {
        console.error('Error eliminando publicación:', error);
        showToast('❌ Error al eliminar la publicación', 'error');
        closeDeleteModal();
    }
}

function makeOptionsFunctionsGlobal() {
    console.log('🌍 Cargando solución RADICAL para menús...');
    
    let activeMenu = null;
    
    // Función para cerrar todos los menús
    window.closeAllOptionsMenus = function() {
        console.log('🔒 Cerrando todos los menús...');
        document.querySelectorAll('.options-menu').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.options-overlay').forEach(overlay => {
            overlay.remove();
        });
        activeMenu = null;
    };
    
    // Función para mostrar/ocultar menús - SIN OVERLAY PROBLEMÁTICO
    window.toggleOptionsMenu = function(userId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        console.log('🎯 Abriendo menú para usuario:', userId);
        
        const menu = document.getElementById(`optionsMenu-${userId}`);
        if (!menu) {
            console.error('❌ Menú no encontrado:', `optionsMenu-${userId}`);
            return;
        }
        
        // Si el menú ya está abierto, cerrarlo
        if (menu.classList.contains('show')) {
            closeAllOptionsMenus();
            return;
        }
        
        // Cerrar otros menús primero
        closeAllOptionsMenus();
        
        // Mostrar este menú
        menu.classList.add('show');
        activeMenu = menu;
        // ========== HACER LAS FUNCIONES GLOBALES ==========
        // En la función makeOptionsFunctionsGlobal o en otro lugar apropiado, agregar:
        window.navigateToUserProfile = navigateToUserProfile;
        window.checkIfUserIsBlocked = checkIfUserIsBlocked;
        window.showBlockedUserModal = showBlockedUserModal;
        window.closeBlockedUserModal = closeBlockedUserModal;
        window.goToMyProfileFromModal = goToMyProfileFromModal;
        
        console.log('✅ Menú mostrado correctamente');
    };

    // ========== FUNCIONES DE MODALES DE CONFIRMACIÓN ==========

function showBlockConfirmModal(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'blockConfirmModal';
    modal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon block">
                <i class="fas fa-ban"></i>
            </div>
            <h3 class="confirm-modal-title">¿Bloquear usuario?</h3>
            
            <div class="confirm-modal-user">
                <div class="confirm-modal-user-name">${userName}</div>
                ${userUsername ? `<div class="confirm-modal-user-username">@${userUsername}</div>` : ''}
            </div>
            
            <p class="confirm-modal-message">
                Al bloquear a ${userName}:
                <br><br>
                • No podrá ver tu perfil ni publicaciones<br>
                • No podrá seguirte ni enviarte mensajes<br>
                • Se eliminará de tus seguidores y seguidos<br>
                • No podrá interactuar contigo de ninguna forma
            </p>
            
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn confirm-modal-btn-cancel" id="cancelBlockBtn">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="confirm-modal-btn confirm-modal-btn-confirm" id="confirmBlockBtn">
                    <i class="fas fa-ban"></i> Sí, Bloquear
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Agregar event listeners después de crear el modal
    setTimeout(() => {
        modal.classList.add('show');
        
        // Botón Cancelar
        document.getElementById('cancelBlockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Cancelar bloqueo');
            closeConfirmModal('block');
        });
        
        // Botón Confirmar
        document.getElementById('confirmBlockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Confirmar bloqueo');
            confirmBlock(userId, userName);
        });
        
    }, 10);
}

function showUnblockConfirmModal(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'unblockConfirmModal';
    modal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon unblock">
                <i class="fas fa-lock-open"></i>
            </div>
            <h3 class="confirm-modal-title">¿Desbloquear usuario?</h3>
            
            <div class="confirm-modal-user">
                <div class="confirm-modal-user-name">${userName}</div>
                ${userUsername ? `<div class="confirm-modal-user-username">@${userUsername}</div>` : ''}
            </div>
            
            <p class="confirm-modal-message">
                Al desbloquear a ${userName}:
                <br><br>
                • Podrá ver tu perfil y publicaciones nuevamente<br>
                • Podrá seguirte e interactuar contigo<br>
                • Podrá enviarte mensajes<br>
                • Volverá a aparecer en búsquedas
            </p>
            
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn confirm-modal-btn-cancel" id="cancelUnblockBtn">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="confirm-modal-btn confirm-modal-btn-confirm unblock" id="confirmUnblockBtn">
                    <i class="fas fa-lock-open"></i> Sí, Desbloquear
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
        
        document.getElementById('cancelUnblockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Cancelar desbloqueo');
            closeConfirmModal('unblock');
        });
        
        document.getElementById('confirmUnblockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Confirmar desbloqueo');
            confirmUnblock(userId, userName);
        });
        
    }, 10);
}

// Aplica este mismo patrón a showBlockConfirmModal y showUnblockConfirmModal
function showRemoveFollowerConfirmModal(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon remove">
                <i class="fas fa-user-times"></i>
            </div>
            <h3 class="confirm-modal-title">¿Eliminar seguidor?</h3>
            
            <div class="confirm-modal-user">
                <div class="confirm-modal-user-name">${userName}</div>
                ${userUsername ? `<div class="confirm-modal-user-username">@${userUsername}</div>` : ''}
            </div>
            
            <p class="confirm-modal-message">
                Al eliminar a ${userName} de tus seguidores:
                <br><br>
                • Ya no podrá ver tus publicaciones privadas<br>
                • Seguirá pudiendo ver tus publicaciones públicas<br>
                • No se le notificará sobre esta acción<br>
                • Podrá volver a seguirte en el futuro
            </p>
            
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn confirm-modal-btn-cancel" data-action="cancel">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="confirm-modal-btn confirm-modal-btn-confirm remove" data-action="confirm">
                    <i class="fas fa-user-times"></i> Sí, Eliminar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // SINGLE event listener para todo el modal
    modal.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const action = target.dataset.action;
        
        if (action === 'cancel') {
            console.log('❌ Cancelar eliminación de seguidor');
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        } 
        else if (action === 'confirm') {
            console.log('✅ Confirmar eliminación de seguidor');
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                executeRemoveFollower(userId);
            }, 300);
        }
    });
    
    setTimeout(() => modal.classList.add('show'), 10);
}

window.closeConfirmModal = function(type) {
    const modal = document.getElementById(`${type}ConfirmModal`);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            console.log(`✅ Modal ${type} cerrado y removido`);
        }, 300);
    }
}

    // FUNCIONES DE CONFIRMACIÓN (hacerlas globales)
    window.confirmBlock = function(userId, userName) {
        console.log('✅ Confirmado bloqueo para:', userId, userName);
        closeConfirmModal('block');
        executeBlock(userId, userName);
    }

    window.confirmUnblock = function(userId, userName) {
        console.log('✅ Confirmado desbloqueo para:', userId, userName);
        closeConfirmModal('unblock');
        executeUnblock(userId, userName);
    }

    window.confirmRemoveFollower = function(userId, userName) {
        console.log('✅ Confirmada eliminación de seguidor para:', userId, userName);
        closeConfirmModal('remove');
        executeRemoveFollower(userId);
    }

    // FUNCIONES DE EJECUCIÓN
    function executeBlock(userId, userName) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        showToast('⏳ Bloqueando usuario...', 'info');
        
        fetch(`${API_URL}/users/${userId}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('✅ Usuario bloqueado exitosamente', 'success');
                
                // Actualizar localStorage
                if (!currentUser.usuarios_bloqueados) currentUser.usuarios_bloqueados = [];
                if (!currentUser.usuarios_bloqueados.includes(userId)) {
                    currentUser.usuarios_bloqueados.push(userId);
                }
                
                // Remover de seguidores y seguidos
                currentUser.seguidores = currentUser.seguidores?.filter(id => id !== userId) || [];
                currentUser.seguidos = currentUser.seguidos?.filter(id => id !== userId) || [];
                
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Recargar la lista de usuarios
                setTimeout(() => {
                    if (document.getElementById('usersSection').classList.contains('active')) {
                        loadUsers();
                    }
                }, 1000);
                
            } else {
                showToast('❌ Error: ' + result.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error bloqueando usuario:', error);
            showToast('❌ Error de conexión', 'error');
        });
    }

    function executeUnblock(userId, userName) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        showToast('⏳ Desbloqueando usuario...', 'info');
        
        fetch(`${API_URL}/users/${userId}/unblock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('✅ Usuario desbloqueado exitosamente', 'success');
                
                // Actualizar localStorage
                currentUser.usuarios_bloqueados = currentUser.usuarios_bloqueados?.filter(id => id !== userId) || [];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Recargar la lista de usuarios
                setTimeout(() => {
                    if (document.getElementById('usersSection').classList.contains('active')) {
                        loadUsers();
                    }
                }, 1000);
                
            } else {
                showToast('❌ Error: ' + result.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error desbloqueando usuario:', error);
            showToast('❌ Error de conexión', 'error');
        });
    }

    function executeRemoveFollower(userId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        showToast('⏳ Eliminando seguidor...', 'info');
        
        fetch(`${API_URL}/users/${userId}/remove-follower`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('✅ Seguidor eliminado exitosamente', 'success');
                
                // Actualizar localStorage
                currentUser.seguidores = currentUser.seguidores?.filter(id => id !== userId) || [];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateSidebarCounters();
                
                // Recargar la lista de usuarios
                setTimeout(() => {
                    if (document.getElementById('usersSection').classList.contains('active')) {
                        loadUsers();
                    }
                }, 1000);
                
            } else {
                showToast('❌ Error: ' + result.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error eliminando seguidor:', error);
            showToast('❌ Error de conexión', 'error');
        });
    }
    
    // ========== FIN FUNCIONES DE MODALES ==========
    
    // SOLUCIÓN RADICAL: Event listeners DIRECTOS en cada botón
    function initializeRadicalEventListeners() {
        console.log('🔧 Inicializando event listeners RADICALES...');
        
        // Remover todos los listeners existentes primero
        document.querySelectorAll('.block-option, .remove-follower-option, .unblock-option').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        // Agregar listeners DIRECTOS a cada botón
        document.addEventListener('click', function(event) {
            const target = event.target;
            
            // BLOQUEAR USUARIO - DETECCIÓN MUY ESPECÍFICA
            if (target.closest('.block-option')) {
                console.log('🚀 CLICK EN BLOQUEAR DETECTADO RADICALMENTE');
                event.preventDefault();
                event.stopPropagation();
                
                const button = target.closest('.block-option');
                const card = button.closest('[data-user-id]');
                
                if (card && button) {
                    const userId = card.dataset.userId;
                    const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    console.log('🔄 Mostrando modal de bloqueo para:', userId, userName);
                    closeAllOptionsMenus();
                    
                    // Pequeño delay para asegurar que el menú se cierre
                    setTimeout(() => {
                        showBlockConfirmModal(userId, userName, userUsername);
                    }, 100);
                }
                return false;
            }
            
            // ELIMINAR SEGUIDOR
            if (target.closest('.remove-follower-option')) {
                console.log('🚀 CLICK EN ELIMINAR SEGUIDOR DETECTADO RADICALMENTE');
                event.preventDefault();
                event.stopPropagation();
                
                const button = target.closest('.remove-follower-option');
                const card = button.closest('[data-user-id]');
                
                if (card && button) {
                    const userId = card.dataset.userId;
                    const userName = card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    console.log('🔄 Mostrando modal de eliminar seguidor para:', userId, userName);
                    closeAllOptionsMenus();
                    
                    setTimeout(() => {
                        showRemoveFollowerConfirmModal(userId, userName, userUsername);
                    }, 100);
                }
                return false;
            }
            
            // DESBLOQUEAR USUARIO
            if (target.closest('.unblock-option')) {
                console.log('🚀 CLICK EN DESBLOQUEAR DETECTADO RADICALMENTE');
                event.preventDefault();
                event.stopPropagation();
                
                const button = target.closest('.unblock-option');
                const card = button.closest('[data-user-id]');
                
                if (card && button) {
                    const userId = card.dataset.userId;
                    const userName = card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    console.log('🔄 Mostrando modal de desbloqueo para:', userId, userName);
                    closeAllOptionsMenus();
                    
                    setTimeout(() => {
                        showUnblockConfirmModal(userId, userName, userUsername);
                    }, 100);
                }
                return false;
            }
            
            // Cerrar menú si se hace click fuera de él
            if (activeMenu && !target.closest('.options-menu') && !target.closest('.btn-options')) {
                closeAllOptionsMenus();
            }
        }, true); // Usar capture phase para atrapar el evento PRIMERO
        
        // También agregar event listeners DIRECTOS individuales
        document.querySelectorAll('.block-option').forEach(button => {
            button.addEventListener('click', function(e) {
                console.log('🎯 Click DIRECTO en block-option');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const card = this.closest('[data-user-id]');
                if (card) {
                    const userId = card.dataset.userId;
                    const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    closeAllOptionsMenus();
                    setTimeout(() => showBlockConfirmModal(userId, userName, userUsername), 100);
                }
                return false;
            }, true);
        });
        
        document.querySelectorAll('.remove-follower-option').forEach(button => {
            button.addEventListener('click', function(e) {
                console.log('🎯 Click DIRECTO en remove-follower-option');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const card = this.closest('[data-user-id]');
                if (card) {
                    const userId = card.dataset.userId;
                    const userName = card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    closeAllOptionsMenus();
                    setTimeout(() => showRemoveFollowerConfirmModal(userId, userName, userUsername), 100);
                }
                return false;
            }, true);
        });
        
        document.querySelectorAll('.unblock-option').forEach(button => {
            button.addEventListener('click', function(e) {
                console.log('🎯 Click DIRECTO en unblock-option');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const card = this.closest('[data-user-id]');
                if (card) {
                    const userId = card.dataset.userId;
                    const userName = card.querySelector('h4')?.textContent || 'Usuario';
                    const userUsername = card.querySelector('.user-username')?.textContent?.replace('@', '') || '';
                    
                    closeAllOptionsMenus();
                    setTimeout(() => showUnblockConfirmModal(userId, userName, userUsername), 100);
                }
                return false;
            }, true);
        });
    }
    
    // Inicializar después de un delay
    setTimeout(initializeRadicalEventListeners, 500);
    
    console.log('✅ Solución radical con modales cargada');
}

// Función para subir archivo al servidor según el tipo
async function uploadMediaFile(file, fieldName) {
    const formData = new FormData();
    formData.append(fieldName, file); // 'image', 'audio', 'video'
    
    let endpoint = fieldName; // Ahora son iguales
    
    console.log(`📤 Subiendo ${fieldName} a /upload/${endpoint}`);
    
    const response = await fetch(`${API_URL}/upload/${endpoint}`, {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Error al subir el archivo');
    }
    
    return result.data;
}


// Función para manejar la creación de post con cualquier tipo de medio
async function handleCreatePost() {
    console.log('🎯 Iniciando creación de publicación...');
    
    const content = document.getElementById('postContent').value.trim();
    
    let mediaFile = null;
    let mediaType = currentMediaType;
    
    // Obtener el archivo según el tipo de medio seleccionado
    if (mediaType === 'imagen') {
        mediaFile = document.getElementById('postImage').files[0];
    } else if (mediaType === 'audio') {
        mediaFile = document.getElementById('postAudio').files[0];
    } else if (mediaType === 'video') {
        mediaFile = document.getElementById('postVideo').files[0];
    }
    
    console.log('🔍 DEBUG handleCreatePost:');
    console.log(' - Contenido:', content);
    console.log(' - Tipo de medio:', mediaType);
    console.log(' - Archivo:', mediaFile);
    console.log(' - currentMediaType:', currentMediaType);
    
    // VALIDACIÓN SIMPLIFICADA
    if (!content && !mediaFile) {
        console.log('❌ Error: Sin contenido y sin archivo');
        showToast('❌ Escribe algo o selecciona un archivo para publicar', 'error');
        highlightTextareaError();
        return;
    }
    
    console.log('✅ Validación pasada, procediendo a publicar...');
    
    try {
        let mediaUrl = '';
        let mediaFilename = '';
        let duracion = 0;
        
        // Subir archivo si existe
        if (mediaFile) {
            console.log(`📤 Subiendo archivo: ${mediaFile.name}`);
            showToast(`📤 Subiendo ${mediaType}...`, 'info');
            
            const fieldName = mediaType === 'imagen' ? 'image' : mediaType;
            console.log(`📤 Usando fieldName: ${fieldName}`);
            
            try {
                const uploadResult = await uploadMediaFile(mediaFile, fieldName);
                mediaUrl = uploadResult.url;
                mediaFilename = uploadResult.filename;
                duracion = uploadResult.duracion || 0;
                
                console.log('✅ Archivo subido exitosamente:', { mediaUrl, mediaFilename, duracion });
            } catch (uploadError) {
                console.error('❌ Error subiendo archivo:', uploadError);
                showToast('❌ Error al subir el archivo', 'error');
                return;
            }
        }
        
        // Preparar datos del post
        const postData = {
            autor: currentUser._id,
            contenido: content || '',
            tipoContenido: mediaFile ? mediaType : 'texto'
        };
        
        // Agregar duración si es audio o video
        if ((mediaType === 'audio' || mediaType === 'video') && duracion > 0) {
            postData.duracion = duracion;
        }
        
        // Agregar campos específicos según el tipo de medio
        if (mediaType === 'imagen' && mediaUrl) {
            postData.imagen = mediaUrl;
            postData.imagenFilename = mediaFilename;
        } else if (mediaType === 'audio' && mediaUrl) {
            postData.audio = mediaUrl;
            postData.audioFilename = mediaFilename;
        } else if (mediaType === 'video' && mediaUrl) {
            postData.video = mediaUrl;
            postData.videoFilename = mediaFilename;
        }
        
        console.log('📦 Datos a enviar al servidor:', postData);
        
        // Enviar al servidor
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        console.log('📨 Respuesta del servidor - Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 Resultado completo:', result);
        
        if (result.success) {
            showToast('✅ Publicación creada exitosamente', 'success');
            resetPostForm();
            
            // Recargar el feed
            setTimeout(() => {
                loadFeed();
            }, 500);
            
        } else {
            console.error('❌ Error del servidor:', result.error);
            showToast(`❌ Error: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error creando publicación:', error);
        showToast('❌ Error al crear la publicación', 'error');
    }
}
// Función uploadMediaFile simplificada
async function uploadMediaFile(file, fieldName) {
    console.log(`📤 Iniciando upload de ${fieldName}:`, {
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size
    });
    
    const formData = new FormData();
    formData.append(fieldName, file);
    
    const endpoint = fieldName; // 'image', 'audio', 'video'
    
    console.log(`📤 Enviando a: ${API_URL}/upload/${endpoint}`);
    
    try {
        const response = await fetch(`${API_URL}/upload/${endpoint}`, {
            method: 'POST',
            body: formData
            // NO incluir Content-Type header - FormData lo establece automáticamente
        });
        
        console.log('📨 Respuesta recibida - Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 Resultado del upload:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Error desconocido del servidor');
        }
        
        return result.data;
        
    } catch (error) {
        console.error('❌ Error en uploadMediaFile:', error);
        throw error;
    }
}

// Función para resetear el formulario completamente
function resetPostForm() {
    document.getElementById('postContent').value = '';
    document.getElementById('charCount').textContent = '0/500';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('audioPreview').innerHTML = '';
    document.getElementById('videoPreview').innerHTML = '';
    
    // Resetear a tipo imagen por defecto
    document.getElementById('imageUpload').style.display = 'block';
    document.getElementById('audioUpload').style.display = 'none';
    document.getElementById('videoUpload').style.display = 'none';
    
    document.getElementById('postImage').value = '';
    document.getElementById('postAudio').value = '';
    document.getElementById('postVideo').value = '';
    
    currentMediaType = 'imagen';
    
    // Resetear botones activos
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[onclick="changeMediaType(\'imagen\')"]').classList.add('active');
}

function changeMediaType(type) {
    console.log('🔄 Cambiando tipo de medio a:', type);
    
    currentMediaType = type;
    
    // Ocultar todos los uploaders
    document.getElementById('imageUpload').style.display = 'none';
    document.getElementById('audioUpload').style.display = 'none';
    document.getElementById('videoUpload').style.display = 'none';
    
    // Limpiar previews
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('audioPreview').innerHTML = '';
    document.getElementById('videoPreview').innerHTML = '';
    
    // Mostrar el uploader seleccionado
    document.getElementById(`${type}Upload`).style.display = 'block';
    
    // Actualizar botones activos
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Encontrar y activar el botón correcto
    const activeButton = Array.from(document.querySelectorAll('.media-type-btn')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${type}'`)
    );
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Resetear inputs de archivo
    document.getElementById('postImage').value = '';
    document.getElementById('postAudio').value = '';
    document.getElementById('postVideo').value = '';
}

// Funciones para manejar la vista previa de audio y video
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('audio/')) {
            showToast('❌ Por favor selecciona un archivo de audio válido', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('❌ El audio no debe superar los 10MB', 'error');
            event.target.value = '';
            return;
        }
        
        document.getElementById('audioPreview').innerHTML = `
            <div class="audio-preview-item">
                <i class="fas fa-music"></i>
                <div class="audio-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeAudioPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('video/')) {
            showToast('❌ Por favor selecciona un archivo de video válido', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            showToast('❌ El video no debe superar los 50MB', 'error');
            event.target.value = '';
            return;
        }
        
        const url = URL.createObjectURL(file);
        document.getElementById('videoPreview').innerHTML = `
            <div class="video-preview-item">
                <video controls>
                    <source src="${url}" type="${file.type}">
                    Tu navegador no soporta el elemento video.
                </video>
                <div class="video-info">
                    <strong>${file.name}</strong>
                    <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="btn-remove-preview" onclick="removeVideoPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

function removeAudioPreview() {
    document.getElementById('audioPreview').innerHTML = '';
    document.getElementById('postAudio').value = '';
}

function removeVideoPreview() {
    document.getElementById('videoPreview').innerHTML = '';
    document.getElementById('postVideo').value = '';
}

// ========== FUNCIONALIDAD DE PERFILES DE USUARIOS ==========

// Función para navegar al perfil de un usuario
// Modificar la función navigateToUserProfile
function navigateToUserProfile(userId) {
    // Verificar si el usuario está bloqueado antes de navegar
    checkIfUserIsBlocked(userId).then(isBlocked => {
        if (isBlocked) {
            showBlockedUserModal(userId);
            return;
        }
        
        // Guardar el ID del usuario que queremos ver en el localStorage
        localStorage.setItem('viewingUserProfile', userId);
        
        // Redirigir a profile.html
        window.location.href = 'profile.html';
    }).catch(error => {
        console.error('Error verificando bloqueo:', error);
        // En caso de error, navegar de todos modos
        localStorage.setItem('viewingUserProfile', userId);
        window.location.href = 'profile.html';
    });
}

function initializeProfileCardClick() {
    console.log('🔧 Inicializando clics en perfiles...');
    
    // Los clics se manejan directamente con onclick en el HTML
    // Esta función es solo para debug
    document.addEventListener('click', function(e) {
        // Verificar si se hizo clic en un elemento con onclick de perfil
        if (e.target.closest('[onclick*="navigateToUserProfile"]')) {
            console.log('🎯 Clic en perfil detectado');
        }
    });
}

// Función para ver perfil desde cualquier lugar
function viewUserProfile(userId) {
    navigateToUserProfile(userId);
}

// Modificar la función createPostHTML para hacer los nombres clickeables
function createPostHTML(post) {
    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const likeCount = post.likes.length;
    const shareCount = post.shares ? post.shares.length : 0;
    const timeAgo = getTimeAgo(new Date(post.fecha_publicacion));
    
    const isSharedPost = post.tipo === 'share';
    const hasOriginalPost = isSharedPost && post.postOriginal;
    const isAuthor = post.autor._id === currentUser._id;

    return `
        <div class="post-card" id="post-${post._id}">
            <div class="post-header">
                <div class="post-avatar" onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer;">
                    ${post.autor.foto_perfil ? 
                        `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="post-user-info">
                    <h4 onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #3498db;">
                        ${post.autor.nombre}
                    </h4>
                    <p onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                        @${post.autor.username}
                    </p>
                </div>
                <div class="post-time">${timeAgo}</div>
                
                ${isAuthor ? `
                    <div class="post-options">
                        <button class="btn-icon post-options-btn" id="optionsBtn-${post._id}">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div class="post-options-menu" id="optionsMenu-${post._id}">
                            ${!isSharedPost ? `
                                <button class="option-item edit-option" onclick="editPost('${post._id}')">
                                    <i class="fas fa-edit"></i>
                                    <span>Editar publicación</span>
                                </button>
                            ` : ''}
                            <button class="option-item delete-option" onclick="confirmDeletePost('${post._id}')">
                                <i class="fas fa-trash"></i>
                                <span>Eliminar publicación</span>
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${isSharedPost ? `
                <div class="post-share-header">
                    <i class="fas fa-share"></i>
                    <span>${post.autor.nombre} compartió esto</span>
                </div>
            ` : ''}
            
            <div class="post-content" id="postContent-${post._id}">
                ${post.contenido ? formatPostContent(post.contenido) : ''}
            </div>
            
            ${hasOriginalPost ? `
                <div class="original-post-preview">
                    <div class="original-post-header">
                        <div class="original-post-avatar" onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer;">
                            ${post.postOriginal.autor.foto_perfil ? 
                                `<img src="${post.postOriginal.autor.foto_perfil}" alt="${post.postOriginal.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="original-post-info">
                            <strong onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer; color: #3498db;">
                                ${post.postOriginal.autor.nombre}
                            </strong>
                            <span onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                                @${post.postOriginal.autor.username}
                            </span>
                        </div>
                    </div>
                    <div class="original-post-content">
                        ${formatPostContent(post.postOriginal.contenido)}
                    </div>
                    
                    <!-- CONTENIDO MULTIMEDIA DEL POST ORIGINAL - CORREGIDO -->
                    ${post.postOriginal.imagen ? `
                        <div class="post-media">
                            <img src="${post.postOriginal.imagen}" alt="Imagen" class="original-post-image">
                        </div>
                    ` : ''}
                    
                    ${post.postOriginal.audio ? `
                        <div class="post-media">
                            <div class="audio-player-container">
                                <audio controls class="audio-player">
                                    <source src="${post.postOriginal.audio}" type="audio/mpeg">
                                    <source src="${post.postOriginal.audio}" type="audio/wav">
                                    <source src="${post.postOriginal.audio}" type="audio/ogg">
                                    Tu navegador no soporta el elemento de audio.
                                </audio>
                                ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${post.postOriginal.video ? `
                        <div class="post-media">
                            <div class="video-player-container">
                                <video controls class="video-player" poster="${post.postOriginal.videoThumbnail || ''}">
                                    <source src="${post.postOriginal.video}" type="video/mp4">
                                    <source src="${post.postOriginal.video}" type="video/webm">
                                    <source src="${post.postOriginal.video}" type="video/ogg">
                                    Tu navegador no soporta el elemento de video.
                                </video>
                                ${post.postOriginal.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- CONTENIDO MULTIMEDIA DEL POST ACTUAL (solo si no es compartido) -->
            ${!isSharedPost ? `
                ${post.imagen ? `
                    <div class="post-media">
                        <img src="${post.imagen}" alt="Imagen de publicación" class="post-image" id="postImage-${post._id}">
                    </div>
                ` : ''}
                
                ${post.audio ? `
                    <div class="post-media">
                        <div class="audio-player-container">
                            <audio controls class="audio-player" id="audio-${post._id}">
                                <source src="${post.audio}" type="audio/mpeg">
                                <source src="${post.audio}" type="audio/wav">
                                <source src="${post.audio}" type="audio/ogg">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                            ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${post.video ? `
                    <div class="post-media">
                        <div class="video-player-container">
                            <video controls class="video-player" id="video-${post._id}" poster="${post.videoThumbnail || ''}">
                                <source src="${post.video}" type="video/mp4">
                                <source src="${post.video}" type="video/webm">
                                <source src="${post.video}" type="video/ogg">
                                Tu navegador no soporta el elemento de video.
                            </video>
                            ${post.duracion ? `<div class="media-duration">Duración: ${formatDuracion(post.duracion)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
            ` : ''}
            
            <div class="post-actions-bar">
                <button class="post-action ${isLiked ? 'liked' : ''}" id="likeBtn-${post._id}">
                    <i class="fas fa-heart"></i>
                    <span>${likeCount}</span>
                </button>
                <button class="post-action" id="viewBtn-${post._id}">
                    <i class="fas fa-comment"></i>
                    <span>${post.comentarios?.length || 0}</span>
                </button>
                <button class="post-action" id="shareBtn-${post._id}">
                    <i class="fas fa-share"></i>
                    <span>${shareCount}</span>
                </button>
            </div>
        </div>
    `;
}

// Modificar la función createUserCardHTML para hacer los nombres clickeables
function createUserCardHTML(user) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isCurrentUser = currentUser._id === user._id;
    const isFollowing = currentUser.seguidos?.includes(user._id);
    const isFollower = currentUser.seguidores?.includes(user._id);
    const isBlocked = currentUser.usuarios_bloqueados?.includes(user._id);
    
    return `
        <div class="user-card-main" data-user-id="${user._id}">
            <!-- Menú de opciones -->
            <div class="user-card-options">
                ${!isCurrentUser ? `
                    <button class="btn-options" onclick="toggleOptionsMenu('${user._id}', event)">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="options-menu" id="optionsMenu-${user._id}">
                        ${isBlocked ? `
                            <button class="option-item unblock-option" data-user-id="${user._id}">
                                <i class="fas fa-lock-open"></i>
                                <span>Desbloquear</span>
                            </button>
                        ` : `
                            <button class="option-item block-option" data-user-id="${user._id}" data-user-name="${user.nombre}">
                                <i class="fas fa-ban"></i>
                                <span>Bloquear usuario</span>
                            </button>
                            ${isFollower ? `
                                <button class="option-item remove-follower-option" data-user-id="${user._id}">
                                    <i class="fas fa-user-times"></i>
                                    <span>Eliminar seguidor</span>
                                </button>
                            ` : ''}
                        `}
                    </div>
                ` : ''}
            </div>

            <div class="user-card-header">
                <div class="user-avatar-medium" onclick="navigateToUserProfile('${user._id}')" style="cursor: pointer;">
                    ${user.foto_perfil ? 
                        `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="user-info">
                    <h4 onclick="navigateToUserProfile('${user._id}')" style="cursor: pointer; color: #3498db;">
                        ${user.nombre} 
                    </h4>
                    <p class="user-username" onclick="navigateToUserProfile('${user._id}')" style="cursor: pointer; color: #7f8c8d;">
                        @${user.username} ${isBlocked ? `<span class="blocked-indicator">BLOQUEADO</span>` : ''}
                    </p>
                    ${user.biografia ? `<p class="user-bio">${user.biografia}</p>` : ''}
                </div>
            </div>
            
            <div class="user-stats">
                <div class="stat">
                    <strong>${user.seguidores?.length || 0}</strong>
                    <span>Seguidores</span>
                </div>
                <div class="stat">
                    <strong>${user.seguidos?.length || 0}</strong>
                    <span>Seguidos</span>
                </div>
            </div>
            
            <div class="user-actions">
                <button class="btn-view-profile" onclick="navigateToUserProfile('${user._id}')">
                    <i class="fas fa-eye"></i> Ver Perfil
                </button>
                ${!isCurrentUser && !isBlocked ? `
                    <button class="btn-follow ${isFollowing ? 'following' : ''}" 
                            onclick="toggleFollow('${user._id}')">
                        <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                        ${isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Función para formatear la duración
function formatDuracion(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

// ========== VERIFICACIÓN DE BLOQUEO ==========
async function checkIfUserIsBlocked(userId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            console.error('❌ No hay usuario actual en localStorage');
            return false;
        }

        // Verificar si el usuario actual bloqueó al otro usuario (localmente)
        const iBlockedThem = currentUser.usuarios_bloqueados?.includes(userId);
        
        if (iBlockedThem) {
            console.log('🔒 Usuario bloqueado localmente por mí');
            return true;
        }

        // Verificar si el otro usuario bloqueó al usuario actual (en el servidor)
        console.log(`🔍 Verificando en servidor si usuario ${userId} me bloqueó`);
        const response = await fetch(`${API_URL}/users/${userId}/check-blocked`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser._id })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('📊 Resultado verificación bloqueo:', result);
            
            if (result.success) {
                return result.data.isBlocked;
            }
        }
        
        // Si hay error en el servidor, solo verificar localmente
        console.warn('⚠️ Error en verificación de servidor, usando solo verificación local');
        return iBlockedThem;
        
    } catch (error) {
        console.error('❌ Error verificando bloqueo:', error);
        // En caso de error, verificar solo localmente
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        return currentUser?.usuarios_bloqueados?.includes(userId) || false;
    }
}

// ========== MODAL PARA USUARIOS BLOQUEADOS ==========
function showBlockedUserModal(userId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'blockedUserModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-ban"></i> Usuario Bloqueado</h3>
                <span class="close-modal" onclick="closeBlockedUserModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="blocked-user-content">
                    <div class="blocked-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h4>No puedes ver este perfil</h4>
                    <p>No puedes ver el perfil de este usuario debido a restricciones de privacidad.</p>
                    <div class="blocked-options">
                        <button class="btn-secondary" onclick="closeBlockedUserModal()">
                            <i class="fas fa-times"></i> Volver
                        </button>
                        <button class="btn-primary" onclick="goToMyProfileFromModal()">
                            <i class="fas fa-user"></i> Ver mi perfil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeBlockedUserModal() {
    const modal = document.getElementById('blockedUserModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

function goToMyProfileFromModal() {
    localStorage.removeItem('viewingUserProfile');
    closeBlockedUserModal();
    window.location.href = 'profile.html';
}

// ========== MODIFICAR LA FUNCIÓN navigateToUserProfile ==========
async function navigateToUserProfile(userId) {
    console.log('🎯 Intentando navegar al perfil de:', userId);
    
    try {
        // Verificar si el usuario está bloqueado antes de navegar
        const isBlocked = await checkIfUserIsBlocked(userId);
        
        if (isBlocked) {
            console.log('🚫 Usuario bloqueado, mostrando modal');
            showBlockedUserModal(userId);
            return;
        }
        
        // Si no está bloqueado, proceder con la navegación
        console.log('✅ Usuario no bloqueado, navegando al perfil');
        localStorage.setItem('viewingUserProfile', userId);
        window.location.href = 'profile.html';
        
    } catch (error) {
        console.error('❌ Error en navigateToUserProfile:', error);
        // En caso de error, navegar de todos modos pero mostrar advertencia
        showToast('⚠️ Error verificando bloqueo, redirigiendo...', 'info');
        localStorage.setItem('viewingUserProfile', userId);
        window.location.href = 'profile.html';
    }
}

