const API_URL = 'http://localhost:3001/api';

// Variables globales
let currentUser = null;
let userProfileData = null;
let currentCoverIndex = 0;
let coverPhotos = [];
let currentPosts = []; 

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 profile.js cargado correctamente');
    initializeProfile();
});

async function initializeProfile() {
    console.log('🚀 Inicializando Perfil...');
    
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    console.log('✅ Usuario actual:', currentUser);
    
    // Hacer las funciones disponibles globalmente
    makeFunctionsGlobal();
    makeOptionsFunctionsGlobal(); // ← AGREGAR ESTA LÍNEA
    
    initializeSidebar();
    initializeEventListeners();
    initializeFriendMenuEvents(); // ← AGREGAR ESTA LÍNEA
    await loadUserProfile();
    
    // Inicializar eventos de modales después de cargar
    setTimeout(initializeModalEvents, 500);
}


// ===== HACER FUNCIONES GLOBALES =====
// ===== HACER FUNCIONES GLOBALES - VERSIÓN CORREGIDA =====
function makeFunctionsGlobal() {
    console.log('🌍 Haciendo funciones globales...');
    
    // Funciones de modales - CON EVENTOS DIRECTOS
    window.openCoverPhotoModal = function() {
        console.log('🎯 openCoverPhotoModal llamado GLOBALMENTE');
        const modal = document.getElementById('coverPhotoModal');
        if (modal) {
            console.log('✅ Modal encontrado, abriendo...');
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            loadExistingCoverPhotos();
            console.log('✅ Modal de portada abierto exitosamente');
        } else {
            console.error('❌ Modal de portada NO encontrado');
        }
    };
    
    window.editProfilePhoto = function() {
        console.log('🎯 editProfilePhoto llamado GLOBALMENTE');
        const modal = document.getElementById('profilePhotoModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            loadCurrentProfilePhoto();
        }
    };
    
    window.closeCoverPhotoModal = function() {
        const modal = document.getElementById('coverPhotoModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
    
    window.closeProfilePhotoModal = function() {
        const modal = document.getElementById('profilePhotoModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
    
    window.closeEditProfileModal = function() {
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
    
    // Funciones del carrusel
    window.prevCoverPhoto = function() {
        if (coverPhotos.length <= 1) return;
        currentCoverIndex = (currentCoverIndex - 1 + coverPhotos.length) % coverPhotos.length;
        updateCarousel();
    };
    
    window.nextCoverPhoto = function() {
        if (coverPhotos.length <= 1) return;
        currentCoverIndex = (currentCoverIndex + 1) % coverPhotos.length;
        updateCarousel();
    };
    
    window.goToCoverPhoto = function(index) {
        currentCoverIndex = index;
        updateCarousel();
    };
    
    // Otras funciones
    window.showCoverInfo = function() {
        showToast('ℹ️ Puedes agregar hasta 4 fotos de portada', 'info');
    };
    
    window.editProfile = function() {
        showToast('🔧 Editando perfil...', 'info');
    };
    
    window.shareProfile = function() {
        showToast('🔧 Compartiendo perfil...', 'info');
    };
    
    window.showProfileSection = function(section) {
        document.querySelectorAll('.profile-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.querySelectorAll('.profile-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.getElementById(section + 'Section').classList.add('active');
        document.querySelector(`.profile-nav-item[onclick="showProfileSection('${section}')"]`).classList.add('active');
        
        // Cargar contenido específico de la sección
        switch(section) {
            case 'about':
                loadAboutSection(userProfileData.usuario);
                break;
            case 'friends':
                loadFriendsSection(userProfileData.usuario);
                break;
            case 'photos':
                loadPhotosSection(userProfileData.publicaciones);
                break;
            case 'collections':
                loadCollectionsSection();
                break;
        }
    };
    
    window.createNewCollection = function() {
        showToast('🔧 Creando nueva colección...', 'info');
    };

      window.executeFriendBlock = function(userId, userName) {
        console.log('🚨 BLOQUEAR AMIGO ejecutado:', userId, userName);
        
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
                
                // Recargar la sección de amigos
                setTimeout(() => {
                    if (userProfileData && userProfileData.usuario) {
                        loadFriendsSection(userProfileData.usuario);
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
    };

    window.executeFriendUnblock = function(userId) {
        console.log('🔄 DESBLOQUEAR AMIGO ejecutado:', userId);
        
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
                
                // Recargar la sección de amigos
                setTimeout(() => {
                    if (userProfileData && userProfileData.usuario) {
                        loadFriendsSection(userProfileData.usuario);
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
    };

    window.executeFriendRemoveFollower = function(userId) {
        console.log('🗑️ ELIMINAR SEGUIDOR AMIGO ejecutado:', userId);
        
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
                
                // Actualizar contadores
                updateSidebarCounters();
                updateProfileCounters();
                
                // Recargar la sección de amigos
                setTimeout(() => {
                    if (userProfileData && userProfileData.usuario) {
                        loadFriendsSection(userProfileData.usuario);
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
    };

    // ===== FUNCIONES PARA BLOQUEAR/ELIMINAR AMIGOS =====
window.showFriendBlockConfirmModal = function(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'friendBlockConfirmModal';
    modal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon block">
                <i class="fas fa-ban"></i>
            </div>
            <h3 class="confirm-modal-title">¿Bloquear amigo?</h3>
            
            <div class="confirm-modal-user">
                <div class="confirm-modal-user-name">${userName}</div>
                ${userUsername ? `<div class="confirm-modal-user-username">@${userUsername}</div>` : ''}
            </div>
            
            <p class="confirm-modal-message">
                Al bloquear a ${userName}:
                <br><br>
                • No podrá ver tu perfil ni publicaciones<br>
                • No podrá seguirte ni enviarte mensajes<br>
                • Se eliminará de tus amigos y seguidores<br>
                • No podrá interactuar contigo de ninguna forma
            </p>
            
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn confirm-modal-btn-cancel" id="cancelFriendBlockBtn">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="confirm-modal-btn confirm-modal-btn-confirm" id="confirmFriendBlockBtn">
                    <i class="fas fa-ban"></i> Sí, Bloquear
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
        
        document.getElementById('cancelFriendBlockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeFriendConfirmModal('friendBlock');
        });
        
        document.getElementById('confirmFriendBlockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            confirmFriendBlock(userId, userName);
        });
        
    }, 10);
};

window.showFriendUnblockConfirmModal = function(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'friendUnblockConfirmModal';
    modal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon unblock">
                <i class="fas fa-lock-open"></i>
            </div>
            <h3 class="confirm-modal-title">¿Desbloquear amigo?</h3>
            
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
                • Volverá a aparecer en tu lista de amigos
            </p>
            
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn confirm-modal-btn-cancel" id="cancelFriendUnblockBtn">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="confirm-modal-btn confirm-modal-btn-confirm unblock" id="confirmFriendUnblockBtn">
                    <i class="fas fa-lock-open"></i> Sí, Desbloquear
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
        
        document.getElementById('cancelFriendUnblockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeFriendConfirmModal('friendUnblock');
        });
        
        document.getElementById('confirmFriendUnblockBtn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            confirmFriendUnblock(userId, userName);
        });
        
    }, 10);
};

window.showFriendRemoveFollowerConfirmModal = function(userId, userName, userUsername = '') {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'friendRemoveFollowerConfirmModal';
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
    
    modal.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const action = target.dataset.action;
        
        if (action === 'cancel') {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        } 
        else if (action === 'confirm') {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                executeFriendRemoveFollower(userId);
            }, 300);
        }
    });
    
    setTimeout(() => modal.classList.add('show'), 10);
};

    window.closeFriendConfirmModal = function(type) {
        const modal = document.getElementById(`${type}ConfirmModal`);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    window.confirmFriendBlock = function(userId, userName) {
        console.log('✅ Confirmado bloqueo de amigo:', userId, userName);
        closeFriendConfirmModal('friendBlock');
        executeFriendBlock(userId, userName);
    };

    window.confirmFriendUnblock = function(userId, userName) {
        console.log('✅ Confirmado desbloqueo de amigo:', userId, userName);
        closeFriendConfirmModal('friendUnblock');
        executeFriendUnblock(userId, userName);
    };

    window.confirmFriendRemoveFollower = function(userId, userName) {
        console.log('✅ Confirmada eliminación de seguidor amigo:', userId, userName);
        closeFriendConfirmModal('friendRemoveFollower');
        executeFriendRemoveFollower(userId);
    };
    
    console.log('✅ Funciones globales creadas');
}

// ===== FUNCIONES PARA MENÚS DE AMIGOS - AGREGAR ESTO =====
function makeOptionsFunctionsGlobal() {
    console.log('🌍 Haciendo funciones de opciones globales...');
    
    window.toggleFriendOptionsMenu = function(userId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        console.log('🎯 Abriendo menú de amigo para usuario:', userId);
        
        const menu = document.getElementById(`friendOptionsMenu-${userId}`);
        if (!menu) {
            console.error('❌ Menú de amigo no encontrado:', `friendOptionsMenu-${userId}`);
            return;
        }
        
        // Cerrar otros menús primero
        closeAllFriendOptionsMenus();
        
        // Mostrar este menú
        menu.style.display = 'block';
        menu.classList.add('show');
        
        // POSICIONAMIENTO CORREGIDO
        const button = event.target.closest('.btn-options');
        if (button) {
            const rect = button.getBoundingClientRect();
            
            // Posicionar el menú justo debajo del botón
            menu.style.position = 'fixed';
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.left - 150}px`;
            menu.style.zIndex = '10000';
        }
    };
    
    window.closeAllFriendOptionsMenus = function() {
        console.log('🔒 Cerrando todos los menús de amigos...');
        document.querySelectorAll('.options-menu').forEach(menu => {
            menu.style.display = 'none';
            menu.classList.remove('show');
        });
    };
    
    console.log('✅ Funciones de opciones globales creadas');
}

function initializeFriendMenuEvents() {
    console.log('🎯 Inicializando eventos de menús de amigos...');
    
    // Event delegation simple para cerrar menús al hacer click fuera
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.options-menu') && !event.target.closest('.btn-options')) {
            closeAllFriendOptionsMenus();
        }
    });
    
    // Event delegation para las opciones del menú
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // BLOQUEAR
        if (target.closest('.block-option')) {
            event.preventDefault();
            event.stopPropagation();
            
            const button = target.closest('.block-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de bloqueo para:', userId, userName);
                closeAllFriendOptionsMenus();
                showFriendBlockConfirmModal(userId, userName, userUsername);
            }
        }
        
        // ELIMINAR SEGUIDOR
        if (target.closest('.remove-follower-option')) {
            event.preventDefault();
            event.stopPropagation();
            
            const button = target.closest('.remove-follower-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de eliminar seguidor para:', userId, userName);
                closeAllFriendOptionsMenus();
                showFriendRemoveFollowerConfirmModal(userId, userName, userUsername);
            }
        }
        
        // DESBLOQUEAR
        if (target.closest('.unblock-option')) {
            event.preventDefault();
            event.stopPropagation();
            
            const button = target.closest('.unblock-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de desbloqueo para:', userId, userName);
                closeAllFriendOptionsMenus();
                showFriendUnblockConfirmModal(userId, userName, userUsername);
            }
        }
    });
    
    console.log('✅ Eventos de menús de amigos inicializados');
}

// ===== EVENTOS DE MODALES =====
function initializeModalEvents() {
    console.log('🎯 Inicializando eventos de modales...');
    
    // LIMPIAR event listeners anteriores
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.replaceWith(modal.cloneNode(true));
    });

    // Eventos para cerrar modales - USANDO DELEGACIÓN
    document.addEventListener('click', function(e) {
        // Cerrar con botón X
        if (e.target.classList.contains('close-modal')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                console.log('✅ Modal cerrado con botón X');
            }
            return;
        }
        
        // Cerrar haciendo click fuera del contenido
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.classList.remove('modal-open');
            console.log('✅ Modal cerrado con click fuera');
            return;
        }
        
        // Botones Cancelar en uploads
        if (e.target.textContent === 'Cancelar' || e.target.textContent.includes('Cancelar')) {
            if (e.target.closest('#profileUploadPreview')) {
                cancelProfileUpload();
            } else if (e.target.closest('#coverUploadPreview')) {
                cancelCoverUpload();
            }
            return;
        }
        
        // Botones de subida
        if (e.target.closest('#profileUploadArea') && e.target.type === 'button') {
            document.getElementById('profilePhotoInput').click();
            return;
        }
        
        if (e.target.closest('#coverUploadArea') && e.target.type === 'button') {
            document.getElementById('coverPhotoInput').click();
            return;
        }
        
        // Botones "Usar esta Foto"
        if (e.target.closest('#profileUploadPreview') && e.target.textContent.includes('Usar esta Foto')) {
            uploadProfilePhoto();
            return;
        }
        
        if (e.target.closest('#coverUploadPreview') && e.target.textContent.includes('Subir Foto')) {
            uploadCoverPhoto();
            return;
        }
    });

    // Eventos para inputs de archivos
    document.getElementById('coverPhotoInput')?.addEventListener('change', handleCoverPhotoSelect);
    document.getElementById('profilePhotoInput')?.addEventListener('change', handleProfilePhotoSelect);
    
    console.log('✅ Eventos de modales inicializados');
}

// ===== FUNCIONES BÁSICAS =====
function initializeSidebar() {
    if (!currentUser) return;
    
    document.getElementById('userGreeting').textContent = `Hola, ${currentUser.nombre}`;
    document.getElementById('sidebarUserName').textContent = currentUser.nombre;
    document.getElementById('sidebarUserUsername').textContent = `@${currentUser.username}`;
    document.getElementById('sidebarSeguidoresCount').textContent = currentUser.seguidores?.length || 0;
    document.getElementById('sidebarSeguidosCount').textContent = currentUser.seguidos?.length || 0;
    
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (currentUser.foto_perfil) {
        sidebarAvatar.innerHTML = `<img src="${currentUser.foto_perfil}" alt="${currentUser.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
}

function initializeEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('backToDashboard').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
}

function setFriendsTab(tabName) {
    // Esperar a que se cargue la sección de amigos
    setTimeout(() => {
        const tabButton = document.querySelector(`.friends-nav-btn[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }, 100);
}

// ===== CARRUSEL =====
function initializeCoverCarousel(photos) {
    coverPhotos = photos || [];
    currentCoverIndex = 0;
    
    const carousel = document.getElementById('coverPhotoCarousel');
    const indicators = document.getElementById('carouselIndicators');
    
    if (!carousel || !indicators) return;
    
    if (coverPhotos.length === 0) {
        carousel.innerHTML = `
            <div class="cover-slide active" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="cover-placeholder">
                    <i class="fas fa-mountain"></i>
                    <p>Agrega fotos para tu portada</p>
                </div>
            </div>
        `;
        indicators.innerHTML = '';
        return;
    }
    
    carousel.innerHTML = coverPhotos.map((photo, index) => `
        <div class="cover-slide ${index === 0 ? 'active' : ''}" 
             style="background-image: url('${photo}')">
        </div>
    `).join('');
    
    indicators.innerHTML = coverPhotos.map((_, index) => `
        <button class="carousel-indicator ${index === 0 ? 'active' : ''}" 
                onclick="goToCoverPhoto(${index})"></button>
    `).join('');
    
    updateCarouselControls();
}

function updateCarousel() {
    const slides = document.querySelectorAll('.cover-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentCoverIndex);
    });
    
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentCoverIndex);
    });
    
    updateCarouselControls();
}

function updateCarouselControls() {
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');
    
    if (prevBtn && nextBtn) {
        if (coverPhotos.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }
    }
}

// ===== UPLOAD DE ARCHIVOS =====
function handleProfilePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePreviewImage').src = e.target.result;
            document.getElementById('profileUploadPreview').style.display = 'block';
            document.getElementById('profileUploadArea').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function handleCoverPhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('coverPreviewImage').src = e.target.result;
            document.getElementById('coverUploadPreview').style.display = 'block';
            document.getElementById('coverUploadArea').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function cancelProfileUpload() {
    document.getElementById('profileUploadPreview').style.display = 'none';
    document.getElementById('profileUploadArea').style.display = 'block';
    document.getElementById('profilePhotoInput').value = '';
}

function cancelCoverUpload() {
    document.getElementById('coverUploadPreview').style.display = 'none';
    document.getElementById('coverUploadArea').style.display = 'block';
    document.getElementById('coverPhotoInput').value = '';
}

// ===== SUBIDA AL SERVIDOR =====
async function uploadProfilePhoto() {
    const fileInput = document.getElementById('profilePhotoInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('❌ Por favor selecciona una imagen', 'error');
        return;
    }
    
    try {
        showToast('⏳ Subiendo foto de perfil...', 'info');
        
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        const response = await fetch(`${API_URL}/upload/profile-picture/${currentUser._id}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de perfil actualizada', 'success');
            
            // Actualizar en el frontend
            if (userProfileData) {
                userProfileData.usuario.foto_perfil = result.imageUrl;
            }
            
            // Actualizar imágenes
            const profileAvatarImg = document.getElementById('profileAvatarImg');
            const currentProfilePhoto = document.getElementById('currentProfilePhoto');
            const sidebarAvatar = document.getElementById('sidebarAvatar');
            
            if (profileAvatarImg) profileAvatarImg.src = result.imageUrl;
            if (currentProfilePhoto) currentProfilePhoto.src = result.imageUrl;
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = `<img src="${result.imageUrl}" alt="${currentUser.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
            
            // Actualizar currentUser
            currentUser.foto_perfil = result.imageUrl;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeProfilePhotoModal();
            cancelProfileUpload();
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error subiendo foto de perfil:', error);
        showToast('❌ Error al subir la foto', 'error');
    }
}

async function uploadCoverPhoto() {
    const fileInput = document.getElementById('coverPhotoInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('❌ Por favor selecciona una imagen', 'error');
        return;
    }
    
    try {
        showToast('⏳ Subiendo foto de portada...', 'info');
        
        const formData = new FormData();
        formData.append('coverPicture', file);
        
        const response = await fetch(`${API_URL}/upload/cover-picture/${currentUser._id}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de portada agregada', 'success');
            
            // Actualizar el carrusel
            coverPhotos = result.coverPhotos || [];
            initializeCoverCarousel(coverPhotos);
            
            // Recargar fotos existentes
            loadExistingCoverPhotos();
            
            cancelCoverUpload();
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error subiendo foto de portada:', error);
        showToast('❌ Error al subir la foto', 'error');
    }
}

// ===== CARGA DE DATOS =====
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/profile/${currentUser._id}`);
        const result = await response.json();

        if (result.success) {
            userProfileData = result.data;
            displayUserProfile(userProfileData);
        } else {
            showToast('❌ Error al cargar el perfil', 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

function displayUserProfile(profileData) {
    if (!profileData) return;
    
    const { usuario, publicaciones } = profileData;
    
    updateProfileHeader(usuario);
    initializeCoverCarousel(usuario.fotos_portada || []);
    updateProfileStats(usuario, publicaciones);
    displayProfilePosts(publicaciones);
    loadAboutSection(usuario);
    loadFriendsSection(usuario);
    loadPhotosSection(publicaciones);
    loadCollectionsSection();
}

function updateProfileHeader(usuario) {
    if (!usuario) return;
    
    const profileAvatar = document.getElementById('profileAvatarImg');
    if (profileAvatar && usuario.foto_perfil) {
        profileAvatar.src = usuario.foto_perfil;
        profileAvatar.style.display = 'block';
    }
    
    const profileName = document.getElementById('profileUserName');
    const profileUsername = document.getElementById('profileUserUsername');
    const profileBio = document.getElementById('profileUserBio');
    
    if (profileName) profileName.textContent = usuario.nombre || 'Nombre no disponible';
    if (profileUsername) profileUsername.textContent = `@${usuario.username || 'usuario'}`;
    if (profileBio) profileBio.textContent = usuario.biografia || '¡Hola! Estoy usando Kion-D';
}

function loadCurrentProfilePhoto() {
    const currentPhoto = document.getElementById('currentProfilePhoto');
    if (currentPhoto && userProfileData && userProfileData.usuario) {
        currentPhoto.src = userProfileData.usuario.foto_perfil || '';
    }
}

// ===== GESTIÓN DE FOTOS DE PORTADA =====
async function loadExistingCoverPhotos() {
    try {
        console.log('🔄 Cargando fotos de portada existentes...');
        const response = await fetch(`${API_URL}/profile/${currentUser._id}`);
        const result = await response.json();
        
        if (result.success) {
            const covers = result.data.usuario.fotos_portada || [];
            const coversGrid = document.getElementById('coversGrid');
            
            if (!coversGrid) return;
            
            if (covers.length === 0) {
                coversGrid.innerHTML = `
                    <div class="empty-covers">
                        <i class="fas fa-images"></i>
                        <p>No hay fotos de portada</p>
                    </div>
                `;
            } else {
                coversGrid.innerHTML = covers.map((cover, index) => `
                    <div class="cover-item">
                        <img src="${cover}" alt="Portada ${index + 1}">
                        <div class="cover-actions">
                            <button class="btn-icon btn-set-main ${cover === result.data.usuario.foto_portada ? 'active' : ''}" 
                                    onclick="setMainCoverPhoto(${index})" title="Establecer como principal">
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn-icon btn-delete-cover" 
                                    onclick="deleteCoverPhoto(${index})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ${cover === result.data.usuario.foto_portada ? 
                          '<div class="cover-badge">Principal</div>' : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('❌ Error cargando fotos de portada:', error);
    }
}

async function setMainCoverPhoto(index) {
    try {
        const response = await fetch(`${API_URL}/upload/cover-picture/main/${currentUser._id}/${index}`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de portada principal actualizada', 'success');
            loadExistingCoverPhotos();
            
            // Actualizar el carrusel si es necesario
            if (coverPhotos[index]) {
                currentCoverIndex = index;
                updateCarousel();
            }
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error estableciendo foto principal:', error);
        showToast('❌ Error al actualizar la foto principal', 'error');
    }
}

async function deleteCoverPhoto(index) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta foto de portada?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/upload/cover-picture/${currentUser._id}/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de portada eliminada', 'success');
            
            // Actualizar el carrusel
            coverPhotos = result.coverPhotos || [];
            initializeCoverCarousel(coverPhotos);
            
            // Recargar las fotos existentes
            loadExistingCoverPhotos();
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error eliminando foto de portada:', error);
        showToast('❌ Error al eliminar la foto', 'error');
    }
}

// ===== SECCIONES DEL PERFIL =====
function updateProfileStats(usuario, publicaciones) {
    const postsCount = document.getElementById('postsCount');
    const seguidoresCount = document.getElementById('seguidoresProfileCount');
    const seguidosCount = document.getElementById('seguidosProfileCount');
    
    if (postsCount) postsCount.textContent = publicaciones?.length || 0;
    if (seguidoresCount) seguidoresCount.textContent = usuario.seguidores?.length || 0;
    if (seguidosCount) seguidosCount.textContent = usuario.seguidos?.length || 0;
}

// Sección Acerca de
function loadAboutSection(usuario) {
    const aboutContent = document.getElementById('aboutContent');
    const interestsContainer = document.getElementById('interestsContainer');
    
    aboutContent.innerHTML = `
        <div class="about-item">
            <strong><i class="fas fa-map-marker-alt"></i> Ubicación</strong>
            <span>${usuario.ubicacion || 'No especificada'}</span>
        </div>
        <div class="about-item">
            <strong><i class="fas fa-birthday-cake"></i> Fecha de nacimiento</strong>
            <span>${usuario.fecha_nacimiento ? new Date(usuario.fecha_nacimiento).toLocaleDateString() : 'No especificada'}</span>
        </div>
        <div class="about-item">
            <strong><i class="fas fa-user"></i> Género</strong>
            <span>${getGenderDisplay(usuario.genero)}</span>
        </div>
        <div class="about-item">
            <strong><i class="fas fa-calendar"></i> Se unió</strong>
            <span>${new Date(usuario.fecha_registro).toLocaleDateString()}</span>
        </div>
    `;
    
    // Intereses
    if (usuario.intereses && usuario.intereses.length > 0) {
        interestsContainer.innerHTML = usuario.intereses.map(interes => `
            <span class="interest-tag">${interes}</span>
        `).join('');
    } else {
        interestsContainer.innerHTML = `
            <p class="no-data">Aún no has agregado intereses</p>
            <button class="btn-secondary" onclick="editInterests()">
                <i class="fas fa-plus"></i> Agregar intereses
            </button>
        `;
    }
}

// Sección de Amigos
async function loadFriendsSection(usuario) {
    const friendsGrid = document.getElementById('friendsGrid');
    
    try {
        friendsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando...</p>
            </div>
        `;

        // Cargar seguidores y seguidos
        const [followersResponse, followingResponse] = await Promise.all([
            fetch(`${API_URL}/users/${usuario._id}/followers`),
            fetch(`${API_URL}/users/${usuario._id}/following`)
        ]);

        const followersResult = await followersResponse.json();
        const followingResult = await followingResponse.json();

        if (!followersResult.success || !followingResult.success) {
            throw new Error('Error al cargar datos');
        }

        const followers = followersResult.data || [];
        const following = followingResult.data || [];

        friendsGrid.innerHTML = `
            <div class="friends-section">
                <!-- Navegación entre seguidores y seguidos -->
                <div class="friends-nav">
                    <button class="friends-nav-btn active" data-tab="seguidores">
                        <i class="fas fa-users"></i>
                        <span>Seguidores</span>
                        <span class="count-badge">${followers.length}</span>
                    </button>
                    <button class="friends-nav-btn" data-tab="siguiendo">
                        <i class="fas fa-user-plus"></i>
                        <span>Siguiendo</span>
                        <span class="count-badge">${following.length}</span>
                    </button>
                </div>

                <!-- Contenido de seguidores -->
                <div class="friends-tab-content active" id="seguidoresTab">
                    ${followers.length > 0 ? `
                        <div class="friends-grid-cards">
                            ${followers.map(user => createFriendCardHTML(user, 'seguidor')).join('')}
                        </div>
                    ` : `
                        <div class="empty-friends">
                            <i class="fas fa-user-plus"></i>
                            <h4>No tienes seguidores aún</h4>
                            <p>Comparte tu perfil para que más personas te conozcan.</p>
                        </div>
                    `}
                </div>

                <!-- Contenido de seguidos -->
                <div class="friends-tab-content" id="siguiendoTab">
                    ${following.length > 0 ? `
                        <div class="friends-grid-cards">
                            ${following.map(user => createFriendCardHTML(user, 'siguiendo')).join('')}
                        </div>
                    ` : `
                        <div class="empty-friends">
                            <i class="fas fa-search"></i>
                            <h4>No sigues a nadie aún</h4>
                            <p>Descubre usuarios interesantes para seguir.</p>
                            <button class="btn-primary" onclick="window.location.href='dashboard.html?section=users'">
                                <i class="fas fa-users"></i> Explorar Usuarios
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Inicializar eventos de la navegación
        initializeFriendsNav();

    } catch (error) {
        console.error('Error cargando amigos:', error);
        friendsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar</h3>
                <p>No se pudieron cargar los datos de seguidores.</p>
            </div>
        `;
    }
}

// En profile.js - ACTUALIZA la función createFriendCardHTML (opcional, para mejor visualización)

function createFriendCardHTML(user, tipo) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isCurrentUser = currentUser._id === user._id;
    const isFollowing = currentUser.seguidos?.includes(user._id);
    const isFollower = currentUser.seguidores?.includes(user._id);
    const isBlocked = currentUser.usuarios_bloqueados?.includes(user._id);
    
    return `
        <div class="friend-card" data-user-id="${user._id}" data-user-name="${user.nombre}">
            <!-- Menú de opciones -->
            <div class="friend-card-options">
                ${!isCurrentUser ? `
                    <button class="btn-options" onclick="toggleFriendOptionsMenu('${user._id}', event)">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="options-menu" id="friendOptionsMenu-${user._id}">
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

            ${isBlocked ? `<div class="blocked-indicator">BLOQUEADO</div>` : ''}

            <div class="friend-avatar">
                ${user.foto_perfil ? 
                    `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            
            <div class="friend-info">
                <h4>${user.nombre}</h4>
                <p class="friend-username">@${user.username}</p>
                <div class="friend-stats">
                    <span class="friend-stat">
                        <strong>${user.seguidores?.length || 0}</strong> seguidores
                    </span>
                </div>
                ${user.biografia ? `<p class="friend-bio">${user.biografia}</p>` : ''}
            </div>
            
            <div class="friend-actions">
                ${!isCurrentUser ? `
                    <button class="btn-view-friend" onclick="viewUserProfile('${user._id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-follow-friend ${isFollowing ? 'following' : ''}" 
                            onclick="toggleFollowFriend('${user._id}', this)">
                        <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                        ${isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                ` : `
                    <span class="current-user-badge">Tú</span>
                `}
            </div>
            
            ${tipo === 'seguidor' ? `
                <div class="friend-badge follower-badge">
                    Te sigue
                </div>
            ` : `
                <div class="friend-badge following-badge">
                    Siguiendo
                </div>
            `}
        </div>
    `;
}

function initializeFriendsNav() {
    const navButtons = document.querySelectorAll('.friends-nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase active de todos los botones
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar clase active al botón clickeado
            this.classList.add('active');
            
            // Ocultar todos los contenidos
            document.querySelectorAll('.friends-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar el contenido correspondiente
            const tabId = this.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function toggleFollowFriend(userId, button) {
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
            
            // Actualizar currentUser en localStorage
            if (isFollowing) {
                currentUser.seguidos = currentUser.seguidos.filter(id => id !== userId);
            } else {
                if (!currentUser.seguidos) currentUser.seguidos = [];
                currentUser.seguidos.push(userId);
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Actualizar el botón
            button.innerHTML = isFollowing ? 
                '<i class="fas fa-user-plus"></i> Seguir' : 
                '<i class="fas fa-user-check"></i> Siguiendo';
            button.className = isFollowing ? 
                'btn-follow-friend' : 
                'btn-follow-friend following';
            
            // Actualizar contadores en sidebar y perfil
            updateSidebarCounters();
            updateProfileCounters();
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error en follow/unfollow:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

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
                        </div>
                        
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

function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

async function toggleFollowModal(userId) {
    await toggleFollowFriend(userId, document.querySelector('#userProfileModal .btn-follow-large'));
    closeUserProfileModal();
}


function updateSidebarCounters() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    document.getElementById('sidebarSeguidoresCount').textContent = currentUser.seguidores?.length || 0;
    document.getElementById('sidebarSeguidosCount').textContent = currentUser.seguidos?.length || 0;
}

function updateProfileCounters() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    document.getElementById('seguidoresProfileCount').textContent = currentUser.seguidores?.length || 0;
    document.getElementById('seguidosProfileCount').textContent = currentUser.seguidos?.length || 0;
}

// Sección de Fotos
function loadPhotosSection(publicaciones) {
    const photosGrid = document.getElementById('photosGrid');
    
    // Extraer imágenes de las publicaciones
    const images = publicaciones
        .filter(post => post.imagen)
        .map(post => post.imagen);
    
    if (images.length === 0) {
        photosGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No hay fotos aún</h3>
                <p>Las imágenes que subas en tus publicaciones aparecerán aquí.</p>
            </div>
        `;
        return;
    }
    
    photosGrid.innerHTML = images.map((image, index) => `
        <div class="photo-item" onclick="viewPhoto('${image}')">
            <img src="${image}" alt="Foto ${index + 1}">
        </div>
    `).join('');
}

// Sección de Colecciones
function loadCollectionsSection() {
    const collectionsGrid = document.getElementById('collectionsGrid');
    const allCollections = document.getElementById('allCollections');
    
    collectionsGrid.innerHTML = `
        <div class="collection-card">
            <div class="collection-icon">
                <i class="fas fa-heart"></i>
            </div>
            <h4>Favoritos</h4>
            <p>12 elementos</p>
        </div>
        <div class="collection-card">
            <div class="collection-icon">
                <i class="fas fa-bookmark"></i>
            </div>
            <h4>Guardados</h4>
            <p>8 elementos</p>
        </div>
        <div class="collection-card">
            <div class="collection-icon">
                <i class="fas fa-star"></i>
            </div>
            <h4>Destacados</h4>
            <p>5 elementos</p>
        </div>
    `;
    
    allCollections.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h3>Gestiona tus colecciones</h3>
            <p>Crea colecciones para organizar tus publicaciones favoritas.</p>
            <button class="btn-primary" onclick="createNewCollection()">
                <i class="fas fa-plus"></i> Crear primera colección
            </button>
        </div>
    `;
}

// ===== PUBLICACIONES =====
function displayProfilePosts(posts) {
    const postsFeed = document.getElementById('profilePostsFeed');
    if (!postsFeed) return;
    
    // ACTUALIZAR currentPosts con las publicaciones del perfil
    currentPosts = posts || []; // ← AÑADE ESTA LÍNEA
    
    if (!posts || posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-feather"></i>
                <h3>No hay publicaciones aún</h3>
                <p>Comparte tus primeras ideas con la comunidad.</p>
                <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                    <i class="fas fa-plus"></i> Crear primera publicación
                </button>
            </div>
        `;
        return;
    }
    
    postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');
    initializePostInteractions('profilePostsFeed', posts);
}

// Función para recargar publicaciones del perfil
async function loadProfilePosts() {
    try {
        const response = await fetch(`${API_URL}/profile/${currentUser._id}`);
        const result = await response.json();

        if (result.success) {
            userProfileData = result.data;
            displayProfilePosts(userProfileData.publicaciones || []);
        } else {
            showToast('❌ Error al cargar las publicaciones', 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando publicaciones:', error);
        showToast('❌ Error de conexión', 'error');
    }
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
        
        const optionsBtn = document.getElementById(`optionsBtn-${post._id}`);
        if (optionsBtn) {
            optionsBtn.addEventListener('click', (e) => togglePostOptions(post._id, e));
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-options')) {
            closeAllPostOptions();
        }
    });
}

// ===== UTILIDADES =====
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

// ===== FUNCIONES PENDIENTES (placeholders) =====
function editInterests() { 
    showToast('🔧 Editando intereses...', 'info'); 
}

function viewPhoto(imageUrl) { 
    showToast('🔧 Viendo foto...', 'info'); 
}

function togglePostOptions(postId, event) {
    event.stopPropagation();
    closeAllPostOptions();
    
    const optionsMenu = document.getElementById(`optionsMenu-${postId}`);
    if (optionsMenu) {
        optionsMenu.style.display = 'block';
    }
}

function closeAllPostOptions() {
    document.querySelectorAll('.post-options-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

function confirmDeletePost(postId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
        deletePost(postId);
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
            
            // Recargar las publicaciones del perfil después de un momento
            setTimeout(() => {
                loadProfilePosts(); // ← CAMBIA loadProfilePosts() por loadProfilePosts()
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

// Funciones placeholder para interacciones de posts
function handleLike(postId) {
    showToast('🔧 Like a publicación...', 'info');
}

function viewPost(postId) {
    showToast('🔧 Viendo publicación...', 'info');
}

function handleShare(postId) {
    showToast('🔧 Compartiendo publicación...', 'info');
}

function editPost(postId) {
    showToast('🔧 Editando publicación...', 'info');
}

// Solución para el botón siempre visible
setTimeout(function() {
    const alwaysVisibleBtn = document.getElementById('alwaysVisibleCoverBtn');
    if (alwaysVisibleBtn) {
        alwaysVisibleBtn.addEventListener('click', function() {
            console.log('🎯 CLICK EN BOTÓN SIEMPRE VISIBLE');
            const modal = document.getElementById('coverPhotoModal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');
                loadExistingCoverPhotos();
            }
        });
    }
}, 1000);

// ===== DIAGNÓSTICO Y SOLUCIÓN TEMPORAL =====

setTimeout(function() {
    console.log('🔍 DIAGNÓSTICO DE BOTONES...');
    
    // Verificar posición y visibilidad de los botones
    const coverBtn = document.querySelector('.btn-edit-cover');
    const overlay = document.querySelector('.cover-overlay');
    
    if (coverBtn) {
        const rect = coverBtn.getBoundingClientRect();
        console.log('📍 Posición botón portada:', rect);
        console.log('👀 Botón visible:', rect.width > 0 && rect.height > 0);
        console.log('🎨 Estilos botón:', {
            display: getComputedStyle(coverBtn).display,
            visibility: getComputedStyle(coverBtn).visibility,
            opacity: getComputedStyle(coverBtn).opacity,
            pointerEvents: getComputedStyle(coverBtn).pointerEvents,
            zIndex: getComputedStyle(coverBtn).zIndex
        });
    }
    
    if (overlay) {
        console.log('🎨 Estilos overlay:', {
            display: getComputedStyle(overlay).display,
            opacity: getComputedStyle(overlay).opacity,
            pointerEvents: getComputedStyle(overlay).pointerEvents,
            zIndex: getComputedStyle(overlay).zIndex
        });
    }
    
    // Solución temporal: hacer overlay siempre visible
    if (overlay) {
        overlay.classList.add('always-visible');
        console.log('✅ Overlay hecho siempre visible temporalmente');
    }
    
    // Agregar botón de emergencia si es necesario
    if (!document.getElementById('emergencyCoverBtn')) {
        const emergencyBtn = document.createElement('button');
        emergencyBtn.id = 'emergencyCoverBtn';
        emergencyBtn.className = 'btn-always-visible';
        emergencyBtn.innerHTML = '<i class="fas fa-camera"></i> Portada (EMERGENCIA)';
        emergencyBtn.onclick = function() {
            console.log('🚨 BOTÓN DE EMERGENCIA - Abriendo modal portada');
            const modal = document.getElementById('coverPhotoModal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');
                loadExistingCoverPhotos();
            }
        };
        document.body.appendChild(emergencyBtn);
        console.log('🚨 Botón de emergencia agregado');
    }
    
}, 2000);

// ========== FUNCIONALIDAD DE EDICIÓN EN PERFIL ==========

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
            
            // Recargar las publicaciones del perfil después de un momento
            setTimeout(() => {
                loadProfilePosts();
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

// Función para abrir el modal de edición (similar a dashboard.js)
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
            const file = editImageInput.files[0];
            const uploadResult = await uploadImageToServer(file);
            postData.imagen = uploadResult.url;
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

// Función para subir imagen al servidor
async function uploadImageToServer(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_URL}/upload/image`, {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error);
    }
    
    return result.data;
}

// Función para abrir modal
function openModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

// Cerrar menús de opciones al hacer click fuera de ellos (agregar al DOMContentLoaded)
document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-options')) {
        closeAllPostOptions();
    }
});

// Función para formatear contenido del post
function formatPostContent(content) {
    return content.replace(/#[\wáéíóúñ]+/g, '<span class="hashtag">$&</span>');
}

// Función para mostrar toast
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

// Función para obtener tiempo relativo
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

