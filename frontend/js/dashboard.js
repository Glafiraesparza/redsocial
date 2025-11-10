// frontend/js/dashboard.js
const API_URL = 'http://localhost:3001/api';

// Variables globales
let currentUser = null;
let currentPosts = [];
let currentPostId = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    console.log('🚀 Inicializando Dashboard...');
    
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    // VERIFICAR SI HAY SECCIÓN EN LA URL
    const urlSection = getUrlParameter('section');
    
    if (urlSection) {
        // Mostrar la sección de la URL
        showSection(urlSection);
    } else {
        // Comportamiento normal - mostrar feed por defecto
        showSection('feed');
    }
    
    initializeUserInfo();
    initializeEventListeners();
    makeOptionsFunctionsGlobal();
    
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
    
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    
    postContent.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/1000`;
        charCount.style.color = length > 900 ? '#e74c3c' : length > 700 ? '#f39c12' : '#7f8c8d';
    });
    
    postContent.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleCreatePost();
        }
    });
    
    const postImage = document.getElementById('postImage');
    postImage.addEventListener('change', handleImageUpload);
}

// ========== PUBLICACIONES ==========
async function handleCreatePost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('postImage').files[0];
    
    if (!content && !imageFile) {
        showToast('❌ Escribe algo o selecciona una imagen para publicar', 'error');
        return;
    }
    
    try {
        let imageUrl = '';
        let imageFilename = '';
        
        // Si hay una imagen, subirla primero
        if (imageFile) {
            showToast('📤 Subiendo imagen...', 'info');
            const uploadResult = await uploadImageToServer(imageFile);
            imageUrl = uploadResult.url;
            imageFilename = uploadResult.filename;
        }
        
        const postData = {
            autor: currentUser._id,
            contenido: content,
            imagen: imageUrl,
            imagenFilename: imageFilename
        };
        
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
    
    // Si es un share, mostrar información del post original
    const isSharedPost = post.tipo === 'share';
    const hasOriginalPost = isSharedPost && post.postOriginal;
    
    // Verificar si el usuario actual es el autor del post
    const isAuthor = post.autor._id === currentUser._id;
    
    return `
        <div class="post-card" id="post-${post._id}">
            <div class="post-header">
                <div class="post-avatar">
                    ${post.autor.foto_perfil ? 
                        `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="post-user-info">
                    <h4>${post.autor.nombre}</h4>
                    <p>@${post.autor.username}</p>
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
                        <div class="original-post-avatar">
                            ${post.postOriginal.autor.foto_perfil ? 
                                `<img src="${post.postOriginal.autor.foto_perfil}" alt="${post.postOriginal.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="original-post-info">
                            <strong>${post.postOriginal.autor.nombre}</strong>
                            <span>@${post.postOriginal.autor.username}</span>
                        </div>
                    </div>
                    <div class="original-post-content">
                        ${formatPostContent(post.postOriginal.contenido)}
                    </div>
                    ${post.postOriginal.imagen ? `
                        <img src="${post.postOriginal.imagen}" alt="Imagen" class="original-post-image">
                    ` : ''}
                </div>
            ` : ''}
            
            ${post.imagen && !isSharedPost ? `
                <img src="${post.imagen}" alt="Imagen de publicación" class="post-image" id="postImage-${post._id}">
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

// ========== FUNCIONALIDAD DE EDICIÓN ==========

// Función para abrir el modal de edición
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
                    
                    ${post.imagen ? `
                        <div class="current-image-preview">
                            <label>
                                <i class="fas fa-image"></i> Imagen actual
                            </label>
                            <div class="image-preview-container">
                                <img src="${post.imagen}" alt="Imagen actual" class="current-image">
                                <button type="button" class="btn-remove-image" onclick="removeCurrentImage('${postId}')">
                                    <i class="fas fa-times"></i> Eliminar imagen
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="image-upload-edit">
                            <label>
                                <i class="fas fa-image"></i> Agregar imagen (opcional)
                            </label>
                            <input type="file" id="editPostImage" accept="image/*" style="display: none;">
                            <label for="editPostImage" class="btn-secondary btn-image-upload">
                                <i class="fas fa-upload"></i> Seleccionar Imagen
                            </label>
                            <div id="editImagePreview" class="image-preview"></div>
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
    const editImageInput = document.getElementById('editPostImage');
    
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
    
    // Preview de imagen
    if (editImageInput) {
        editImageInput.addEventListener('change', handleEditImageUpload);
    }
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
                <div class="image-preview-item">
                    <img src="${e.target.result}" alt="Vista previa" class="preview-image">
                    <button type="button" class="btn-remove-preview" onclick="removeEditImagePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

// Función para remover preview de imagen en edición
function removeEditImagePreview() {
    document.getElementById('editImagePreview').innerHTML = '';
    document.getElementById('editPostImage').value = '';
}

// Función para remover imagen actual
function removeCurrentImage(postId) {
    const post = currentPosts.find(p => p._id === postId);
    if (!post) return;
    
    post.imagen = ''; // Remover la imagen
    updatePost(postId, true);
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
async function updatePost(postId, removeImage = false) {
    const editContent = document.getElementById('editPostContent');
    const editImageInput = document.getElementById('editPostImage');
    
    if (!editContent) {
        showToast('❌ Error: No se pudo encontrar el contenido', 'error');
        return;
    }
    
    const contenido = editContent.value.trim();
    
    if (!contenido) {
        showToast('❌ El contenido no puede estar vacío', 'error');
        return;
    }
    
    try {
        const postData = {
            userId: currentUser._id,
            contenido: contenido
        };
        
        // Si se está removiendo la imagen
        if (removeImage) {
            postData.imagen = '';
        } 
        // Si hay una nueva imagen seleccionada
        else if (editImageInput && editImageInput.files[0]) {
            // En una implementación real, aquí subirías la imagen a un servidor
            // Por ahora, usaremos una URL de data como ejemplo
            const file = editImageInput.files[0];
            const imageUrl = await uploadImage(file);
            postData.imagen = imageUrl;
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

// Función para actualizar el post en el DOM
function updatePostInDOM(postId, updatedPost) {
    const postElement = document.getElementById(`post-${postId}`);
    if (!postElement) return;
    
    // Actualizar contenido
    const contentElement = document.getElementById(`postContent-${postId}`);
    if (contentElement) {
        contentElement.innerHTML = formatPostContent(updatedPost.contenido);
    }
    
    // Actualizar imagen si existe
    const imageElement = document.getElementById(`postImage-${postId}`);
    if (updatedPost.imagen) {
        if (imageElement) {
            imageElement.src = updatedPost.imagen;
        } else {
            // Si no existe el elemento de imagen, crearlo
            const postContent = contentElement.parentElement;
            const newImage = document.createElement('img');
            newImage.src = updatedPost.imagen;
            newImage.alt = 'Imagen de publicación';
            newImage.className = 'post-image';
            newImage.id = `postImage-${postId}`;
            contentElement.after(newImage);
        }
    } else if (imageElement) {
        // Remover imagen si fue eliminada
        imageElement.remove();
    }
    
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
    currentPostId = post._id;
    
    const modalContent = document.getElementById('postModalContent');
    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const shareCount = post.shares ? post.shares.length : 0;
    const isAuthor = post.autor._id === currentUser._id;
    const isSharedPost = post.tipo === 'share';
    
    modalContent.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                ${post.autor.foto_perfil ? 
                    `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="post-user-info">
                <h4>${post.autor.nombre}</h4>
                <p>@${post.autor.username}</p>
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
            <img src="${post.imagen}" alt="Imagen de publicación" class="post-image">
        ` : ''}
    `;
    
    document.getElementById('likesCountModal').textContent = post.likes.length;
    document.getElementById('comentariosCountModal').textContent = post.comentarios?.length || 0;
    
    const likeBtnModal = document.getElementById('likeBtnModal');
    const likeIconModal = likeBtnModal.querySelector('i');
    const likeTextModal = likeBtnModal.querySelector('span');
    
    if (isLiked) {
        likeBtnModal.classList.add('liked');
        likeIconModal.className = 'fas fa-heart';
        likeTextModal.textContent = 'Me gusta';
    } else {
        likeBtnModal.classList.remove('liked');
        likeIconModal.className = 'far fa-heart';
        likeTextModal.textContent = 'Me gusta';
    }
    
    likeBtnModal.onclick = () => handleLikeModal(post._id);
    
    // Actualizar el botón de compartir en el modal
    const shareAction = document.querySelector('.modal-actions .post-action:last-child');
    shareAction.onclick = () => handleShareModal(post._id);
    const shareCountSpan = shareAction.querySelector('span');
    if (shareCountSpan) {
        shareCountSpan.textContent = shareCount;
    }
    
    loadComentarios(post._id);
    initializeComentarioEvents();
    openModal('post');

    // Agregar evento para el botón de opciones en el modal
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
    const comentarioInput = document.getElementById('nuevoComentario');
    const enviarBtn = document.getElementById('enviarComentario');
    
    enviarBtn.addEventListener('click', handleNuevoComentario);
    
    comentarioInput.addEventListener('input', function() {
        enviarBtn.disabled = this.value.trim().length === 0;
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    comentarioInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim()) {
                handleNuevoComentario();
            }
        }
    });
    
    comentarioInput.value = '';
    enviarBtn.disabled = true;
    comentarioInput.style.height = 'auto';
}

async function loadComentarios(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comentarios`);
        const result = await response.json();
        
        if (result.success) {
            displayComentarios(result.data);
        } else {
            document.getElementById('listaComentarios').innerHTML = `
                <div class="comentario-vacio-facebook">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar comentarios</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando comentarios:', error);
        document.getElementById('listaComentarios').innerHTML = `
            <div class="comentario-vacio-facebook">
                <i class="fas fa-wifi"></i>
                <p>Error de conexión</p>
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
// ========== NAVEGACIÓN ==========
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.getElementById(sectionId + 'Section').classList.add('active');
    
    // Buscar el botón que tiene esta sección en su onclick
    const activeButton = document.querySelector(`.nav-item[onclick*="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // CARGAR LOS DATOS DE LA SECCIÓN
    switch(sectionId) {
        case 'feed': 
            loadFeed(); 
            break;
        case 'profile': 
            loadUserProfile(); 
            break;
        case 'explore': 
            loadExplore(); 
            break;
        case 'users': 
            loadUsers(); 
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
    
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
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