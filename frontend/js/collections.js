// frontend/js/collections.js - VERSIÓN CORREGIDA
let currentCollections = [];
let currentCollection = null;
let isEditing = false;
let currentEditingCollectionId = null;
let currentOpenCollectionMenu = null;
let collectionMenuClickHandler = null;

// AGREGAR ESTO AL PRINCIPIO:
const API_URL_CO = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : 'https://redsocial-cj60.onrender.com/api';

console.log('🌐 Collections API URL:', API_URL_CO);

// ===== INICIALIZACIÓN =====
function initializeCollections() {
    console.log('🔄 Inicializando sistema de colecciones...');
    loadUserCollections();
    initializeCollectionMenuEvents();
}

// ===== CARGAR COLECCIONES DEL USUARIO =====
// ===== CARGAR COLECCIONES DEL USUARIO - VERSIÓN MEJORADA =====
async function loadUserCollections() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        const response = await fetch(`${API_URL_CO}/collections/usuario/${currentUser._id}`);
        const result = await response.json();

        if (result.success) {
            currentCollections = result.data;
            displayCollectionsGrid(currentCollections);
            
            // Inicializar eventos después de cargar las colecciones
            setTimeout(initializeCollectionMenuEvents, 100);
        } else {
            console.error('Error cargando colecciones:', result.error);
        }
    } catch (error) {
        console.error('Error cargando colecciones:', error);
    }
}

