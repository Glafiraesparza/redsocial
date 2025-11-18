// frontend/js/collections.js - VERSIÓN CORREGIDA
let currentCollections = [];
let currentCollection = null;
let isEditing = false;
let currentEditingCollectionId = null;
let currentOpenCollectionMenu = null;
let collectionMenuClickHandler = null;

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

        const response = await fetch(`${API_URL}/collections/usuario/${currentUser._id}`);
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

// ===== CREAR TARJETA DE COLECCIÓN MEJORADA =====
function createCollectionCardHTML(collection) {
    const postCount = collection.posts?.length || 0;
    const lastUpdated = getTimeAgo(new Date(collection.fecha_actualizacion));
    
    return `
        <div class="collection-card" data-collection-id="${collection._id}">
            
            <div class="collection-header">
                <div class="collection-icon" style="background-color: ${collection.color};">
                    <i class="${collection.icono}"></i>
                </div>
                <div class="collection-actions">
                    <button class="btn-icon" onclick="openCollectionOptions('${collection._id}', event)">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="collection-options-menu" id="collectionOptions-${collection._id}">
                        <button class="option-item" onclick="editCollection('${collection._id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="option-item" onclick="addPostsToCollection('${collection._id}')">
                            <i class="fas fa-plus"></i> Agregar posts
                        </button>
                        <button class="option-item delete-option" onclick="confirmDeleteCollection('${collection._id}', '${collection.nombre}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="collection-content" onclick="viewCollection('${collection._id}')">
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
        const response = await fetch(`${window.API_URL || 'http://localhost:3001/api'}/collections/${collectionId}`);
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
            response = await fetch(`${window.API_URL || 'http://localhost:3001/api'}/collections/${currentEditingCollectionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(collectionData)
            });
        } else {
            // Crear nueva colección
            response = await fetch(`${window.API_URL || 'http://localhost:3001/api'}/collections`, {
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

// ===== ELIMINAR COLECCIÓN =====
function confirmDeleteCollection(collectionId, collectionName) {
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
}

async function deleteCollection(collectionId) {
    try {
        const response = await fetch(`${window.API_URL || 'http://localhost:3001/api'}/collections/${collectionId}`, {
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
    // Aquí va tu lógica para agregar posts
    showToast('🔧 Funcionalidad para agregar posts disponible pronto', 'info');
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
        
        await fetch(`${window.API_URL || 'http://localhost:3001/api'}/posts`, {
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
async function viewCollection(collectionId) {
    try {
        const response = await fetch(`${window.API_URL || 'http://localhost:3001/api'}/collections/${collectionId}`);
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

// ===== MODAL DE DETALLE DE COLECCIÓN =====
function showCollectionDetailModal(collection) {
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
                        <h4>Elementos en la colección (${collection.posts.length})</h4>
                        
                        ${collection.posts.length > 0 ? `
                            <div class="collection-posts-grid">
                                ${collection.posts.map(post => createCollectionPostHTML(post)).join('')}
                            </div>
                        ` : `
                            <div class="empty-collection">
                                <i class="fas fa-inbox"></i>
                                <p>Esta colección está vacía</p>
                                <small>Agrega publicaciones desde tu perfil o el feed</small>
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
}

function createCollectionPostHTML(post) {
    const isImage = post.tipoContenido === 'imagen' && post.imagen;
    const isVideo = post.tipoContenido === 'video' && post.video;
    const isAudio = post.tipoContenido === 'audio' && post.audio;
    
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
                <p>${post.contenido.substring(0, 100)}${post.contenido.length > 100 ? '...' : ''}</p>
            </div>
        `;
    }
    
    return `
        <div class="collection-post-item" onclick="viewPost('${post._id}')">
            ${mediaContent}
            <div class="post-overlay">
                <div class="post-info">
                    <p class="post-preview">${post.contenido.substring(0, 50)}${post.contenido.length > 50 ? '...' : ''}</p>
                    <span class="post-date">${getTimeAgo(new Date(post.fecha_publicacion))}</span>
                </div>
            </div>
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

// ===== HACER FUNCIONES GLOBALES =====
window.initializeCollections = initializeCollections;
window.openCreateCollectionModal = openCreateCollectionModal;
window.viewCollection = viewCollection;
window.closeCreateCollectionModal = closeCreateCollectionModal;
window.closeCollectionDetailModal = closeCollectionDetailModal;
window.editCollection = editCollection;
window.confirmDeleteCollection = confirmDeleteCollection;
window.deleteCollection = deleteCollection;
window.closeDeleteCollectionModal = closeDeleteCollectionModal;
window.addPostsToCollection = addPostsToCollection;
window.openCollectionOptions = openCollectionOptions;
window.openCollectionOptions = openCollectionOptions;
window.closeAllCollectionMenus = closeAllCollectionMenus;
window.editCollection = editCollection;
window.addPostsToCollection = addPostsToCollection;
window.confirmDeleteCollection = confirmDeleteCollection;
window.deleteCollection = deleteCollection;
window.viewCollection = viewCollection;
window.initializeCollectionMenuEvents = initializeCollectionMenuEvents;

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