function displayCollectionsGrid(collections) {
    const collectionsGrid = document.getElementById('collectionsGrid');
    const allCollections = document.getElementById('allCollections');
    
    if (!collectionsGrid) return;

    if (collections.length === 0) {
        collectionsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No hay colecciones aún</h3>
                <p>Crea tu primera colección para organizar tus publicaciones.</p>
                <button class="btn-primary" onclick="openCreateCollectionModal()">
                    <i class="fas fa-plus"></i> Crear primera colección
                </button>
            </div>
        `;
        
        // Limpiar el contenedor de todas las colecciones si existe
        if (allCollections) {
            allCollections.innerHTML = '';
        }
        return;
    }

    // Primero actualizas el header
    document.getElementById('collectionsHeader').innerHTML = `
        <h3>Mis Colecciones (${collections.length})</h3>
        <div class="collections-actions">
            <button class="btn-primary" onclick="openCreateCollectionModal()">
                <i class="fas fa-plus"></i> Nueva Colección
            </button>
        </div>
    `;

    // Mostrar TODAS las colecciones en un solo grid
    collectionsGrid.innerHTML = `
    ${collections.map(collection => 
        createCollectionCardHTML(collection)
    ).join('')}
`;
    
    // Limpiar el contenedor de todas las colecciones
    if (allCollections) {
        allCollections.innerHTML = '';
    }
}

// ===== CERRAR MODALES DE FORMA SEGURA =====
function safelyCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Agregar animación de salida
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            modal.remove();
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

// Reemplazar las funciones close existentes:
function closeDeleteCollectionModal() {
    safelyCloseModal('deleteCollectionModal');
}

function closeCreateCollectionModal() {
    safelyCloseModal('createCollectionModal');
}

function closeCollectionDetailModal() {
    safelyCloseModal('collectionDetailModal');
}

function closeAddPostsModal() {
    safelyCloseModal('addPostsModal');
}

function closeManagePostsModal() {
    safelyCloseModal('managePostsModal');
}

// ===== CREAR TARJETA DE COLECCIÓN MEJORADA - VERSIÓN CORREGIDA =====
// ===== CREAR TARJETA DE COLECCIÓN MEJORADA - VERSIÓN CORREGIDA =====
function createCollectionCardHTML(collection) {
    const postCount = collection.posts?.length || 0;
    const lastUpdated = getTimeAgo(new Date(collection.fecha_actualizacion));
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    
    console.log('🔍 Contexto colección:', { 
        isOwnProfile, 
        viewingUserId, 
        currentUserId: currentUser._id,
        collectionId: collection._id
    });
    
    return `
        <div class="collection-card" data-collection-id="${collection._id}" onclick="viewCollection('${collection._id}')">
            <div class="collection-header">
                <div class="collection-icon" style="background-color: ${collection.color};">
                    <i class="${collection.icono}"></i>
                </div>
                ${isOwnProfile ? `
                    <!-- Mostrar menú de opciones SOLO si es nuestro perfil -->
                    <div class="collection-actions" onclick="event.stopPropagation()">
                        <button class="btn-icon" onclick="openCollectionOptions('${collection._id}', event)">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div class="collection-options-menu" id="collectionOptions-${collection._id}">
                            <button class="option-item" onclick="editCollection('${collection._id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="option-item" onclick="openManagePostsModal('${collection._id}')">
                                <i class="fas fa-cog"></i> Gestionar Posts
                            </button>
                            <button class="option-item delete-option" onclick="confirmDeleteCollection('${collection._id}', '${collection.nombre}')">
                                <i class="fas fa-trash"></i> Eliminar Colección
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="collection-content">
                <h4>${collection.nombre}</h4>
                <p class="collection-desc">${collection.descripcion || 'Sin descripción'}</p>
                
                <div class="collection-stats">
                    <span class="stat">
                        <i class="fas fa-image"></i>
                        ${postCount} ${postCount === 1 ? 'elemento' : 'elementos'}
                    </span>
                    <span class="stat">
                        <i class="fas fa-clock"></i>
                        ${lastUpdated}
                    </span>
                </div>
                
                ${collection.etiquetas && collection.etiquetas.length > 0 ? `
                    <div class="collection-tags">
                        ${collection.etiquetas.slice(0, 3).map(tag => `
                            <span class="tag">${tag}</span>
                        `).join('')}
                        ${collection.etiquetas.length > 3 ? `<span class="tag-more">+${collection.etiquetas.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}


// ===== CREAR HTML DE POST EN COLECCIÓN - ACTUALIZADA CON BOTÓN ELIMINAR =====
function createCollectionPostHTML(post, collectionId) {
    const isImage = post.tipoContenido === 'imagen' && post.imagen;
    const isVideo = post.tipoContenido === 'video' && post.video;
    const isAudio = post.tipoContenido === 'audio' && post.audio;
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    
    let mediaContent = '';
    
    if (isImage) {
        mediaContent = `<img src="${post.imagen}" alt="Imagen" class="post-thumbnail">`;
    } else if (isVideo) {
        mediaContent = `
            <div class="video-thumbnail">
                <i class="fas fa-play"></i>
                <video>
                    <source src="${post.video}" type="video/mp4">
                </video>
            </div>
        `;
    } else if (isAudio) {
        mediaContent = `
            <div class="audio-thumbnail">
                <i class="fas fa-music"></i>
            </div>
        `;
    } else {
        mediaContent = `
            <div class="text-thumbnail">
                <i class="fas fa-file-alt"></i>
                <p>${post.contenido ? post.contenido.substring(0, 100) + (post.contenido.length > 100 ? '...' : '') : 'Publicación'}</p>
            </div>
        `;
    }
    
    // Si NO es nuestro perfil, renderizar sin el contenedor de botones
    if (!isOwnProfile) {
        return `
            <div class="collection-post-item" data-post-id="${post._id}" onclick="viewPost('${post._id}')">
                ${mediaContent}
                <div class="post-overlay">
                    <div class="post-info">
                        <p class="post-preview">${post.contenido ? post.contenido.substring(0, 50) + (post.contenido.length > 50 ? '...' : '') : 'Publicación'}</p>
                        <span class="post-date">${getTimeAgo(new Date(post.fecha_publicacion))}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Si ES nuestro perfil, renderizar con el botón de eliminar
    return `
        <div class="collection-post-item" data-post-id="${post._id}">
            <div class="collection-post-content" onclick="viewPost('${post._id}')">
                ${mediaContent}
                <div class="post-overlay">
                    <div class="post-info">
                        <p class="post-preview">${post.contenido ? post.contenido.substring(0, 50) + (post.contenido.length > 50 ? '...' : '') : 'Publicación'}</p>
                        <span class="post-date">${getTimeAgo(new Date(post.fecha_publicacion))}</span>
                    </div>
                </div>
            </div>
            <button class="btn-remove-from-collection" onclick="removePostFromCollection('${collectionId}', '${post._id}', event)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// ===== MODAL PARA CREAR/EDITAR COLECCIÓN =====
function openCreateCollectionModal(collectionId = null) {
    isEditing = !!collectionId;
    currentEditingCollectionId = collectionId;
    
    const modalTitle = isEditing ? 'Editar Colección' : 'Crear Nueva Colección';
    const submitButtonText = isEditing ? 'Guardar Cambios' : 'Crear Colección';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'createCollectionModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas ${isEditing ? 'fa-edit' : 'fa-plus'}"></i> ${modalTitle}</h3>
                <span class="close-modal" onclick="closeCreateCollectionModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="createCollectionForm" class="collection-form">
                    <div class="form-group">
                        <label for="collectionName">
                            <i class="fas fa-heading"></i> Nombre de la colección *
                        </label>
                        <input 
                            type="text" 
                            id="collectionName" 
                            name="nombre" 
                            placeholder="Ej: Recetas favoritas, Viajes 2024, etc."
                            maxlength="100"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="collectionDescription">
                            <i class="fas fa-align-left"></i> Descripción
                        </label>
                        <textarea 
                            id="collectionDescription" 
                            name="descripcion" 
                            placeholder="Describe el propósito de esta colección..."
                            maxlength="500"
                            rows="3"
                        ></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="collectionType">
                                <i class="fas fa-globe"></i> Visibilidad
                            </label>
                            <select id="collectionType" name="tipo">
                                <option value="publica">Pública</option>
                                <option value="privada">Privada</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="collectionColor">
                                <i class="fas fa-palette"></i> Color
                            </label>
                            <input 
                                type="color" 
                                id="collectionColor" 
                                name="color" 
                                value="#3498db"
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="collectionIcon">
                            <i class="fas fa-icons"></i> Icono
                        </label>
                        <div class="icon-selector">
                            ${getIconOptions()}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="collectionTags">
                            <i class="fas fa-tags"></i> Etiquetas
                        </label>
                        <input 
                            type="text" 
                            id="collectionTags" 
                            name="etiquetas" 
                            placeholder="Agrega etiquetas separadas por comas (recetas, cocina, postres)"
                        >
                        <small>Separa las etiquetas con comas</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeCreateCollectionModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-primary" id="submitCollectionBtn">
                            <i class="fas fa-save"></i> ${submitButtonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Si estamos editando, cargar los datos de la colección
    if (isEditing) {
        loadCollectionData(collectionId);
    }
    
    // Inicializar eventos del formulario
    document.getElementById('createCollectionForm').addEventListener('submit', handleCreateOrUpdateCollection);
}

// ===== CARGAR DATOS DE COLECCIÓN PARA EDITAR =====
async function loadCollectionData(collectionId) {
    try {
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}`);
        const result = await response.json();
        
        if (result.success) {
            const collection = result.data;
            
            // Llenar el formulario con los datos existentes
            document.getElementById('collectionName').value = collection.nombre;
            document.getElementById('collectionDescription').value = collection.descripcion || '';
            document.getElementById('collectionType').value = collection.tipo;
            document.getElementById('collectionColor').value = collection.color;
            document.getElementById('collectionTags').value = collection.etiquetas ? collection.etiquetas.join(', ') : '';
            
            // Seleccionar el icono correcto
            const iconInput = document.querySelector(`input[name="icono"][value="${collection.icono}"]`);
            if (iconInput) {
                iconInput.checked = true;
            }
        }
    } catch (error) {
        console.error('Error cargando datos de colección:', error);
        showCollectionToast('❌ Error al cargar los datos de la colección', 'error');
    }
}

// ===== MANEJAR CREACIÓN O ACTUALIZACIÓN DE COLECCIÓN =====
async function handleCreateOrUpdateCollection(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitCollectionBtn');
    const originalText = submitBtn.innerHTML;
    
    // Deshabilitar botón para evitar múltiples clics
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const formData = new FormData(event.target);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const collectionData = {
        nombre: formData.get('nombre'),
        descripcion: formData.get('descripcion'),
        tipo: formData.get('tipo'),
        color: formData.get('color'),
        icono: formData.get('icono'),
        usuario: currentUser._id,
        etiquetas: formData.get('etiquetas') ? 
            formData.get('etiquetas').split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };
    
    try {
        let response;
        
        if (isEditing) {
            // Actualizar colección existente
            response = await fetch(`${API_URL_CO}/collections/${currentEditingCollectionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(collectionData)
            });
        } else {
            // Crear nueva colección
            response = await fetch(`${API_URL_CO}/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(collectionData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            const message = isEditing ? '✅ Colección actualizada exitosamente' : '✅ Colección creada exitosamente';
            showCollectionToast(message, 'success');
            
            closeCreateCollectionModal();
            loadUserCollections();
            
            // Publicar en el feed solo si es una nueva colección
            if (!isEditing) {
                await createCollectionPost(result.data);
            }
            
        } else {
            showCollectionToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error guardando colección:', error);
        showCollectionToast('❌ Error al guardar la colección', 'error');
    } finally {
        // Rehabilitar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function confirmDeleteCollection(collectionId, collectionName) {
    // Cerrar cualquier modal existente primero
    closeDeleteCollectionModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'deleteCollectionModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Confirmar eliminación</h3>
                <span class="close-modal" onclick="closeDeleteCollectionModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="delete-confirmation">
                    <div class="warning-icon">
                        <i class="fas fa-trash"></i>
                    </div>
                    <h4>¿Eliminar colección?</h4>
                    <p>Estás a punto de eliminar la colección <strong>"${collectionName}"</strong>.</p>
                    <p class="warning-text">Esta acción no se puede deshacer y se perderán todos los posts organizados en esta colección.</p>
                    
                    <div class="confirmation-actions">
                        <button class="btn-secondary" onclick="closeDeleteCollectionModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn-danger" onclick="deleteCollection('${collectionId}')">
                            <i class="fas fa-trash"></i> Sí, Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Prevenir múltiples eventos
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeDeleteCollectionModal();
        }
    });
}

async function deleteCollection(collectionId) {
    try {
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showCollectionToast('✅ Colección eliminada exitosamente', 'success');
            closeDeleteCollectionModal();
            loadUserCollections();
        } else {
            showCollectionToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error eliminando colección:', error);
        showCollectionToast('❌ Error al eliminar la colección', 'error');
    }
}

function closeDeleteCollectionModal() {
    const modal = document.getElementById('deleteCollectionModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

// ===== EDITAR COLECCIÓN =====
function editCollection(collectionId) {
    closeAllCollectionMenus();
    console.log('✏️ Editando colección:', collectionId);
    // Aquí va tu lógica para editar la colección
    openCreateCollectionModal(collectionId);
}

// ===== AGREGAR POSTS A COLECCIÓN =====
function addPostsToCollection(collectionId) {
    closeAllCollectionMenus();
    console.log('➕ Agregando posts a colección:', collectionId);
    
    // Encontrar la colección
    const collection = currentCollections.find(c => c._id === collectionId);
    if (!collection) {
        showCollectionToast('❌ No se pudo encontrar la colección', 'error');
        return;
    }
    
    openAddPostsModal(collection);
}

// ===== MODAL PARA AGREGAR POSTS - ACTUALIZADO =====
function openAddPostsModal(collection) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addPostsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; height: 90vh;">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-plus"></i> 
                    Agregar posts a "${collection.nombre}"
                </h3>
                <span class="close-modal" onclick="closeAddPostsModal()">&times;</span>
            </div>
            <div class="modal-body" style="height: calc(100% - 120px); display: flex; flex-direction: column;">
                <div class="add-posts-container" style="flex: 1; display: flex; flex-direction: column;">
                    <!-- Búsqueda y filtros -->
                    <div class="search-section">
                        <div class="search-input-with-icon">
                            <i class="fas fa-search"></i>
                            <input 
                                type="text" 
                                id="searchPostsInput" 
                                placeholder="Buscar en tus publicaciones..."
                                onkeyup="filterPosts()"
                            >
                        </div>
                        <div class="filter-buttons">
                            <button class="filter-btn active" data-filter="all" onclick="setPostsFilter('all')">
                                <i class="fas fa-layer-group"></i> Todas
                            </button>
                            <button class="filter-btn" data-filter="images" onclick="setPostsFilter('images')">
                                <i class="fas fa-image"></i> Imágenes
                            </button>
                            <button class="filter-btn" data-filter="videos" onclick="setPostsFilter('videos')">
                                <i class="fas fa-video"></i> Videos
                            </button>
                            <button class="filter-btn" data-filter="audio" onclick="setPostsFilter('audio')">
                                <i class="fas fa-music"></i> Audio
                            </button>
                        </div>
                    </div>
                    
                    <!-- Lista de posts -->
                    <div class="posts-selection-section" style="flex: 1; display: flex; flex-direction: column;">
                        <h4>Selecciona los posts que quieres agregar</h4>
                        <div class="posts-grid" id="postsSelectionGrid" style="flex: 1;">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando tus publicaciones...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Posts seleccionados -->
                    <div class="selected-posts-section" id="selectedPostsSection" style="display: none;">
                        <h4>
                            <i class="fas fa-check-circle"></i>
                            Posts seleccionados: 
                            <span id="selectedCount">0</span>
                        </h4>
                        <div class="selected-posts-list" id="selectedPostsList">
                            <!-- Los posts seleccionados aparecerán aquí -->
                        </div>
                    </div>
                    
                    <!-- Acciones -->
                    <div class="add-posts-actions">
                        <button class="btn-secondary" onclick="closeAddPostsModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn-primary" id="addPostsBtn" onclick="addSelectedPostsToCollection('${collection._id}')" disabled>
                            <i class="fas fa-plus"></i> Agregar a colección
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Inicializar filtros
    setTimeout(() => {
        document.querySelectorAll('.filter-btn').forEach((btn, index) => {
            const filters = ['all', 'images', 'videos', 'audio'];
            btn.dataset.filter = filters[index] || 'all';
        });
    }, 100);
    
    // Cargar los posts del usuario
    loadUserPostsForSelection(collection._id);
}

// ===== CARGAR POSTS DEL USUARIO PARA SELECCIÓN =====
async function loadUserPostsForSelection(collectionId) {
    try {
        console.log('🔄 Cargando posts para selección...');
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            console.error('❌ No hay usuario logueado');
            return;
        }

        const response = await fetch(`${API_URL_CO}/posts/user/${currentUser._id}`);
        const result = await response.json();

        console.log('📨 Respuesta posts:', result);

        if (result.success) {
            // Filtrar posts que no estén ya en la colección
            const collection = currentCollections.find(c => c._id === collectionId);
            const existingPostIds = collection?.posts?.map(post => 
                typeof post === 'object' ? post._id : post
            ) || [];
            
            console.log('📋 Posts existentes en colección:', existingPostIds);
            
            const availablePosts = result.data.filter(post => 
                !existingPostIds.includes(post._id)
            );
            
            console.log('✅ Posts disponibles:', availablePosts.length);
            
            displayPostsForSelection(availablePosts);
            
            if (availablePosts.length === 0) {
                document.getElementById('postsSelectionGrid').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No hay posts disponibles</h3>
                        <p>Todos tus posts ya están en esta colección o no tienes publicaciones.</p>
                        <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                            <i class="fas fa-plus"></i> Crear nuevo post
                        </button>
                    </div>
                `;
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error cargando posts:', error);
        document.getElementById('postsSelectionGrid').innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar posts</h3>
                <p>No se pudieron cargar tus publicaciones.</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// ===== ACTUALIZACIÓN DESDE MODAL DE AGREGAR POSTS =====
function refreshAfterAddingPosts(collectionId) {
    console.log('🔄 Actualizando después de agregar posts...');
    
    // Cerrar modal de agregar posts
    closeAddPostsModal();
    
    // Actualizar todas las vistas
    updateAllCollectionViews(collectionId);
    
    // Resetear selección
    selectedPosts = [];
}

// ===== MOSTRAR POSTS PARA SELECCIÓN - ACTUALIZADA =====
function displayPostsForSelection(posts) {
    const grid = document.getElementById('postsSelectionGrid');
    
    if (posts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay posts disponibles</h3>
                <p>Todos tus posts ya están en colecciones.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = posts.map(post => createPostSelectionCard(post)).join('');
    
    // Inicializar checkboxes después de renderizar
    setTimeout(initializeCheckboxes, 100);
}

// ===== CREAR TARJETA DE POST PARA SELECCIÓN - VERSIÓN MEJORADA =====
function createPostSelectionCard(post) {
    const isImage = post.tipoContenido === 'imagen' && post.imagen;
    const isVideo = post.tipoContenido === 'video' && post.video;
    const isAudio = post.tipoContenido === 'audio' && post.audio;
    
    let mediaPreview = '';
    let typeIcon = 'fas fa-file-alt';
    let typeClass = 'text';
    
    if (isImage) {
        mediaPreview = `<img src="${post.imagen}" alt="Imagen" class="post-selection-preview">`;
        typeIcon = 'fas fa-image';
        typeClass = 'image';
    } else if (isVideo) {
        mediaPreview = `
            <div class="video-preview">
                <i class="fas fa-play"></i>
            </div>
        `;
        typeIcon = 'fas fa-video';
        typeClass = 'video';
    } else if (isAudio) {
        mediaPreview = `
            <div class="audio-preview">
                <i class="fas fa-music"></i>
            </div>
        `;
        typeIcon = 'fas fa-music';
        typeClass = 'audio';
    } else {
        mediaPreview = `
            <div class="text-preview">
                <p>${post.contenido ? post.contenido.substring(0, 100) + (post.contenido.length > 100 ? '...' : '') : 'Publicación de texto'}</p>
            </div>
        `;
    }
    
    const timeAgo = getTimeAgo(new Date(post.fecha_publicacion));
    const contentPreview = post.contenido ? 
        post.contenido.substring(0, 150) + (post.contenido.length > 150 ? '...' : '') : 
        'Publicación sin texto';
    
    return `
        <div class="post-selection-card" data-post-id="${post._id}" data-post-type="${post.tipoContenido}" onclick="togglePostSelectionByCard('${post._id}')">
            <div class="post-selection-checkbox" onclick="event.stopPropagation()">
                <input 
                    type="checkbox" 
                    id="post-${post._id}" 
                    onchange="togglePostSelection('${post._id}')"
                >
                <label for="post-${post._id}"></label>
            </div>
            
            <div class="post-selection-content">
                <div class="post-preview-media ${typeClass}">
                    ${mediaPreview}
                    <div class="post-type-badge">
                        <i class="${typeIcon}"></i>
                    </div>
                </div>
                
                <div class="post-selection-info">
                    <p class="post-preview-text">${contentPreview}</p>
                    <div class="post-selection-meta">
                        <span class="post-date">
                            <i class="fas fa-clock"></i> ${timeAgo}
                        </span>
                        <span class="post-stats">
                            <i class="fas fa-heart"></i> ${post.likes?.length || 0}
                            <i class="fas fa-comment"></i> ${post.comentarios?.length || 0}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== TOGGLE SELECCIÓN DE POST =====
let selectedPosts = [];

// ===== TOGGLE SELECCIÓN CON EVENTO - VERSIÓN SIMPLIFICADA =====
function togglePostSelectionWithEvent(postId, event) {
    // Solo procesar si el click no fue directamente en el checkbox o label
    if (event.target.type === 'checkbox' || event.target.tagName === 'LABEL') {
        return;
    }
    
    event.stopPropagation();
    event.preventDefault();
    
    const checkbox = document.getElementById(`post-${postId}`);
    if (checkbox) {
        // Cambiar el estado manualmente
        checkbox.checked = !checkbox.checked;
        
        // Actualizar visualización inmediatamente
        updateCheckboxVisual(postId, checkbox.checked);
        updateSelectedPostsUI();
    }
}

// ===== ACTUALIZAR VISUAL DEL CHECKBOX =====
function updateCheckboxVisual(postId, isChecked) {
    const checkbox = document.getElementById(`post-${postId}`);
    const label = document.querySelector(`label[for="post-${postId}"]`);
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    
    if (!checkbox || !label || !postCard) return;
    
    if (isChecked) {
        // Agregar a selección
        if (!selectedPosts.includes(postId)) {
            selectedPosts.push(postId);
        }
        postCard.classList.add('selected');
        label.classList.add('checked');
        label.innerHTML = '✓'; // Forzar el contenido directamente
        label.style.background = '#27ae60';
        label.style.borderColor = '#27ae60';
        label.style.color = 'white';
    } else {
        // Remover de selección
        selectedPosts = selectedPosts.filter(id => id !== postId);
        postCard.classList.remove('selected');
        label.classList.remove('checked');
        label.innerHTML = ''; // Limpiar contenido
        label.style.background = 'white';
        label.style.borderColor = '#bdc3c7';
        label.style.color = 'transparent';
    }
}

// ===== TOGGLE SELECCIÓN DE POST - VERSIÓN SIMPLIFICADA =====
function togglePostSelection(postId) {
    const checkbox = document.getElementById(`post-${postId}`);
    if (checkbox) {
        updateCheckboxVisual(postId, checkbox.checked);
        updateSelectedPostsUI();
    }
}

// ===== ACTUALIZAR UI DE POSTS SELECCIONADOS - CORREGIDA =====
function updateSelectedPostsUI() {
    const selectedSection = document.getElementById('selectedPostsSection');
    const selectedList = document.getElementById('selectedPostsList');
    const selectedCount = document.getElementById('selectedCount');
    const addPostsBtn = document.getElementById('addPostsBtn');
    
    console.log('🔄 Actualizando UI de seleccionados:', selectedPosts.length);
    
    if (selectedCount) selectedCount.textContent = selectedPosts.length;
    
    // Mostrar/ocultar sección de seleccionados
    if (selectedPosts.length > 0) {
        if (selectedSection) selectedSection.style.display = 'block';
        
        // Actualizar lista de seleccionados
        if (selectedList) {
            selectedList.innerHTML = selectedPosts.map(postId => {
                const postCard = document.querySelector(`[data-post-id="${postId}"]`);
                let postText = 'Publicación';
                
                if (postCard) {
                    const previewElement = postCard.querySelector('.post-preview-text');
                    postText = previewElement ? previewElement.textContent : 'Publicación';
                }
                
                return `
                    <div class="selected-post-item" data-post-id="${postId}">
                        <span class="selected-post-text">${postText.substring(0, 50)}${postText.length > 50 ? '...' : ''}</span>
                        <button class="btn-remove-selected" onclick="removeSelectedPost('${postId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        // Habilitar botón
        if (addPostsBtn) addPostsBtn.disabled = false;
    } else {
        if (selectedSection) selectedSection.style.display = 'none';
        if (addPostsBtn) addPostsBtn.disabled = true;
    }
}

// ===== GESTIÓN DE SELECCIÓN MÚLTIPLE =====
let managedSelectedPosts = [];

function toggleManagedPostSelection(postId) {
    const checkbox = document.getElementById(`manage-post-${postId}`);
    const postItem = document.querySelector(`.managed-post-item[data-post-id="${postId}"]`);
    
    if (checkbox.checked) {
        if (!managedSelectedPosts.includes(postId)) {
            managedSelectedPosts.push(postId);
            postItem.classList.add('selected');
        }
    } else {
        managedSelectedPosts = managedSelectedPosts.filter(id => id !== postId);
        postItem.classList.remove('selected');
    }
    
    updateManagedSelectionUI();
}

function selectAllManagedPosts() {
    const checkboxes = document.querySelectorAll('.managed-post-checkbox input[type="checkbox"]');
    managedSelectedPosts = [];
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const postId = checkbox.id.replace('manage-post-', '');
        if (!managedSelectedPosts.includes(postId)) {
            managedSelectedPosts.push(postId);
        }
        checkbox.closest('.managed-post-item').classList.add('selected');
    });
    
    updateManagedSelectionUI();
}

// ===== LIMPIAR SELECCIÓN - VERSIÓN CORREGIDA =====
function clearSelection() {
    console.log('🧹 Limpiando selección...');
    
    // Desmarcar todos los checkboxes
    const checkboxes = document.querySelectorAll('.managed-post-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Remover clase selected de todos los items
    const postItems = document.querySelectorAll('.managed-post-item');
    postItems.forEach(item => {
        item.classList.remove('selected');
    });
    
    // Limpiar el array
    managedSelectedPosts = [];
    
    // Actualizar UI
    updateManagedSelectionUI();
    
    console.log('✅ Selección limpiada');
}

function updateManagedSelectionUI() {
    const selectedCount = document.getElementById('selectedPostsCount');
    const removeBtn = document.getElementById('removeSelectedBtn');
    const selectionInfo = document.getElementById('selectionInfo');
    
    if (selectedCount) selectedCount.textContent = managedSelectedPosts.length;
    
    if (managedSelectedPosts.length > 0) {
        if (removeBtn) removeBtn.disabled = false;
        if (selectionInfo) selectionInfo.style.display = 'flex';
    } else {
        if (removeBtn) removeBtn.disabled = true;
        if (selectionInfo) selectionInfo.style.display = 'none';
    }
}

// ===== ELIMINAR POSTS SELECCIONADOS =====
// ===== ELIMINAR POSTS SELECCIONADOS - VERSIÓN MEJORADA CON MANEJO DE ERRORES =====
async function removeSelectedPosts(collectionId) {
    if (managedSelectedPosts.length === 0) {
        showCollectionToast('❌ No hay posts seleccionados', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres eliminar ${managedSelectedPosts.length} posts de la colección?`)) {
        return;
    }
    
    try {
        showCollectionToast(`⏳ Eliminando ${managedSelectedPosts.length} posts...`, 'info');
        
        const addBtn = document.getElementById('removeSelectedBtn');
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // En la función removeSelectedPosts, reemplazar el bloque de eliminación:
        for (let i = 0; i < managedSelectedPosts.length; i++) {
            const postId = managedSelectedPosts[i];
            
            try {
                console.log(`🗑️ Eliminando post ${i + 1}/${managedSelectedPosts.length}:`, postId);
                
                const result = await removePostWithRetry(collectionId, postId, 2);
                
                if (result.success) {
                    successCount++;
                    console.log(`✅ Post ${postId} eliminado correctamente`);
                    removePostFromDOM(postId);
                } else {
                    errorCount++;
                    errors.push(`Post ${postId}: ${result.error}`);
                    console.error(`❌ Error eliminando post ${postId}:`, result.error);
                }
                
                // Pequeño delay entre eliminaciones
                if (i < managedSelectedPosts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                errorCount++;
                errors.push(`Post ${postId}: ${error.message}`);
                console.error(`❌ Error eliminando post ${postId}:`, error);
            }
        }
        
        // Actualizar UI
        managedSelectedPosts = [];
        updateManagedSelectionUI();
        updatePostCounters(collectionId);
        
        // Restaurar botón
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar Seleccionados';
        }
        
        // Mostrar resultados
        if (errorCount > 0) {
            const errorMessage = errors.length > 3 ? 
                `${errors.slice(0, 3).join(', ')}... y ${errors.length - 3} más` : 
                errors.join(', ');
            
            showCollectionToast(`✅ ${successCount} eliminados, ❌ ${errorCount} errores: ${errorMessage}`, 'warning');
        } else {
            showCollectionToast(`✅ ${successCount} posts eliminados exitosamente`, 'success');
        }
        
        // Verificar si quedan posts
        setTimeout(() => {
            const remainingPosts = document.querySelectorAll('.managed-post-item');
            if (remainingPosts.length === 0) {
                closeManagePostsModal();
                viewCollection(collectionId);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error general eliminando posts seleccionados:', error);
        showCollectionToast('❌ Error al eliminar los posts', 'error');
        
        // Restaurar botón en caso de error
        const addBtn = document.getElementById('removeSelectedBtn');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar Seleccionados';
        }
    }
}

// ===== FUNCIÓN AUXILIAR PARA REMOVER POSTS DEL DOM =====
function removePostFromDOM(postId) {
    // Remover de la vista de gestión
    const managedElement = document.querySelector(`.managed-post-item[data-post-id="${postId}"]`);
    if (managedElement) {
        managedElement.style.opacity = '0';
        managedElement.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            managedElement.remove();
        }, 300);
    }
    
    // Remover de la vista de detalle
    const postElement = document.querySelector(`.collection-post-item[data-post-id="${postId}"]`);
    if (postElement) {
        postElement.style.opacity = '0';
        postElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
            postElement.remove();
        }, 300);
    }
}

// ===== FILTRAR POSTS GESTIONADOS =====
function filterManagedPosts() {
    const searchTerm = document.getElementById('manageSearchInput').value.toLowerCase();
    const postItems = document.querySelectorAll('.managed-post-item');
    
    postItems.forEach(item => {
        const postText = item.querySelector('.managed-post-text').textContent.toLowerCase();
        const matchesSearch = postText.includes(searchTerm);
        
        if (matchesSearch) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===== CERRAR MODAL DE GESTIÓN =====
function closeManagePostsModal() {
    const modal = document.getElementById('managePostsModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    managedSelectedPosts = [];
}


// ===== FILTRAR POSTS =====
function filterPosts() {
    const searchTerm = document.getElementById('searchPostsInput').value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active');
    
    if (!activeFilter) {
        console.error('❌ No hay filtro activo');
        return;
    }
    
    const filterType = activeFilter.dataset.filter || 'all';
    const postCards = document.querySelectorAll('.post-selection-card');
    
    console.log('🔍 Filtrando posts:', { searchTerm, filterType, totalPosts: postCards.length });
    
    let visibleCount = 0;
    
    postCards.forEach(card => {
        const postText = card.querySelector('.post-preview-text')?.textContent.toLowerCase() || '';
        const postType = card.dataset.postType || 'texto';
        
        const matchesSearch = postText.includes(searchTerm);
        const matchesFilter = filterType === 'all' || 
                            (filterType === 'images' && postType === 'imagen') ||
                            (filterType === 'videos' && postType === 'video') ||
                            (filterType === 'audio' && postType === 'audio');
        
        if (matchesSearch && matchesFilter) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`✅ Posts visibles después de filtrar: ${visibleCount}`);
}

// ===== ESTABLECER FILTRO =====
function setPostsFilter(filter) {
    console.log('🎯 Aplicando filtro:', filter);
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Agregar data-filter a los botones si no existe
    document.querySelectorAll('.filter-btn').forEach((btn, index) => {
        if (!btn.dataset.filter) {
            const filters = ['all', 'images', 'videos', 'audio'];
            btn.dataset.filter = filters[index] || 'all';
        }
    });
    
    // Aplicar filtro
    filterPosts();
}

// ===== AGREGAR POSTS SELECCIONADOS A COLECCIÓN - VERSIÓN MEJORADA =====
async function addSelectedPostsToCollection(collectionId) {
    if (selectedPosts.length === 0) {
        showCollectionToast('❌ Selecciona al menos un post', 'error');
        return;
    }
    
    const addBtn = document.getElementById('addPostsBtn');
    const originalText = addBtn.innerHTML;
    
    try {
        // Deshabilitar botón
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agregando...';
        
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postIds: selectedPosts
            })
        });
        
        const result = await response.json();
        
        // En la parte de éxito de addSelectedPostsToCollection, reemplazar:
        if (result.success) {
            showCollectionToast(`✅ ${selectedPosts.length} posts agregados a la colección`, 'success');
            
            // Usar la nueva función de actualización
            refreshAfterAddingPosts(collectionId);
            
        } else {
            showCollectionToast(`❌ Error: ${result.error}`, 'error');
        }

    } catch (error) {
        console.error('Error agregando posts a colección:', error);
        showCollectionToast('❌ Error al agregar posts', 'error');
    } finally {
        // Rehabilitar botón
        addBtn.disabled = false;
        addBtn.innerHTML = originalText;
    }
}

// ===== ACTUALIZAR TODAS LAS VISTAS DE COLECCIÓN =====
async function updateAllCollectionViews(collectionId) {
    try {
        console.log('🔄 Actualizando todas las vistas para colección:', collectionId);
        
        // 1. Recargar los datos de la colección desde el servidor
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const updatedCollection = result.data;
        
        // 2. Actualizar en el array currentCollections
        const collectionIndex = currentCollections.findIndex(c => c._id === collectionId);
        if (collectionIndex !== -1) {
            currentCollections[collectionIndex] = updatedCollection;
        }
        
        // 3. Actualizar la vista de detalle si está abierta
        const detailModal = document.getElementById('collectionDetailModal');
        if (detailModal) {
            console.log('🔄 Actualizando modal de detalle...');
            showCollectionDetailModal(updatedCollection);
        }
        
        // 4. Actualizar la vista de gestión si está abierta
        const manageModal = document.getElementById('managePostsModal');
        if (manageModal) {
            console.log('🔄 Actualizando modal de gestión...');
            // Cerrar y reabrir el modal de gestión con los nuevos datos
            closeManagePostsModal();
            setTimeout(() => {
                openManagePostsModal(collectionId);
            }, 300);
        }
        
        // 5. Actualizar la tarjeta en el grid principal
        updateCollectionCard(collectionId, updatedCollection);
        
        // 6. Si estamos en vista vacía, reemplazar con la vista normal
        const emptyCollection = document.querySelector('.empty-collection');
        if (emptyCollection) {
            console.log('🔄 Reemplazando vista vacía...');
            replaceEmptyCollectionView(collectionId, updatedCollection);
        }
        
        console.log('✅ Todas las vistas actualizadas');
        
    } catch (error) {
        console.error('Error actualizando vistas:', error);
        // Fallback: recargar toda la página de colecciones
        loadUserCollections();
    }
}

function replaceEmptyCollectionView(collectionId, updatedCollection) {
    const emptySection = document.querySelector('.empty-collection');
    if (emptySection && emptySection.closest('.collection-posts-section')) {
        const postsSection = emptySection.closest('.collection-posts-section');
        postsSection.innerHTML = `
            <div class="collection-posts-header">
                <h4>Elementos en la colección (${updatedCollection.posts.length})</h4>
                <button class="btn-secondary btn-small" onclick="openManagePostsModal('${collectionId}')">
                    <i class="fas fa-cog"></i> Gestionar Posts
                </button>
            </div>
            <div class="collection-posts-grid">
                ${updatedCollection.posts.map(post => createCollectionPostHTML(post, collectionId)).join('')}
            </div>
        `;
    }
}

function updateCollectionCard(collectionId, updatedCollection) {
    const collectionCard = document.querySelector(`[data-collection-id="${collectionId}"]`);
    if (collectionCard) {
        console.log('🔄 Actualizando tarjeta de colección...');
        const newCardHTML = createCollectionCardHTML(updatedCollection);
        collectionCard.outerHTML = newCardHTML;
        
        // Re-inicializar eventos del menú para la nueva tarjeta
        setTimeout(() => {
            initializeCollectionMenuEvents();
        }, 100);
    }
}


// ===== CERRAR MODAL =====
function closeAddPostsModal() {
    const modal = document.getElementById('addPostsModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    
    // Resetear selección
    selectedPosts = [];
}




// ===== MENÚ DE OPCIONES DE COLECCIÓN =====
function openCollectionOptions(collectionId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('🎯 Abriendo menú de colección:', collectionId);
    
    const menu = document.getElementById(`collectionOptions-${collectionId}`);
    if (!menu) {
        console.error('❌ Menú de colección no encontrado:', `collectionOptions-${collectionId}`);
        return;
    }
    
    // Si el menú ya está abierto, cerrarlo
    if (menu.classList.contains('show')) {
        closeAllCollectionMenus();
        return;
    }
    
    // Cerrar otros menús primero
    closeAllCollectionMenus();
    
    // Mostrar este menú
    menu.style.display = 'block';
    
    // Pequeño delay para la animación CSS
    setTimeout(() => {
        menu.classList.add('show');
    }, 10);
    
    currentOpenCollectionMenu = collectionId;
    
    // Configurar evento para cerrar al hacer click fuera - VERSIÓN SIMPLIFICADA
    setTimeout(() => {
        const closeHandler = function(e) {
            const clickedMenu = e.target.closest('.collection-options-menu');
            const clickedButton = e.target.closest('.collection-actions .btn-icon');
            
            if (!clickedMenu && !clickedButton) {
                closeAllCollectionMenus();
                document.removeEventListener('click', closeHandler);
            }
        };
        
        document.addEventListener('click', closeHandler);
    }, 100);
}

function setupCollectionMenuCloseHandler(collectionId) {
    // Remover handler anterior si existe
    if (collectionMenuClickHandler) {
        document.removeEventListener('click', collectionMenuClickHandler);
    }
    
    collectionMenuClickHandler = function(e) {
        const menu = document.getElementById(`collectionOptions-${collectionId}`);
        const button = document.querySelector(`#collectionOptions-${collectionId}`)?.closest('.collection-actions')?.querySelector('.btn-icon');
        
        const isClickInsideMenu = menu?.contains(e.target);
        const isClickOnButton = button?.contains(e.target);
        
        if (!isClickInsideMenu && !isClickOnButton) {
            closeAllCollectionMenus();
        }
    };
    
    // Usar setTimeout para evitar que se active inmediatamente
    setTimeout(() => {
        document.addEventListener('click', collectionMenuClickHandler);
    }, 100);
}

function closeAllCollectionMenus() {
    console.log('🔒 Cerrando todos los menús de colecciones...');
    
    document.querySelectorAll('.collection-options-menu').forEach(menu => {
        menu.classList.remove('show');
        
        // Esperar a que termine la animación antes de ocultar completamente
        setTimeout(() => {
            menu.style.display = 'none';
        }, 200);
    });
    
    currentOpenCollectionMenu = null;
}

function closeCollectionOptions() {
    document.querySelectorAll('.collection-options-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

// ===== CERRAR MODAL DE CREACIÓN =====
function closeCreateCollectionModal() {
    const modal = document.getElementById('createCollectionModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    isEditing = false;
    currentEditingCollectionId = null;
}

// ===== FUNCIONES AUXILIARES =====
function getIconOptions() {
    const icons = [
        'fas fa-folder', 'fas fa-heart', 'fas fa-star', 'fas fa-bookmark',
        'fas fa-camera', 'fas fa-music', 'fas fa-video', 'fas fa-utensils',
        'fas fa-plane', 'fas fa-graduation-cap', 'fas fa-briefcase',
        'fas fa-gamepad', 'fas fa-palette', 'fas fa-dumbbell'
    ];
    
    return icons.map(icon => `
        <label class="icon-option">
            <input type="radio" name="icono" value="${icon}" ${icon === 'fas fa-folder' ? 'checked' : ''}>
            <i class="${icon}"></i>
        </label>
    `).join('');
}

// ===== CREAR POST SOBRE NUEVA COLECCIÓN =====
async function createCollectionPost(collection) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        const postData = {
            autor: currentUser._id,
            contenido: `¡Acabo de crear la colección "${collection.nombre}"! 📁 ${collection.descripcion ? collection.descripcion : ''}`,
            tipoContenido: 'texto'
        };
        
        await fetch(`${API_URL_CO}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        
    } catch (error) {
        console.error('Error creando post de colección:', error);
    }
}

// ===== VER COLECCIÓN DETALLADA =====
async function viewCollection(collectionId, event) {
    // Si el evento viene del menú de opciones, no hacer nada
    if (event && (event.target.closest('.collection-actions') || event.target.closest('.collection-options-menu'))) {
        return;
    }
    
    try {
        console.log('👀 Abriendo colección:', collectionId);
        
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}`);
        const result = await response.json();
        
        if (result.success) {
            currentCollection = result.data;
            showCollectionDetailModal(currentCollection);
        } else {
            showCollectionToast('❌ Error al cargar la colección', 'error');
        }
    } catch (error) {
        console.error('Error viendo colección:', error);
        showCollectionToast('❌ Error al cargar la colección', 'error');
    }
}

// ===== MODAL DE DETALLE DE COLECCIÓN - VERSIÓN MEJORADA =====
function showCollectionDetailModal(collection) {
    const existingModal = document.getElementById('collectionDetailModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'collectionDetailModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>
                    <div class="collection-icon-small" style="background-color: ${collection.color};">
                        <i class="${collection.icono}"></i>
                    </div>
                    ${collection.nombre}
                </h3>
                <span class="close-modal" onclick="closeCollectionDetailModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="collection-detail">
                    <div class="collection-info">
                        <p class="collection-description">${collection.descripcion || 'Sin descripción'}</p>
                        
                        <div class="collection-meta">
                            <span class="meta-item">
                                <i class="fas fa-user"></i>
                                Creada por ${collection.usuario.nombre}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-images"></i>
                                ${collection.posts.length} elementos
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-clock"></i>
                                Actualizada ${getTimeAgo(new Date(collection.fecha_actualizacion))}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-globe"></i>
                                ${collection.tipo === 'publica' ? 'Pública' : 'Privada'}
                            </span>
                        </div>
                        
                        ${collection.etiquetas && collection.etiquetas.length > 0 ? `
                            <div class="collection-tags-detail">
                                ${collection.etiquetas.map(tag => `
                                    <span class="tag">${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="collection-posts-section">
                        <div class="collection-posts-header">
                            <h4>Elementos en la colección (${collection.posts.length})</h4>
                            ${isOwnProfile && collection.posts.length > 0 ? `
                                <button class="btn-secondary btn-small" onclick="openManagePostsModal('${collection._id}')">
                                    <i class="fas fa-cog"></i> Gestionar Posts
                                </button>
                            ` : ''}
                        </div>
                        
                        ${collection.posts.length > 0 ? `
                            <div class="collection-posts-grid">
                                ${collection.posts.map(post => createCollectionPostHTML(post, collection._id)).join('')}
                            </div>
                        ` : `
                            <div class="empty-collection">
                                <i class="fas fa-inbox"></i>
                                <p>Esta colección está vacía</p>
                                <small>Agrega publicaciones desde tu perfil o el feed</small>
                                ${isOwnProfile ? `
                                    <br>
                                    <br>
                                    <button class="btn-primary" onclick="addPostsToCollection('${collection._id}')">
                                        <i class="fas fa-plus"></i> Agregar Posts
                                    </button>
                                ` : ''}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Guardar la colección actual
    currentCollection = collection;
}

// ===== ELIMINAR POST DE COLECCIÓN - VERSIÓN COMPLETAMENTE CORREGIDA =====
async function removePostFromCollection(collectionId, postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('🗑️ Intentando eliminar post de colección:', { collectionId, postId });
    
    try {
        if (!confirm('¿Estás seguro de que quieres eliminar este post de la colección?')) {
            return;
        }
        
        showCollectionToast('⏳ Eliminando post de la colección...', 'info');
        
        const response = await fetch(`${API_URL_CO}/collections/${collectionId}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showCollectionToast('✅ Post eliminado de la colección', 'success');
            
            // Remover del DOM
            removePostFromDOM(postId);
            
            // Actualizar contadores
            updatePostCounters(collectionId);
            
            // Verificar si estamos en modal de gestión y actualizar
            const manageModal = document.getElementById('managePostsModal');
            if (manageModal) {
                // Remover del array de selección si estaba seleccionado
                managedSelectedPosts = managedSelectedPosts.filter(id => id !== postId);
                updateManagedSelectionUI();
                
                // Verificar si quedan posts
                const remainingPosts = document.querySelectorAll('.managed-post-item');
                if (remainingPosts.length === 0) {
                    setTimeout(() => {
                        closeManagePostsModal();
                        viewCollection(collectionId);
                    }, 1000);
                }
            }
            
            // Verificar si estamos en vista detalle
            const detailModal = document.getElementById('collectionDetailModal');
            if (detailModal) {
                const remainingPosts = document.querySelectorAll('.collection-post-item');
                if (remainingPosts.length === 0) {
                    showEmptyCollectionState(collectionId);
                }
            }
            
        } else {
            // Manejar errores específicos del servidor
            let errorMessage = 'Error desconocido';
            if (result.error && result.error.includes('No matching document found')) {
                errorMessage = 'Error de sincronización. Por favor, recarga la página e intenta nuevamente.';
            } else if (result.error) {
                errorMessage = result.error;
            }
            
            showCollectionToast(`❌ ${errorMessage}`, 'error');
            console.error('Error del servidor:', result.error);
        }
        
    } catch (error) {
        console.error('Error eliminando post de colección:', error);
        
        let userMessage = 'Error al eliminar el post';
        if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            userMessage = 'Error del servidor. Por favor, intenta nuevamente.';
        } else if (error.message.includes('No matching document found')) {
            userMessage = 'Error de sincronización. Recarga la página e intenta nuevamente.';
        }
        
        showCollectionToast(`❌ ${userMessage}`, 'error');
    }
}

// ===== MODAL PARA GESTIONAR POSTS EN COLECCIÓN - VERSIÓN MEJORADA =====
function openManagePostsModal(collectionId) {
    // Cerrar modal existente si hay uno
    closeManagePostsModal();
    
    const collection = currentCollections.find(c => c._id === collectionId);
    if (!collection) {
        console.error('❌ Colección no encontrada:', collectionId);
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'managePostsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; height: 90vh;">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-cog"></i> 
                    Gestionar Posts en "${collection.nombre}"
                </h3>
                <span class="close-modal" onclick="closeManagePostsModal()">&times;</span>
            </div>
            <div class="modal-body" style="height: calc(100% - 120px); display: flex; flex-direction: column;">
                <div class="manage-posts-container" style="flex: 1; display: flex; flex-direction: column;">
                    <!-- Estadísticas rápidas -->
                    <div class="posts-stats">
                        <div class="stat-card">
                            <i class="fas fa-images"></i>
                            <span class="stat-number">${collection.posts.filter(p => p.tipoContenido === 'imagen').length}</span>
                            <span class="stat-label">Imágenes</span>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-video"></i>
                            <span class="stat-number">${collection.posts.filter(p => p.tipoContenido === 'video').length}</span>
                            <span class="stat-label">Videos</span>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-music"></i>
                            <span class="stat-number">${collection.posts.filter(p => p.tipoContenido === 'audio').length}</span>
                            <span class="stat-label">Audios</span>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-file-alt"></i>
                            <span class="stat-number">${collection.posts.filter(p => !p.tipoContenido || p.tipoContenido === 'texto').length}</span>
                            <span class="stat-label">Texto</span>
                        </div>
                    </div>
                    
                    <!-- Búsqueda y acciones -->
                    <div class="manage-actions">
                        <div class="search-input-with-icon">
                            <i class="fas fa-search"></i>
                            <input 
                                type="text" 
                                id="manageSearchInput" 
                                placeholder="Buscar posts en esta colección..."
                                onkeyup="filterManagedPosts()"
                            >
                        </div>
                        <div class="action-buttons">
                            <button class="btn-primary" onclick="addPostsToCollection('${collectionId}')">
                                <i class="fas fa-plus"></i> Agregar Posts
                            </button>
                            <button class="btn-secondary" onclick="selectAllManagedPosts()">
                                <i class="fas fa-check-square"></i> Seleccionar Todos
                            </button>
                            <button class="btn-danger" id="removeSelectedBtn" onclick="removeSelectedPosts('${collectionId}')" disabled>
                                <i class="fas fa-trash"></i> Eliminar Seleccionados
                            </button>
                        </div>
                    </div>
                    
                    <!-- Lista de posts con checkboxes -->
                    <div class="managed-posts-list" id="managedPostsList">
                        ${collection.posts.length > 0 ? 
                            collection.posts.map(post => createManagedPostItem(post, collectionId)).join('') 
                            : `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h3>No hay posts en esta colección</h3>
                                <p>Agrega algunos posts para comenzar a gestionarlos.</p>
                                <button class="btn-primary" onclick="addPostsToCollection('${collectionId}')">
                                    <i class="fas fa-plus"></i> Agregar Posts
                                </button>
                            </div>
                        `}
                    </div>
                    
                    <!-- Contador de seleccionados -->
                    <div class="selection-info" id="selectionInfo" style="display: none;">
                        <i class="fas fa-check-circle"></i>
                        <span id="selectedPostsCount">0</span> posts seleccionados
                        <button class="btn-text" onclick="clearSelection()">Limpiar selección</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Resetear selección
    managedSelectedPosts = [];
    updateManagedSelectionUI();
}

function createManagedPostItem(post, collectionId) {
    const isImage = post.tipoContenido === 'imagen' && post.imagen;
    const isVideo = post.tipoContenido === 'video' && post.video;
    const isAudio = post.tipoContenido === 'audio' && post.audio;
    
    let mediaPreview = '';
    let typeIcon = 'fas fa-file-alt';
    
    if (isImage) {
        mediaPreview = `<img src="${post.imagen}" alt="Imagen" class="managed-post-preview">`;
        typeIcon = 'fas fa-image';
    } else if (isVideo) {
        mediaPreview = `
            <div class="managed-video-preview">
                <i class="fas fa-play"></i>
            </div>
        `;
        typeIcon = 'fas fa-video';
    } else if (isAudio) {
        mediaPreview = `
            <div class="managed-audio-preview">
                <i class="fas fa-music"></i>
            </div>
        `;
        typeIcon = 'fas fa-music';
    } else {
        mediaPreview = `
            <div class="managed-text-preview">
                <p>${post.contenido ? post.contenido.substring(0, 80) + (post.contenido.length > 80 ? '...' : '') : 'Publicación'}</p>
            </div>
        `;
    }
    
    const timeAgo = getTimeAgo(new Date(post.fecha_publicacion));
    const contentPreview = post.contenido ? 
        post.contenido.substring(0, 120) + (post.contenido.length > 120 ? '...' : '') : 
        'Publicación';
    
    return `
        <div class="managed-post-item" data-post-id="${post._id}" onclick="toggleManagedPostSelectionByCard('${post._id}')">
            <div class="managed-post-checkbox" onclick="event.stopPropagation()">
                <input type="checkbox" id="manage-post-${post._id}" onchange="toggleManagedPostSelection('${post._id}')">
                <label for="manage-post-${post._id}"></label>
            </div>
            
            <div class="managed-post-content">
                <div class="managed-post-preview-container">
                    ${mediaPreview}
                    <div class="managed-post-type">
                        <i class="${typeIcon}"></i>
                    </div>
                </div>
                
                <div class="managed-post-info">
                    <p class="managed-post-text">${contentPreview}</p>
                    <div class="managed-post-meta">
                        <span class="post-date">
                            <i class="fas fa-clock"></i> ${timeAgo}
                        </span>
                        <span class="post-stats">
                            <i class="fas fa-heart"></i> ${post.likes?.length || 0}
                            <i class="fas fa-comment"></i> ${post.comentarios?.length || 0}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="managed-post-actions" onclick="event.stopPropagation()">
                <button class="btn-icon btn-view" onclick="viewPost('${post._id}')" title="Ver post">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-remove" onclick="removePostFromCollection('${collectionId}', '${post._id}', event)" title="Eliminar de colección">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

// ===== CREAR HTML DE POST EN COLECCIÓN - ACTUALIZADA CON BOTÓN ELIMINAR =====
function createCollectionPostHTML(post, collectionId) {
    const isImage = post.tipoContenido === 'imagen' && post.imagen;
    const isVideo = post.tipoContenido === 'video' && post.video;
    const isAudio = post.tipoContenido === 'audio' && post.audio;
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    
    let mediaContent = '';
    
    if (isImage) {
        mediaContent = `<img src="${post.imagen}" alt="Imagen" class="post-thumbnail">`;
    } else if (isVideo) {
        mediaContent = `
            <div class="video-thumbnail">
                <i class="fas fa-play"></i>
                <video>
                    <source src="${post.video}" type="video/mp4">
                </video>
            </div>
        `;
    } else if (isAudio) {
        mediaContent = `
            <div class="audio-thumbnail">
                <i class="fas fa-music"></i>
            </div>
        `;
    } else {
        mediaContent = `
            <div class="text-thumbnail">
                <i class="fas fa-file-alt"></i>
                <p>${post.contenido ? post.contenido.substring(0, 100) + (post.contenido.length > 100 ? '...' : '') : 'Publicación'}</p>
            </div>
        `;
    }
    
    return `
        <div class="collection-post-item ${isOwnProfile ? 'with-actions' : 'without-actions'}" data-post-id="${post._id}">
            <div class="collection-post-content" onclick="viewPost('${post._id}')">
                ${mediaContent}
                <div class="post-overlay">
                    <div class="post-info">
                        <p class="post-preview">${post.contenido ? post.contenido.substring(0, 50) + (post.contenido.length > 50 ? '...' : '') : 'Publicación'}</p>
                        <span class="post-date">${getTimeAgo(new Date(post.fecha_publicacion))}</span>
                    </div>
                </div>
            </div>
            ${isOwnProfile ? `
                <button class="btn-remove-from-collection" onclick="removePostFromCollection('${collectionId}', '${post._id}', event)">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        </div>
    `;
}

function closeCollectionDetailModal() {
    const modal = document.getElementById('collectionDetailModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

// ===== ELIMINACIÓN CON REINTENTO =====
async function removePostWithRetry(collectionId, postId, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Intento ${attempt} de eliminar post ${postId}`);
            
            const response = await fetch(`${API_URL_CO}/collections/${collectionId}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Post ${postId} eliminado en intento ${attempt}`);
                return { success: true };
            } else {
                throw new Error(result.error || 'Error desconocido del servidor');
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`❌ Intento ${attempt} fallido:`, error.message);
            
            // Esperar antes del siguiente intento (backoff exponencial)
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    return { 
        success: false, 
        error: lastError?.message || 'Error después de todos los reintentos' 
    };
}

// ===== FUNCIONES DE UTILIDAD =====
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

// ===== ACTUALIZAR CONTADORES - VERSIÓN MÁS ROBUSTA =====
function updatePostCounters(collectionId) {
    try {
        // Contar posts en el DOM actual
        const postElements = document.querySelectorAll('.collection-post-item');
        const managedElements = document.querySelectorAll('.managed-post-item');
        const currentCount = Math.max(postElements.length, managedElements.length);
        
        // Actualizar contador en el modal de detalle
        const postsCountElement = document.querySelector('.collection-posts-header h4');
        if (postsCountElement) {
            postsCountElement.textContent = `Elementos en la colección (${currentCount})`;
        }
        
        // Actualizar contador en las tarjetas de colección
        const collectionCard = document.querySelector(`[data-collection-id="${collectionId}"]`);
        if (collectionCard) {
            const statElement = collectionCard.querySelector('.collection-stats .stat:first-child');
            if (statElement) {
                statElement.innerHTML = `<i class="fas fa-image"></i> ${currentCount} ${currentCount === 1 ? 'elemento' : 'elementos'}`;
            }
        }
        
        // Actualizar estadísticas en el modal de gestión si está abierto
        const manageModal = document.getElementById('managePostsModal');
        if (manageModal) {
            updateManageStats(collectionId);
        }
        
        console.log(`🔢 Contadores actualizados: ${currentCount} posts`);
        
    } catch (error) {
        console.error('Error actualizando contadores:', error);
    }
}

function updateManageStats(collectionId) {
    const collection = currentCollections.find(c => c._id === collectionId);
    if (!collection) return;
    
    const stats = {
        images: collection.posts.filter(p => p.tipoContenido === 'imagen').length,
        videos: collection.posts.filter(p => p.tipoContenido === 'video').length,
        audio: collection.posts.filter(p => p.tipoContenido === 'audio').length,
        text: collection.posts.filter(p => !p.tipoContenido || p.tipoContenido === 'texto').length
    };
    
    // Actualizar las tarjetas de estadísticas
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length === 4) {
        statCards[0].querySelector('.stat-number').textContent = stats.images;
        statCards[1].querySelector('.stat-number').textContent = stats.videos;
        statCards[2].querySelector('.stat-number').textContent = stats.audio;
        statCards[3].querySelector('.stat-number').textContent = stats.text;
    }
}

// ===== MOSTRAR ESTADO VACÍO =====
function showEmptyCollectionState(collectionId) {
    const postsSection = document.querySelector('.collection-posts-section');
    if (postsSection) {
        postsSection.innerHTML = `
            <div class="empty-collection">
                <i class="fas fa-inbox"></i>
                <p>Esta colección está vacía</p>
                <small>Agrega publicaciones desde tu perfil o el feed</small>
                <button class="btn-primary" onclick="addPostsToCollection('${collectionId}')">
                    <i class="fas fa-plus"></i> Agregar Posts
                </button>
            </div>
        `;
    }
}

// FUNCIÓN TOAST CORREGIDA - SIN RECURSIÓN
function showCollectionToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[Colecciones] ${type}: ${message}`);
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'info' ? '#3498db' : '#2ecc71'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }
}

// ===== INICIALIZAR CHECKBOXES AL CARGAR POSTS =====
function initializeCheckboxes() {
    console.log('🔧 Inicializando checkboxes...');
    
    const checkboxes = document.querySelectorAll('#addPostsModal .post-selection-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const postId = checkbox.id.replace('post-', '');
        updateCheckboxVisual(postId, checkbox.checked);
    });
    
    console.log(`✅ ${checkboxes.length} checkboxes inicializados`);
}

// Función para inicializar eventos de los menús de colecciones
function initializeCollectionMenuEvents() {
    console.log('🎯 Inicializando eventos de menús de colecciones...');
    
    // Cerrar menús al hacer scroll
    window.addEventListener('scroll', closeAllCollectionMenus);
    
    // Cerrar menús al cambiar de sección
    const navItems = document.querySelectorAll('.profile-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', closeAllCollectionMenus);
    });
    
    console.log('✅ Eventos de menús de colecciones inicializados');
}

// ===== REMOVER POST SELECCIONADO - NUEVA FUNCIÓN =====
function removeSelectedPost(postId) {
    console.log('🗑️ Removiendo post de selección:', postId);
    
    // Encontrar el checkbox y desmarcarlo
    const checkbox = document.getElementById(`post-${postId}`);
    if (checkbox) {
        checkbox.checked = false;
        togglePostSelection(postId);
    } else {
        console.error('❌ Checkbox no encontrado para post:', postId);
        
        // Remover directamente de la selección como fallback
        selectedPosts = selectedPosts.filter(id => id !== postId);
        updateSelectedPostsUI();
        
        // También remover la clase selected del card
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            postCard.classList.remove('selected');
        }
    }
}

// ===== NUEVAS FUNCIONES PARA SELECCIÓN POR CARD =====
function togglePostSelectionByCard(postId) {
    const checkbox = document.getElementById(`post-${postId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateCheckboxVisual(postId, checkbox.checked);
        updateSelectedPostsUI();
    }
}

function toggleManagedPostSelectionByCard(postId) {
    const checkbox = document.getElementById(`manage-post-${postId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            if (!managedSelectedPosts.includes(postId)) {
                managedSelectedPosts.push(postId);
                checkbox.closest('.managed-post-item').classList.add('selected');
            }
        } else {
            managedSelectedPosts = managedSelectedPosts.filter(id => id !== postId);
            checkbox.closest('.managed-post-item').classList.remove('selected');
        }
        
        updateManagedSelectionUI();
    }
}



// ===== HACER FUNCIONES GLOBALES =====
// ===== HACER FUNCIONES GLOBALES - LISTA LIMPIA =====
window.safelyCloseModal = safelyCloseModal;
window.closeDeleteCollectionModal = closeDeleteCollectionModal;
window.closeCreateCollectionModal = closeCreateCollectionModal;
window.closeCollectionDetailModal = closeCollectionDetailModal;
window.closeAddPostsModal = closeAddPostsModal;
window.closeManagePostsModal = closeManagePostsModal;
window.updateUIAfterPostRemoval = updateUIAfterPostRemoval;
window.showEmptyCollectionState = showEmptyCollectionState;
window.initializeCollections = initializeCollections;
window.openCreateCollectionModal = openCreateCollectionModal;
window.viewCollection = viewCollection;
window.editCollection = editCollection;
window.confirmDeleteCollection = confirmDeleteCollection;
window.deleteCollection = deleteCollection;
window.addPostsToCollection = addPostsToCollection;
window.openCollectionOptions = openCollectionOptions;
window.closeAllCollectionMenus = closeAllCollectionMenus;
window.initializeCollectionMenuEvents = initializeCollectionMenuEvents;
window.togglePostSelection = togglePostSelection;
window.removeSelectedPost = removeSelectedPost;
window.filterPosts = filterPosts;
window.setPostsFilter = setPostsFilter;
window.addSelectedPostsToCollection = addSelectedPostsToCollection;
window.removePostFromCollection = removePostFromCollection;
window.openManagePostsModal = openManagePostsModal;
window.toggleManagedPostSelection = toggleManagedPostSelection;
window.selectAllManagedPosts = selectAllManagedPosts;
window.clearSelection = clearSelection;
window.removeSelectedPosts = removeSelectedPosts;
window.filterManagedPosts = filterManagedPosts;
window.updatePostCounters = updatePostCounters;
window.updateManageStats = updateManageStats;
window.removePostFromDOM = removePostFromDOM;
window.removePostWithRetry = removePostWithRetry;
window.updateAllCollectionViews = updateAllCollectionViews;
window.updateCollectionCard = updateCollectionCard;
window.replaceEmptyCollectionView = replaceEmptyCollectionView;
window.refreshAfterAddingPosts = refreshAfterAddingPosts;
window.togglePostSelectionByCard = togglePostSelectionByCard;
window.toggleManagedPostSelectionByCard = toggleManagedPostSelectionByCard;
window.viewCollection = viewCollection;

// ===== FUNCIÓN DE DIAGNÓSTICO =====
function debugCollectionMenus() {
    console.log('🔍 DIAGNÓSTICO DE MENÚS DE COLECCIONES:');
    
    // Verificar que los menús existen en el DOM
    const menus = document.querySelectorAll('.collection-options-menu');
    console.log(`📋 Menús encontrados en DOM: ${menus.length}`);
    
    menus.forEach(menu => {
        console.log(`🎯 Menú: ${menu.id}, Display: ${menu.style.display}, Clases: ${menu.className}`);
    });
    
    // Verificar que los botones existen
    const buttons = document.querySelectorAll('.collection-actions .btn-icon');
    console.log(`🔘 Botones encontrados: ${buttons.length}`);
    
    buttons.forEach(button => {
        console.log(`🔘 Botón:`, button);
    });
    
    // Verificar eventos
    console.log('🎯 Event listeners activos:', {
        currentOpenCollectionMenu,
        collectionMenuClickHandler: !!collectionMenuClickHandler
    });
}

// Llamar al diagnóstico después de cargar las colecciones
setTimeout(debugCollectionMenus, 1000);

// ===== DIAGNÓSTICO DEL MODAL =====
function diagnoseAddPostsModal() {
    console.log('🔍 DIAGNÓSTICO DEL MODAL AGREGAR POSTS:');
    
    const modal = document.getElementById('addPostsModal');
    console.log('✅ Modal presente:', !!modal);
    
    const grid = document.getElementById('postsSelectionGrid');
    console.log('✅ Grid presente:', !!grid);
    
    const posts = document.querySelectorAll('.post-selection-card');
    console.log('✅ Posts en grid:', posts.length);
    
    const checkboxes = document.querySelectorAll('.post-selection-checkbox input');
    console.log('✅ Checkboxes:', checkboxes.length);
    
    console.log('✅ Posts seleccionados:', selectedPosts);
    
    // Verificar event listeners
    posts.forEach((post, index) => {
        const postId = post.dataset.postId;
        const checkbox = document.getElementById(`post-${postId}`);
        console.log(`📋 Post ${index}:`, {
            id: postId,
            checkboxExists: !!checkbox,
            checkboxChecked: checkbox ? checkbox.checked : 'N/A'
        });
    });
}

// Hacerla global para poder llamarla desde la consola
window.diagnoseAddPostsModal = diagnoseAddPostsModal;

// ===== DIAGNÓSTICO DE CHECKBOXES =====
function diagnoseCheckboxes() {
    console.log('🔍 DIAGNÓSTICO DE CHECKBOXES:');
    
    const checkboxes = document.querySelectorAll('#addPostsModal .post-selection-checkbox input[type="checkbox"]');
    console.log(`✅ Checkboxes encontrados: ${checkboxes.length}`);
    
    checkboxes.forEach((checkbox, index) => {
        const postId = checkbox.id.replace('post-', '');
        const label = document.querySelector(`label[for="post-${postId}"]`);
        
        console.log(`📋 Checkbox ${index}:`, {
            id: checkbox.id,
            checked: checkbox.checked,
            labelExists: !!label,
            labelContent: label ? window.getComputedStyle(label, '::after').content : 'N/A',
            postCard: document.querySelector(`[data-post-id="${postId}"]`) ? 'EXISTE' : 'NO EXISTE'
        });
        
        // Verificar estilos computados
        if (label) {
            const styles = window.getComputedStyle(label, '::after');
            console.log(`🎨 Estilos ::after:`, {
                content: styles.content,
                opacity: styles.opacity,
                visibility: styles.visibility
            });
        }
    });
}

// Hacerla global
window.diagnoseCheckboxes = diagnoseCheckboxes;

// ===== FORZAR ACTUALIZACIÓN DE TODOS LOS CHECKBOXES =====
function forceAllCheckboxes() {
    console.log('🔄 Forzando actualización de TODOS los checkboxes...');
    
    const checkboxes = document.querySelectorAll('#addPostsModal .post-selection-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const postId = checkbox.id.replace('post-', '');
        updateCheckboxVisual(postId, checkbox.checked);
    });
    
    console.log(`✅ ${checkboxes.length} checkboxes actualizados`);
}

window.forceAllCheckboxes = forceAllCheckboxes;
// SCRIPT DE EMERGENCIA - Ejecutar automáticamente
setTimeout(() => {
    if (document.getElementById('addPostsModal')) {
        console.log('🚀 Modal de agregar posts detectado - inicializando checkboxes...');
        initializeCheckboxes();
        
        // Forzar actualización cada segundo durante 5 segundos (solo para debug)
        let attempts = 0;
        const interval = setInterval(() => {
            if (attempts >= 5) {
                clearInterval(interval);
                return;
            }
            forceAllCheckboxes();
            attempts++;
        }, 1000);
    }
}, 500);

// ===== DEBUG DE COLECCIÓN =====
function debugCollection(collectionId) {
    const collection = currentCollections.find(c => c._id === collectionId);
    if (!collection) {
        console.error('❌ Colección no encontrada:', collectionId);
        return;
    }
    
    console.log('🔍 DEBUG COLECCIÓN:', {
        id: collection._id,
        nombre: collection.nombre,
        postsCount: collection.posts.length,
        posts: collection.posts.map(p => ({
            id: p._id,
            tipo: p.tipoContenido,
            contenido: p.contenido?.substring(0, 50)
        }))
    });
}

window.debugCollection = debugCollection;