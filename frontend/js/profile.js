const API_URL = 'http://localhost:3001/api';

// Variables globales
let currentUser = null;
let userProfileData = null;
let currentCoverIndex = 0;
let coverPhotos = [];
let currentPosts = []; 
let currentPostId = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 profile.js cargado correctamente');
    initializeProfile();
});

// ===== INICIALIZACIÓN MODIFICADA =====
async function initializeProfile() {
    console.log('🚀 Inicializando Perfil...');
    
    // CORREGIR: Establecer currentUser correctamente
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        window.currentUser = currentUser;
    }
    
    if (!currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    console.log('✅ Usuario actual:', currentUser.nombre);
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    
    if (viewingUserId && viewingUserId !== currentUser._id) {
        // Verificar si el usuario está bloqueado
        const isBlocked = await checkIfUserIsBlocked(viewingUserId);
        if (isBlocked) {
            showBlockedUserModal(viewingUserId);
            return;
        }
        
        // Estamos viendo el perfil de otro usuario
        await loadOtherUserProfile(viewingUserId);
    } else {
        // Estamos viendo nuestro propio perfil - LIMPIAR por si acaso
        localStorage.removeItem('viewingUserProfile');
        await loadUserProfile();
    }
    
    // Hacer las funciones disponibles globalmente
    makeFunctionsGlobal();
    makeOptionsFunctionsGlobal();
    
    initializeSidebar(); // ← ESTA LÍNEA ES IMPORTANTE, debe ir después de determinar qué perfil estamos viendo
    initializeEventListeners();
    initializeFriendMenuEvents();
    
    // Inicializar eventos de modales después de cargar
    setTimeout(initializeModalEvents, 500);
}



// ===== VERIFICACIÓN DE BLOQUEO =====
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

// Función para mostrar modal de usuario bloqueado
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
                            <i class="fas fa-times"></i> Volver al Inicio
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
    // Volver al dashboard
    window.location.href = 'dashboard.html';
}

function goToMyProfileFromModal() {
    localStorage.removeItem('viewingUserProfile');
    closeBlockedUserModal();
    window.location.href = 'profile.html';
}

// ===== FUNCIONES DE NAVEGACIÓN MEJORADAS =====
function goToDashboard() {
    localStorage.removeItem('viewingUserProfile');
    window.location.href = 'dashboard.html';
}

function goToMyProfile() {
    // SIEMPRE limpiar el viewingUserProfile para ir a nuestro propio perfil
    localStorage.removeItem('viewingUserProfile');
    window.location.href = 'profile.html';
}

function goToExplore() {
    localStorage.removeItem('viewingUserProfile');
    window.location.href = 'dashboard.html?section=explore';
}

function goToUsers() {
    localStorage.removeItem('viewingUserProfile');
    window.location.href = 'dashboard.html?section=users';
}

function goToMessages() {
    localStorage.removeItem('viewingUserProfile');
    window.location.href = 'dashboard.html?section=messages';
}

// ===== CARGAR PERFIL DE OTRO USUARIO =====
async function loadOtherUserProfile(userId) {
    try {
        console.log('🔄 Cargando perfil de otro usuario:', userId);
        
        // Verificar bloqueo nuevamente por seguridad
        const isBlocked = await checkIfUserIsBlocked(userId);
        if (isBlocked) {
            showBlockedUserModal(userId);
            return;
        }
        
        // Cargar datos del perfil del otro usuario
        const [profileResponse, postsResponse] = await Promise.all([
            fetch(`${API_URL}/profile/${userId}`),
            fetch(`${API_URL}/posts/user/${userId}`)
        ]);

        const profileResult = await profileResponse.json();
        const postsResult = await postsResponse.json();

        if (profileResult.success) {
            userProfileData = profileResult.data;
            
            // Si las publicaciones se cargaron correctamente, usarlas
            if (postsResult.success) {
                userProfileData.publicaciones = postsResult.data;
            }
            
            displayOtherUserProfile(userProfileData);
            
            // Actualizar el título de la página
            document.title = `${userProfileData.usuario.nombre} - Aural`;
            
        } else {
            showToast('❌ Error al cargar el perfil del usuario', 'error');
            // Redirigir al propio perfil si hay error
            setTimeout(() => {
                localStorage.removeItem('viewingUserProfile');
                window.location.href = 'profile.html';
            }, 2000);
        }
    } catch (error) {
        console.error('❌ Error cargando perfil de otro usuario:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

// ===== MOSTRAR PERFIL DE OTRO USUARIO =====
function displayOtherUserProfile(profileData) {
    if (!profileData) return;
    
    const { usuario, publicaciones } = profileData;
    
    // AGREGAR CLASE CSS al body para identificar que estamos viendo otro perfil
    document.body.classList.add('viewing-other-profile');
    
    updateOtherUserProfileHeader(usuario);
    initializeCoverCarousel(usuario.fotos_portada || []);
    updateProfileStats(usuario, publicaciones);
    displayProfilePosts(publicaciones);
    loadAboutSection(usuario);
    loadFriendsSection(usuario);
    loadPhotosSection(publicaciones);
    loadCollectionsSection();
    
    // Ocultar botones de edición para otros usuarios
    hideEditButtons();
    
    // Actualizar el título de la página
    document.title = `${usuario.nombre} - Aural`;
    
    // Actualizar el sidebar para reflejar que estamos viendo otro perfil
    initializeSidebar();

}


// ===== AGREGAR ESTILOS PARA EL INDICADOR =====
function addViewingOtherProfileStyles() {
    const styles = `

        
        .indicator-content i {
            font-size: 1.2rem;
        }
        
        .btn-close-indicator {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .btn-close-indicator:hover {
            background: rgba(255, 255, 255, 0.3);
        }

    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}


function updateOtherUserProfileHeader(usuario) {
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
    if (profileBio) profileBio.textContent = usuario.biografia || 'Este usuario aún no tiene biografía';
    
    // AGREGAR BOTÓN DE SEGUIR al lado del nombre
    addFollowButton(usuario);
}

// ===== FUNCIÓN PARA AGREGAR BOTÓN DE SEGUIR =====
function addFollowButton(otherUser) {
    const profileMainInfo = document.querySelector('.profile-main-info');
    if (!profileMainInfo) return;
    
    // Verificar si ya existe un botón de seguir y removerlo
    const existingFollowBtn = document.getElementById('followUserBtn');
    if (existingFollowBtn) {
        existingFollowBtn.remove();
    }
    
    // Verificar estado de seguimiento
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isFollowing = currentUser.seguidos?.includes(otherUser._id);
    const isBlocked = currentUser.usuarios_bloqueados?.includes(otherUser._id) || 
                     otherUser.usuarios_bloqueados?.includes(currentUser._id);
    
    // No mostrar botón de seguir si hay bloqueo
    if (isBlocked) return;
    
    const followButton = document.createElement('div');
    followButton.id = 'followUserBtn';
    followButton.className = 'follow-user-button-container';
    
    if (isFollowing) {
        followButton.innerHTML = `
            <button class="btn-follow-profile following" onclick="toggleFollowProfile('${otherUser._id}')">
                <i class="fas fa-user-check"></i>
                <span>Siguiendo</span>
            </button>
        `;
    } else {
        followButton.innerHTML = `
            <button class="btn-follow-profile" onclick="toggleFollowProfile('${otherUser._id}')">
                <i class="fas fa-user-plus"></i>
                <span>Seguir</span>
            </button>
        `;
    }
    
    // Insertar después del nombre de usuario
    const profileUsername = document.getElementById('profileUserUsername');
    if (profileUsername && profileUsername.parentNode) {
        profileUsername.parentNode.insertBefore(followButton, profileUsername.nextSibling);
    }
}

// ===== FUNCIÓN PARA SEGUIR/DEJAR DE SEGUIR DESDE EL PERFIL =====
async function toggleFollowProfile(userId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        const isFollowing = currentUser.seguidos?.includes(userId);
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        
        console.log(`🔄 ${isFollowing ? 'Dejando de seguir' : 'Siguiendo'} usuario:`, userId);
        
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
            
            // Actualizar el botón de seguir
            updateFollowButtonState(userId, !isFollowing);
            
            // Actualizar contadores en sidebar
            updateSidebarCounters();
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error en follow/unfollow desde perfil:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR EL ESTADO DEL BOTÓN DE SEGUIR =====
function updateFollowButtonState(userId, isFollowing) {
    const followBtn = document.querySelector(`#followUserBtn button`);
    if (!followBtn) return;
    
    if (isFollowing) {
        followBtn.innerHTML = '<i class="fas fa-user-check"></i><span>Siguiendo</span>';
        followBtn.className = 'btn-follow-profile following';
    } else {
        followBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Seguir</span>';
        followBtn.className = 'btn-follow-profile';
    }
}

// ===== MODIFICAR LA FUNCIÓN hideEditButtons =====
function hideEditButtons() {
    console.log('👁️ Ocultando elementos de edición para perfil de otro usuario');
    
    // Ocultar el icono de cámara del avatar de manera MÁS ESPECÍFICA
    const avatarEditIcons = document.querySelectorAll('.btn-edit-avatar, .profile-avatar-large button, [onclick*="editProfilePhoto"]');
    avatarEditIcons.forEach(icon => {
        if (icon) {
            icon.style.display = 'none';
            console.log('❌ Ocultado icono de cámara:', icon);
        }
    });
    
    // Ocultar botones de edición generales
    const editButtons = document.querySelectorAll(`
        .btn-edit-cover-fixed, 
        .btn-edit-profile, 
        .btn-config,
        .btn-edit-cover,
        .cover-overlay
    `);
    
    editButtons.forEach(button => {
        if (button) {
            button.style.display = 'none';
            console.log('❌ Ocultado:', button.className);
        }
    });
    
    // OCULTAR BOTÓN DE AGREGAR INTERESES
    const addInterestsBtn = document.querySelector('.btn-secondary[onclick*="editInterests"]');
    if (addInterestsBtn) {
        addInterestsBtn.style.display = 'none';
        console.log('❌ Ocultado botón de agregar intereses');
    }
    
    // Ocultar menús de opciones en publicaciones de otros usuarios
    const postOptions = document.querySelectorAll('.post-options');
    postOptions.forEach(option => {
        if (option) option.style.display = 'none';
    });
    
    // Ocultar sección de colecciones o mostrar mensaje
    const collectionsSection = document.getElementById('collectionsSection');
    if (collectionsSection) {
        collectionsSection.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Colecciones privadas</h3>
                <p>Las colecciones son privadas para cada usuario.</p>
            </div>
        `;
    }
    
    // Remover el botón de nueva colección si existe
    const newCollectionBtn = document.querySelector('.btn-primary[onclick*="createNewCollection"]');
    if (newCollectionBtn) {
        newCollectionBtn.style.display = 'none';
    }
    
    // FORZAR la ocultación con CSS inline como respaldo
    forceHideEditElements();
}

// ===== FUNCIÓN DE RESPALDO PARA OCULTAR ELEMENTOS =====
function forceHideEditElements() {
    // Agregar estilos CSS forzados para ocultar elementos de edición
    const forcedStyles = `
        .viewing-other-profile .btn-edit-avatar,
        .viewing-other-profile .profile-avatar-large button,
        .viewing-other-profile [onclick*="editProfilePhoto"],
        .viewing-other-profile .btn-edit-cover-fixed,
        .viewing-other-profile .cover-overlay,
        .viewing-other-profile .btn-edit-profile,
        .viewing-other-profile .btn-config {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'force-hide-edit-elements';
    styleElement.textContent = forcedStyles;
    
    // Remover estilos anteriores si existen
    const existingStyles = document.getElementById('force-hide-edit-elements');
    if (existingStyles) {
        existingStyles.remove();
    }
    
    document.head.appendChild(styleElement);
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
        // Verificar si hay cambios sin guardar
        const hasUnsavedChanges = document.getElementById('coverUploadPreview')?.style.display === 'block' || 
                                 coverPhotos.length !== (userProfileData?.usuario?.fotos_portada?.length || 0);
        
        if (hasUnsavedChanges) {
            if (confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar?')) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                // Recargar el perfil para reflejar cambios
                setTimeout(() => {
                    loadUserProfile();
                }, 500);
            }
        } else {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            // Recargar el perfil para reflejar cambios
            setTimeout(() => {
                loadUserProfile();
            }, 500);
        }
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
    console.log('🎯 Botón Editar Perfil clickeado');
    openEditProfileModal();
};

    // Función para abrir el modal de edición de perfil
    window.openEditProfileModal = function() {
        console.log('🎯 Abriendo modal de edición de perfil...');
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            loadEditProfileForm();
        }
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

    // En la función makeFunctionsGlobal(), agrega:
    window.createPostHTML = createPostHTML;
    window.formatDuracion = formatDuracion;
    window.checkIfUserIsBlocked = checkIfUserIsBlocked;
    window.showBlockedUserModal = showBlockedUserModal;
    window.closeBlockedUserModal = closeBlockedUserModal;
    window.goToMyProfileFromModal = goToMyProfileFromModal;
    window.showPostModal = showPostModal;
    window.viewPost = viewPost;
    window.closeModal = closeModal;
    window.openModal = openModal;
    window.handleLikeModal = handleLikeModal;
    window.handleShareModal = handleShareModal;
    window.initializeComentarioEvents = initializeComentarioEvents;
    window.loadComentariosModal = loadComentariosModal;
    window.enviarComentarioModal = enviarComentarioModal;
    
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
    
    // Si el menú ya está abierto, cerrarlo
    if (menu.classList.contains('show')) {
        closeAllFriendOptionsMenus();
        return;
    }
    
    // Cerrar otros menús primero
    closeAllFriendOptionsMenus();
    
    // Mostrar este menú
    menu.style.display = 'block';
    setTimeout(() => {
        menu.classList.add('show');
    }, 10);
    
    // POSICIONAMIENTO FIJO MEJORADO
    const button = event.target.closest('.btn-options');
    if (button) {
        const rect = button.getBoundingClientRect();
        
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.right = 'auto';
        menu.style.zIndex = '10000';
        menu.style.transform = 'translateX(-60%)'; // Centrar relativamente al botón
    }
    
    // Agregar evento para cerrar con delay
    setTimeout(() => {
        const closeMenuHandler = function(e) {
            if (!menu.contains(e.target) && !button.contains(e.target)) {
                menu.classList.remove('show');
                setTimeout(() => {
                    if (!menu.classList.contains('show')) {
                        menu.style.display = 'none';
                    }
                }, 300);
                document.removeEventListener('click', closeMenuHandler);
            }
        };
        
        // Usar setTimeout para evitar que se cierre inmediatamente
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 100);
    }, 50);
};

window.closeAllFriendOptionsMenus = function() {
    console.log('🔒 Cerrando todos los menús de amigos...');
    document.querySelectorAll('.options-menu').forEach(menu => {
        menu.classList.remove('show');
        setTimeout(() => {
            if (!menu.classList.contains('show')) {
                menu.style.display = 'none';
            }
        }, 300);
    });
};

    
    
    console.log('✅ Funciones de opciones globales creadas');
}

function initializeFriendMenuEvents() {
    console.log('🎯 Inicializando eventos de menús de amigos...');
    
    // Event delegation mejorado con delay
    let closeTimeout;
    
    document.addEventListener('click', function(event) {
        const isMenuButton = event.target.closest('.btn-options');
        const isMenu = event.target.closest('.options-menu');
        const isMenuItem = event.target.closest('.option-item');
        
        if (!isMenuButton && !isMenu && !isMenuItem) {
            // Pequeño delay para permitir clicks en el menú
            clearTimeout(closeTimeout);
            closeTimeout = setTimeout(() => {
                closeAllFriendOptionsMenus();
            }, 150);
        }
    });
    
    // Prevenir cierre cuando el mouse está sobre el menú
    document.addEventListener('mouseover', function(event) {
        const isMenu = event.target.closest('.options-menu');
        const isMenuButton = event.target.closest('.btn-options');
        
        if (isMenu || isMenuButton) {
            clearTimeout(closeTimeout);
        }
    });
    
    // Event delegation para las opciones del menú
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // BLOQUEAR
        if (target.closest('.block-option')) {
            event.preventDefault();
            event.stopPropagation();
            clearTimeout(closeTimeout);
            
            const button = target.closest('.block-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de bloqueo para:', userId, userName);
                closeAllFriendOptionsMenus();
                setTimeout(() => {
                    showFriendBlockConfirmModal(userId, userName, userUsername);
                }, 200);
            }
        }
        
        // ELIMINAR SEGUIDOR
        if (target.closest('.remove-follower-option')) {
            event.preventDefault();
            event.stopPropagation();
            clearTimeout(closeTimeout);
            
            const button = target.closest('.remove-follower-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de eliminar seguidor para:', userId, userName);
                closeAllFriendOptionsMenus();
                setTimeout(() => {
                    showFriendRemoveFollowerConfirmModal(userId, userName, userUsername);
                }, 200);
            }
        }
        
        // DESBLOQUEAR
        if (target.closest('.unblock-option')) {
            event.preventDefault();
            event.stopPropagation();
            clearTimeout(closeTimeout);
            
            const button = target.closest('.unblock-option');
            const card = button.closest('.friend-card');
            
            if (card) {
                const userId = card.dataset.userId;
                const userName = card.dataset.userName || card.querySelector('h4')?.textContent || 'Usuario';
                const userUsername = card.querySelector('.friend-username')?.textContent?.replace('@', '') || '';
                
                console.log('🔄 Mostrando modal de desbloqueo para:', userId, userName);
                closeAllFriendOptionsMenus();
                setTimeout(() => {
                    showFriendUnblockConfirmModal(userId, userName, userUsername);
                }, 200);
            }
        }
    });
    
    console.log('✅ Eventos de menús de amigos inicializados');
}


// ===== EVENTOS DE MODALES =====
// ===== EVENTOS DE MODALES - MEJORADOS =====
function initializeModalEvents() {
    console.log('🎯 Inicializando eventos de modales...');
    
    // LIMPIAR event listeners anteriores
    const modals = ['coverPhotoModal', 'profilePhotoModal', 'editProfileModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const newModal = modal.cloneNode(true);
            modal.parentNode.replaceChild(newModal, modal);
        }
    });

    // Eventos para cerrar modales - CON PREVENCIÓN PARA PORTADA
    document.addEventListener('click', function(e) {
        // Cerrar con botón X
        if (e.target.classList.contains('close-modal')) {
            const modal = e.target.closest('.modal');
            if (modal && modal.id === 'coverPhotoModal') {
                // Para el modal de portada, preguntar antes de cerrar
                if (confirm('¿Estás seguro de que quieres cerrar? Los cambios no guardados se perderán.')) {
                    modal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            } else {
                // Para otros modales, cerrar normalmente
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
            return;
        }
        
        // Cerrar haciendo click fuera del contenido - CON PREVENCIÓN
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'coverPhotoModal') {
                // Para el modal de portada, preguntar antes de cerrar
                if (confirm('¿Estás seguro de que quieres cerrar? Los cambios no guardados se perderán.')) {
                    e.target.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            } else {
                // Para otros modales, cerrar normalmente
                e.target.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
            return;
        }
    });

    // Eventos específicos para inputs de archivos
    const coverInput = document.getElementById('coverPhotoInput');
    const profileInput = document.getElementById('profilePhotoInput');
    
    if (coverInput) {
        coverInput.removeEventListener('change', handleCoverPhotoSelect);
        coverInput.addEventListener('change', handleCoverPhotoSelect, { once: false });
    }
    
    if (profileInput) {
        profileInput.removeEventListener('change', handleProfilePhotoSelect);
        profileInput.addEventListener('change', handleProfilePhotoSelect, { once: false });
    }
    
    console.log('✅ Eventos de modales inicializados (con prevención de cierre)');
}

// ===== FUNCIONES BÁSICAS =====
function initializeSidebar() {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario actual para inicializar sidebar');
        return;
    }
    
    try {
        // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
        const viewingUserId = localStorage.getItem('viewingUserProfile');
        const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
        
        // Actualizar el texto del botón de perfil según el contexto
        const profileBtnText = document.getElementById('profileBtnText');
        const myProfileBtn = document.getElementById('myProfileBtn');
        
        console.log('🔍 Elementos del sidebar:', {
            profileBtnText: !!profileBtnText,
            myProfileBtn: !!myProfileBtn,
            isOwnProfile: isOwnProfile
        });
        
        // VERIFICACIÓN MÁS ROBUSTA
        if (profileBtnText) {
            profileBtnText.textContent = 'Mi Perfil';
        } else {
            console.warn('⚠️ Elemento profileBtnText no encontrado');
        }
        
        if (myProfileBtn) {
            if (isOwnProfile) {
                myProfileBtn.classList.add('active');
            } else {
                myProfileBtn.classList.remove('active');
            }
        } else {
            console.warn('⚠️ Elemento myProfileBtn no encontrado');
        }
        
        // AGREGAR EVENT LISTENER PARA EL BOTÓN DE MI PERFIL CON VERIFICACIÓN
        if (myProfileBtn) {
            // Remover event listeners existentes para evitar duplicados
            const newMyProfileBtn = myProfileBtn.cloneNode(true);
            myProfileBtn.parentNode.replaceChild(newMyProfileBtn, myProfileBtn);
            
            // Agregar nuevo event listener
            newMyProfileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Navegando a mi perfil desde sidebar...');
                goToMyProfile();
            });
        }
        
        // AGREGAR EVENT LISTENER PARA EL AVATAR DEL SIDEBAR TAMBIÉN
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarAvatar) {
            sidebarAvatar.style.cursor = 'pointer';
            sidebarAvatar.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Navegando a mi perfil desde avatar del sidebar...');
                goToMyProfile();
            });
        }
        
        // AGREGAR EVENT LISTENER PARA EL NOMBRE DE USUARIO EN SIDEBAR
        const sidebarUserName = document.getElementById('sidebarUserName');
        if (sidebarUserName) {
            sidebarUserName.style.cursor = 'pointer';
            sidebarUserName.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Navegando a mi perfil desde nombre de usuario...');
                goToMyProfile();
            });
        }
        
        // Siempre mostrar nuestros datos en el sidebar, no los del usuario que estamos viendo
        const userGreeting = document.getElementById('userGreeting');
        const sidebarUserUsername = document.getElementById('sidebarUserUsername');
        const sidebarSeguidoresCount = document.getElementById('sidebarSeguidoresCount');
        const sidebarSeguidosCount = document.getElementById('sidebarSeguidosCount');
        
        if (userGreeting) userGreeting.textContent = `Hola, ${currentUser.nombre}`;
        if (sidebarUserName) sidebarUserName.textContent = currentUser.nombre;
        if (sidebarUserUsername) sidebarUserUsername.textContent = `@${currentUser.username}`;
        if (sidebarSeguidoresCount) sidebarSeguidoresCount.textContent = currentUser.seguidores?.length || 0;
        if (sidebarSeguidosCount) sidebarSeguidosCount.textContent = currentUser.seguidos?.length || 0;
        
        // Actualizar avatar del sidebar
        if (sidebarAvatar && currentUser.foto_perfil) {
            sidebarAvatar.innerHTML = `<img src="${currentUser.foto_perfil}" alt="${currentUser.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; cursor: pointer;">`;
        }
        
    } catch (error) {
        console.error('❌ Error en initializeSidebar:', error);
    }
}

// ===== MODIFICAR LA FUNCIÓN DE VOLVER AL DASHBOARD =====
function initializeEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    const backButton = document.getElementById('backToDashboard');
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Limpiar el usuario que estábamos viendo
            localStorage.removeItem('viewingUserProfile');
            window.location.href = 'dashboard.html';
        });
    }
    
    // Actualizar el texto del botón de volver si estamos viendo otro perfil
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    if (viewingUserId && viewingUserId !== currentUser._id && backButton) {
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al Inicio';
    }
}

function addOtherUserStyles() {
    const styles = `
        .other-user-badge {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            margin-left: 8px;
            vertical-align: middle;
        }
        
        .user-profile-actions {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
        }
        
        .viewing-other-profile .edit-buttons {
            display: none !important;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Llamar a la función para agregar estilos
addOtherUserStyles();

// ===== MODIFICAR LA FUNCIÓN makeFunctionsGlobal =====
// En la función makeFunctionsGlobal, agregar:
window.navigateToUserProfile = function(userId) {
    // Guardar el ID del usuario que queremos ver en el localStorage
    localStorage.setItem('viewingUserProfile', userId);
    
    // Redirigir a profile.html
    window.location.href = 'profile.html';
};


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
    
    // Mostrar indicadores solo si hay más de 1 foto
    if (coverPhotos.length > 1) {
        indicators.innerHTML = coverPhotos.map((_, index) => `
            <button class="carousel-indicator ${index === 0 ? 'active' : ''}" 
                    onclick="goToCoverPhoto(${index})"></button>
        `).join('');
    } else {
        indicators.innerHTML = '';
    }
    
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
    const uploadPreview = document.getElementById('coverUploadPreview');
    const uploadArea = document.getElementById('coverUploadArea');
    const fileInput = document.getElementById('coverPhotoInput');
    
    if (uploadPreview) uploadPreview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileInput) fileInput.value = '';
    
    console.log('✅ Upload de portada cancelado/reseteado');
}

// Función para cargar el formulario de edición
async function loadEditProfileForm() {
    try {
        const formContainer = document.getElementById('editProfileForm');
        if (!formContainer) return;

        // Obtener lista de intereses disponibles
        const interesesResponse = await fetch(`${API_URL}/profile/intereses/lista`);
        const interesesResult = await interesesResponse.json();
        const interesesDisponibles = interesesResult.success ? interesesResult.data : [];

        const user = userProfileData?.usuario || currentUser;

        formContainer.innerHTML = `
            <form id="profileEditForm" class="profile-edit-form">
                <!-- Información Básica -->
                <div class="form-section">
                    <h4><i class="fas fa-user"></i> Información Básica</h4>
                    
                    <div class="form-group">
                        <label for="editNombre">Nombre completo *</label>
                        <input 
                            type="text" 
                            id="editNombre" 
                            name="nombre" 
                            value="${user.nombre || ''}" 
                            required
                            maxlength="50"
                        >
                    </div>

                    <div class="form-group">
                        <label for="editBiografia">Biografía</label>
                        <textarea 
                            id="editBiografia" 
                            name="biografia" 
                            placeholder="Cuéntanos sobre ti..." 
                            maxlength="500"
                            rows="3"
                        >${user.biografia || ''}</textarea>
                        <div class="char-count">
                            <span id="bioCharCount">${user.biografia?.length || 0}/500</span>
                        </div>
                    </div>
                </div>

                <!-- Información Personal -->
                <div class="form-section">
                    <h4><i class="fas fa-info-circle"></i> Información Personal</h4>
                    
                    <div class="form-group">
                        <label for="editUbicacion">Ubicación</label>
                        <input 
                            type="text" 
                            id="editUbicacion" 
                            name="ubicacion" 
                            value="${user.ubicacion || ''}" 
                            placeholder="Ciudad, País"
                            maxlength="100"
                        >
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editFechaNacimiento">Fecha de nacimiento</label>
                            <input 
                                type="date" 
                                id="editFechaNacimiento" 
                                name="fecha_nacimiento" 
                                value="${user.fecha_nacimiento ? new Date(user.fecha_nacimiento).toISOString().split('T')[0] : ''}"
                            >
                        </div>

                        <div class="form-group">
                            <label for="editGenero">Género</label>
                            <select id="editGenero" name="genero">
                                <option value="prefiero_no_decir" ${user.genero === 'prefiero_no_decir' ? 'selected' : ''}>Prefiero no decir</option>
                                <option value="masculino" ${user.genero === 'masculino' ? 'selected' : ''}>Masculino</option>
                                <option value="femenino" ${user.genero === 'femenino' ? 'selected' : ''}>Femenino</option>
                                <option value="otro" ${user.genero === 'otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </div>
                    </div>
                </div>


<!-- Intereses -->
<div class="form-section">
    <h4><i class="fas fa-heart"></i> Intereses</h4>
    <p class="form-help">Haz clic en los intereses para seleccionarlos (máximo 10)</p>
    
    <div class="intereses-selector">
        <div class="intereses-grid" id="interesesGrid">
            ${interesesDisponibles.map(interes => {
                const isSelected = user.intereses?.includes(interes);
                return `
                    <div class="interes-item ${isSelected ? 'selected' : ''}" 
                         data-interes="${interes}"
                         onclick="toggleInteres(this, '${interes}')">
                        <span class="interes-badge">
                            ${interes}
                            ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="intereses-seleccionados">
            <h5>
                <i class="fas fa-check-circle"></i> 
                Tus intereses seleccionados: 
                <span class="interests-count" id="interestsCount">
                    (${user.intereses?.length || 0}/10)
                </span>
            </h5>
            <div class="selected-interests-grid" id="selectedInterests">
                ${user.intereses?.map(interes => `
                    <div class="selected-interes-item" data-interes="${interes}">
                        <span class="interes-badge selected">
                            ${interes}
                            <i class="fas fa-times" onclick="removeInteres('${interes}')"></i>
                        </span>
                    </div>
                `).join('') || '<p class="no-interests">Aún no has seleccionado intereses</p>'}
            </div>
        </div>
    </div>
</div>

                <!-- Acciones del Formulario -->
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeEditProfileModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </form>
        `;

        // Inicializar eventos del formulario
        initializeEditFormEvents();

    } catch (error) {
        console.error('Error cargando formulario de edición:', error);
        showToast('❌ Error al cargar el formulario', 'error');
    }
}

// Array global para trackear intereses seleccionados
let selectedInterests = [];

// Función para toggle de intereses
window.toggleInteres = function(element, interes) {
    const index = selectedInterests.indexOf(interes);
    
    if (index === -1) {
        // Agregar interés si no ha alcanzado el límite
        if (selectedInterests.length >= 10) {
            showToast('❌ Máximo 10 intereses permitidos', 'error', 2000);
            return;
        }
        selectedInterests.push(interes);
        element.classList.add('selected');
    } else {
        // Remover interés
        selectedInterests.splice(index, 1);
        element.classList.remove('selected');
    }
    
    updateSelectedInterestsDisplay();
    updateInterestsCount();
};

// Función para remover interés desde la sección de seleccionados
window.removeInteres = function(interes) {
    const index = selectedInterests.indexOf(interes);
    if (index !== -1) {
        selectedInterests.splice(index, 1);
        
        // Actualizar el grid principal
        const interesElement = document.querySelector(`.interes-item[data-interes="${interes}"]`);
        if (interesElement) {
            interesElement.classList.remove('selected');
        }
        
        updateSelectedInterestsDisplay();
        updateInterestsCount();
    }
};

// Función para actualizar la visualización de intereses seleccionados
function updateSelectedInterestsDisplay() {
    const selectedContainer = document.getElementById('selectedInterests');
    
    if (!selectedContainer) return;
    
    if (selectedInterests.length === 0) {
        selectedContainer.innerHTML = '<p class="no-interests">Aún no has seleccionado intereses</p>';
    } else {
        selectedContainer.innerHTML = selectedInterests.map(interes => `
            <div class="selected-interes-item" data-interes="${interes}">
                <span class="interes-badge selected">
                    ${interes}
                    <i class="fas fa-times" onclick="removeInteres('${interes}')"></i>
                </span>
            </div>
        `).join('');
    }
}

// Función para actualizar el contador
function updateInterestsCount() {
    const countElement = document.getElementById('interestsCount');
    if (countElement) {
        countElement.textContent = `(${selectedInterests.length}/10)`;
        
        // Cambiar color si está cerca del límite
        if (selectedInterests.length >= 8) {
            countElement.style.color = '#e74c3c';
        } else if (selectedInterests.length >= 5) {
            countElement.style.color = '#f39c12';
        } else {
            countElement.style.color = '#27ae60';
        }
    }
}

// Función para inicializar los intereses seleccionados al cargar el formulario
function initializeSelectedInterests(user) {
    selectedInterests = user.intereses ? [...user.intereses] : [];
    updateInterestsCount();
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


// ===== GESTIÓN DE FOTOS DE PORTADA - CORREGIDAS =====
async function uploadCoverPhoto() {
    const fileInput = document.getElementById('coverPhotoInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('❌ Por favor selecciona una imagen', 'error');
        return;
    }
    
    // PREVENIR MÚLTIPLES CLICKS - deshabilitar botón temporalmente
    const uploadBtn = document.querySelector('#coverUploadPreview button[onclick*="uploadCoverPhoto"]');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
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
            
            // Recargar fotos existentes SIN cerrar el modal
            await loadExistingCoverPhotos();
            
            // Resetear el formulario de upload pero mantener el modal abierto
            cancelCoverUpload();
            
            console.log('✅ Foto subida exitosamente, modal permanece abierto');
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error subiendo foto de portada:', error);
        showToast('❌ Error al subir la foto', 'error');
    } finally {
        // Rehabilitar botón en caso de error
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Subir Foto';
        }
    }
}

// Función que ejecuta la eliminación después de la confirmación
// Función que ejecuta la eliminación después de la confirmación
async function confirmDeleteCoverPhoto(index) {
    try {
        showToast('⏳ Eliminando foto de portada...', 'info');
        
        const response = await fetch(`${API_URL}/upload/cover-picture/${currentUser._id}/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de portada eliminada', 'success');
            
            // Cerrar SOLO el modal de confirmación, no el principal
            closeDeleteCoverConfirmModal();
            
            // Actualizar el carrusel
            coverPhotos = result.coverPhotos || [];
            initializeCoverCarousel(coverPhotos);
            
            // Recargar las fotos existentes SIN cerrar el modal principal
            await loadExistingCoverPhotos();
            
            console.log('✅ Foto eliminada exitosamente, modal principal permanece abierto');
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
            closeDeleteCoverConfirmModal();
        }
    } catch (error) {
        console.error('Error eliminando foto de portada:', error);
        showToast('❌ Error al eliminar la foto', 'error');
        closeDeleteCoverConfirmModal();
    }
}

async function saveCoverChangesAndClose() {
    try {
        showToast('⏳ Guardando cambios...', 'info');
        
        // Aquí puedes agregar cualquier lógica adicional que necesites
        // antes de cerrar el modal, como sincronizar con el servidor
        
        // Simular un pequeño delay para mejor UX
        setTimeout(() => {
            closeCoverPhotoModal();
            showToast('✅ Cambios guardados exitosamente', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Error guardando cambios:', error);
        showToast('❌ Error al guardar los cambios', 'error');
    }
}

// ===== CARGA DE DATOS =====
// ===== CARGA DE DATOS - VERSIÓN MEJORADA =====
async function loadUserProfile() {
    try {
        console.log('🔄 Cargando perfil del usuario...');
        
        // Cargar datos del perfil y publicaciones por separado para mejor control
        const [profileResponse, postsResponse] = await Promise.all([
            fetch(`${API_URL}/profile/${currentUser._id}`),
            fetch(`${API_URL}/posts/user/${currentUser._id}`) // Usar la ruta de posts del usuario
        ]);

        const profileResult = await profileResponse.json();
        const postsResult = await postsResponse.json();

        if (profileResult.success) {
            userProfileData = profileResult.data;
            
            // Si las publicaciones se cargaron correctamente, usarlas
            if (postsResult.success) {
                userProfileData.publicaciones = postsResult.data;
                console.log('✅ Publicaciones cargadas con populate completo:', postsResult.data.length);
                
                // DEBUG: Verificar datos de autores
                postsResult.data.forEach((post, index) => {
                    console.log(`🔍 Post ${index}:`, {
                        id: post._id,
                        tipo: post.tipo,
                        autor: post.autor,
                        tieneAutor: !!post.autor,
                        nombreAutor: post.autor?.nombre,
                        usernameAutor: post.autor?.username
                    });
                    
                    if (post.tipo === 'share' && post.postOriginal) {
                        console.log(`📤 Post compartido ${index}:`, {
                            autorOriginal: post.postOriginal.autor,
                            tieneAutorOriginal: !!post.postOriginal.autor,
                            nombreOriginal: post.postOriginal.autor?.nombre,
                            usernameOriginal: post.postOriginal.autor?.username
                        });
                    }
                });
            }
            
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
    if (profileBio) profileBio.textContent = usuario.biografia || '¡Hola! Estoy usando Aural';
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
            const usuario = result.data.usuario;
            const covers = usuario.fotos_portada || [];
            const mainCover = usuario.foto_portada;
            const coversGrid = document.getElementById('coversGrid');
            
            if (!coversGrid) return;
            
            if (covers.length === 0) {
                coversGrid.innerHTML = `
                    <div class="empty-covers">
                        <i class="fas fa-images"></i>
                        <p>No hay fotos de portada</p>
                        <small>Agrega tu primera foto usando el botón de arriba</small>
                    </div>
                `;
            } else {
                coversGrid.innerHTML = covers.map((cover, index) => {
                    const isMain = cover === mainCover;
                    
                    return `
                        <div class="cover-item ${isMain ? 'main-cover' : ''}" data-index="${index}">
                            <div class="cover-drag-handle">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <img src="${cover}" alt="Portada ${index + 1}">
                            <div class="cover-actions">
                                <button class="btn-icon btn-set-main ${isMain ? 'active' : ''}" 
                                        onclick="setMainCoverPhoto(${index})" 
                                        title="${isMain ? 'Ya es la principal' : 'Establecer como principal'}">
                                    <i class="fas ${isMain ? 'fa-star' : 'fa-star'}"></i>
                                </button>
                                <button class="btn-icon btn-delete-cover" 
                                        onclick="deleteCoverPhoto(${index})" 
                                        title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            ${isMain ? '<div class="cover-badge">Principal</div>' : ''}
                        </div>
                    `;
                }).join('');
                
                // Inicializar drag & drop después de cargar
                setTimeout(() => initializeDragAndDrop(), 100);
            }
            
            console.log(`✅ ${covers.length} fotos de portada cargadas`);
        }
    } catch (error) {
        console.error('❌ Error cargando fotos de portada:', error);
    }
}

// ===== GESTIÓN DE FOTOS DE PORTADA - CORREGIDA =====
async function setMainCoverPhoto(index) {
    try {
        console.log(`⭐ Intentando establecer foto principal en índice: ${index}`);
        
        const response = await fetch(`${API_URL}/upload/cover-picture/main/${currentUser._id}/${index}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Foto de portada principal actualizada', 'success');
            
            // Actualizar datos locales
            if (userProfileData && userProfileData.usuario) {
                userProfileData.usuario.foto_portada = result.mainCoverPhoto;
            }
            
            // Actualizar currentUser en localStorage si es necesario
            if (currentUser) {
                currentUser.foto_portada = result.mainCoverPhoto;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // Recargar la lista de fotos existentes
            await loadExistingCoverPhotos();
            
            // Actualizar el carrusel
            currentCoverIndex = index;
            updateCarousel();
            
            console.log('✅ Foto principal establecida correctamente');
            
        } else {
            console.error('❌ Error del servidor:', result.error);
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error estableciendo foto principal:', error);
        showToast('❌ Error al actualizar la foto principal', 'error');
    }
}

// ===== GESTIÓN DE FOTOS DE PORTADA - MEJORADA =====
async function deleteCoverPhoto(index) {
    try {
        // Obtener datos actuales para mostrar en la confirmación
        const response = await fetch(`${API_URL}/profile/${currentUser._id}`);
        const result = await response.json();
        
        if (!result.success) {
            showToast('❌ Error al cargar datos', 'error');
            return;
        }

        const covers = result.data.usuario.fotos_portada || [];
        const coverToDelete = covers[index];
        
        if (!coverToDelete) {
            showToast('❌ No se encontró la foto a eliminar', 'error');
            return;
        }

        // Mostrar modal de confirmación
        showDeleteCoverConfirmModal(index, coverToDelete, covers.length);
        
    } catch (error) {
        console.error('❌ Error preparando eliminación:', error);
        showToast('❌ Error al preparar la eliminación', 'error');
    }
}

// Modal de confirmación para eliminar portada
// Modal de confirmación para eliminar portada
function showDeleteCoverConfirmModal(index, coverUrl, totalCovers) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'deleteCoverConfirmModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Confirmar eliminación</h3>
                <span class="close-modal" onclick="closeDeleteCoverConfirmModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="confirm-delete-content">
                    <div class="delete-preview">
                        <img src="${coverUrl}" alt="Portada a eliminar" style="max-width: 100%; border-radius: 8px;">
                    </div>
                    
                    <div class="delete-warning">
                        <i class="fas fa-info-circle"></i>
                        <p><strong>¿Estás seguro de que quieres eliminar esta foto de portada?</strong></p>
                        <p>Esta acción no se puede deshacer.</p>
                    </div>
                    
                    <div class="confirm-actions">
                        <button class="btn-secondary" onclick="closeDeleteCoverConfirmModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn-danger" onclick="confirmDeleteCoverPhoto(${index})">
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

function closeDeleteCoverConfirmModal() {
    const modal = document.getElementById('deleteCoverConfirmModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
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
    
    if (!aboutContent || !interestsContainer) return;
    
    aboutContent.innerHTML = `
        <div class="about-item">
            <strong><i class="fas fa-map-marker-alt"></i> Ubicación</strong>
            <span>${usuario.ubicacion || 'No especificada'}</span>
        </div>
        <div class="about-item">
            <strong><i class="fas fa-birthday-cake"></i> Fecha de nacimiento</strong>
            <span>${usuario.fecha_nacimiento ? formatDateForDisplay(usuario.fecha_nacimiento) : 'No especificada'}</span>
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
        // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
        const viewingUserId = localStorage.getItem('viewingUserProfile');
        const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
        
        if (isOwnProfile) {
            // Mostrar botón solo para nuestro propio perfil
            interestsContainer.innerHTML = `
                <p class="no-data">Aún no has agregado intereses</p>
            `;
        } else {
            // Para otros usuarios, mostrar mensaje sin botón
            interestsContainer.innerHTML = `
                <p class="no-data">Este usuario aún no ha agregado intereses</p>
            `;
        }
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

// ===== SISTEMA DRAG & DROP PARA PORTADAS =====
function initializeDragAndDrop() {
    const coversGrid = document.getElementById('coversGrid');
    if (!coversGrid) return;

    let draggedItem = null;

    // Hacer elementos arrastrables
    coversGrid.querySelectorAll('.cover-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.style.opacity = '0.4';
            }, 0);
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            coversGrid.querySelectorAll('.cover-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        item.addEventListener('dragenter', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });

        item.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        item.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedItem !== this) {
                const allItems = Array.from(coversGrid.querySelectorAll('.cover-item'));
                const fromIndex = allItems.indexOf(draggedItem);
                const toIndex = allItems.indexOf(this);
                
                if (fromIndex !== -1 && toIndex !== -1) {
                    reorderCoverPhotos(fromIndex, toIndex);
                }
            }
        });
    });
}

// Función para reordenar las fotos
async function reorderCoverPhotos(fromIndex, toIndex) {
    try {
        showToast('⏳ Reordenando fotos...', 'info');
        
        const response = await fetch(`${API_URL}/upload/cover-picture/reorder/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromIndex: fromIndex,
                toIndex: toIndex
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Fotos reordenadas correctamente', 'success');
            
            // Actualizar localmente
            coverPhotos = result.coverPhotos || [];
            await loadExistingCoverPhotos();
            
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
            // Recargar para mantener consistencia
            await loadExistingCoverPhotos();
        }
    } catch (error) {
        console.error('Error reordenando fotos:', error);
        showToast('❌ Error al reordenar las fotos', 'error');
        // Recargar para mantener consistencia
        await loadExistingCoverPhotos();
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

            <!-- HACER CLICK EN EL AVATAR O INFO PARA IR AL PERFIL -->
            <div class="friend-avatar" onclick="navigateToUserProfile('${user._id}')" style="cursor: pointer;">
                ${user.foto_perfil ? 
                    `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            
            <div class="friend-info" onclick="navigateToUserProfile('${user._id}')" style="cursor: pointer;">
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
                    <button class="btn-view-friend" onclick="navigateToUserProfile('${user._id}')">
                        <i class="fas fa-eye"></i> Ver Perfil
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
// ===== SECCIÓN DE COLECCIONES =====
function loadCollectionsSection() {
    const collectionsGrid = document.getElementById('collectionsGrid');
    const allCollections = document.getElementById('allCollections');
    
    if (!collectionsGrid || !allCollections) return;

    // Mostrar estado de carga temporalmente
    collectionsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando colecciones...</p>
        </div>
    `;
    
    allCollections.innerHTML = '';

    // Intentar cargar colecciones si la función existe
    if (typeof loadUserCollections === 'function') {
        loadUserCollections();
    } else if (typeof initializeCollections === 'function') {
        initializeCollections();
    } else {
        // Si no existen las funciones de colecciones, mostrar mensaje
        collectionsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Sistema de colecciones</h3>
                <p>Las colecciones te permiten organizar tus publicaciones favoritas.</p>
                <button class="btn-primary" onclick="showCollectionsInfo()">
                    <i class="fas fa-info"></i> Más información
                </button>
            </div>
        `;
    }
}

// Función temporal para mostrar información
function showCollectionsInfo() {
    showToast('🔧 El sistema de colecciones estará disponible pronto', 'info');
}

// ===== PUBLICACIONES =====
function displayProfilePosts(posts) {
    const postsFeed = document.getElementById('profilePostsFeed');
    if (!postsFeed) return;
    
    // ACTUALIZAR currentPosts con las publicaciones del perfil
    currentPosts = posts || [];
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    
    if (!posts || posts.length === 0) {
        if (isOwnProfile) {
            // Mostrar botón de crear publicación solo para el propio perfil
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
        } else {
            // Para otros usuarios sin publicaciones, mostrar mensaje diferente
            postsFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-feather"></i>
                    <h3>No hay publicaciones</h3>
                    <p>Este usuario aún no ha compartido ninguna publicación.</p>
                </div>
            `;
        }
        return;
    }
    
    postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');
    initializePostInteractions('profilePostsFeed', posts);
    initializeMediaPlayers(); // Inicializar reproductores de audio/video
}



// Función para inicializar reproductores de audio y video
function initializeMediaPlayers() {
    // Inicializar controles de audio
    document.querySelectorAll('.audio-player').forEach(player => {
        player.addEventListener('play', function() {
            // Pausar otros audios cuando uno se reproduce
            document.querySelectorAll('.audio-player').forEach(otherPlayer => {
                if (otherPlayer !== player && !otherPlayer.paused) {
                    otherPlayer.pause();
                }
            });
        });
    });
    
    // Inicializar controles de video
    document.querySelectorAll('.video-player').forEach(player => {
        player.addEventListener('play', function() {
            // Pausar otros videos cuando uno se reproduce
            document.querySelectorAll('.video-player').forEach(otherPlayer => {
                if (otherPlayer !== player && !otherPlayer.paused) {
                    otherPlayer.pause();
                }
            });
        });
        
        // Agregar controles personalizados si es necesario
        player.addEventListener('loadedmetadata', function() {
            const duration = formatDuracion(player.duration);
            const durationElement = player.parentElement.querySelector('.video-duration, .audio-duration');
            if (durationElement && !durationElement.textContent) {
                durationElement.textContent = duration;
            }
        });
    });
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

// ===== PUBLICACIONES CON AUDIO Y VIDEO =====
// En la función createPostHTML, modificar la parte de las opciones del post:
function createPostHTML(post) {
    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const likeCount = post.likes.length;
    const shareCount = post.shares ? post.shares.length : 0;
    const timeAgo = getTimeAgo(new Date(post.fecha_publicacion));
    
    const isSharedPost = post.tipo === 'share';
    const hasOriginalPost = isSharedPost && post.postOriginal;
    
    // Verificar si estamos viendo nuestro propio perfil o el de otro usuario
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    const isOwnProfile = !viewingUserId || viewingUserId === currentUser._id;
    const isAuthor = post.autor._id === currentUser._id;

    // Solo mostrar opciones de edición si es nuestro propio perfil Y somos autores del post
    const showOptions = isOwnProfile && isAuthor && !isSharedPost;

    return `
        <div class="post-card" id="post-${post._id}" data-content-type="${post.tipoContenido || 'texto'}">
            <div class="post-header">
                <div class="post-avatar" onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer;">
                    ${post.autor.foto_perfil ? 
                        `<img src="${post.autor.foto_perfil}" alt="${post.autor.nombre}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="post-user-info">
                    <h4 onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #3498db;">
                        ${post.autor.nombre || 'Usuario'}
                    </h4>
                    <p onclick="navigateToUserProfile('${post.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                        @${post.autor.username || 'usuario'}
                    </p>
                    ${post.tipoContenido ? `
                        <span class="content-type-badge ${post.tipoContenido}">${post.tipoContenido}</span>
                    ` : ''}
                </div>
                <div class="post-time">${timeAgo}</div>
                
                ${(isOwnProfile && isAuthor) ? `
    <div class="post-options">
        <button class="btn-icon post-options-btn" id="optionsBtn-${post._id}">
            <i class="fas fa-ellipsis-h"></i>
        </button>
        <div class="post-options-menu" id="optionsMenu-${post._id}">
            ${!isSharedPost ? `
                <!-- Solo mostrar editar si NO es un post compartido -->
                <button class="option-item edit-option" onclick="editPost('${post._id}')">
                    <i class="fas fa-edit"></i>
                    <span>Editar publicación</span>
                </button>
            ` : ''}
            <!-- Siempre mostrar eliminar para posts propios -->
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
                    <span>${post.autor.nombre || 'Usuario'} compartió esto</span>
                </div>
            ` : ''}
            
            <div class="post-content" id="postContent-${post._id}">
                ${formatPostContent(post.contenido)}
            </div>
            
            ${hasOriginalPost && post.postOriginal ? `
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
                                ${post.postOriginal.autor.nombre || 'Usuario'}
                            </strong>
                            <span onclick="navigateToUserProfile('${post.postOriginal.autor._id}')" style="cursor: pointer; color: #7f8c8d;">
                                @${post.postOriginal.autor.username || 'usuario'}
                            </span>
                            ${post.postOriginal.tipoContenido ? `
                                <span class="content-type-badge ${post.postOriginal.tipoContenido}">
                                    ${post.postOriginal.tipoContenido}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="original-post-content">
                        ${formatPostContent(post.postOriginal.contenido)}
                    </div>
                    ${post.postOriginal.imagen ? `
                        <img src="${post.postOriginal.imagen}" alt="Imagen de publicación" class="original-post-image">
                    ` : ''}
                    ${post.postOriginal.audio ? `
                        <div class="post-audio">
                            <audio controls class="audio-player">
                                <source src="${post.postOriginal.audio}" type="audio/mpeg">
                                <source src="${post.postOriginal.audio}" type="audio/wav">
                                <source src="${post.postOriginal.audio}" type="audio/ogg">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                            ${post.postOriginal.duracion ? `<div class="audio-duration">${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                        </div>
                    ` : ''}
                    ${post.postOriginal.video ? `
                        <div class="post-video">
                            <video controls class="video-player">
                                <source src="${post.postOriginal.video}" type="video/mp4">
                                <source src="${post.postOriginal.video}" type="video/webm">
                                <source src="${post.postOriginal.video}" type="video/ogg">
                                Tu navegador no soporta el elemento de video.
                            </video>
                            ${post.postOriginal.duracion ? `<div class="video-duration">${formatDuracion(post.postOriginal.duracion)}</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            ${!isSharedPost ? `
                ${post.imagen ? `
                    <img src="${post.imagen}" alt="Imagen de publicación" class="post-image" id="postImage-${post._id}">
                ` : ''}
                
                ${post.audio ? `
                    <div class="post-audio">
                        <audio controls class="audio-player">
                            <source src="${post.audio}" type="audio/mpeg">
                            <source src="${post.audio}" type="audio/wav">
                            <source src="${post.audio}" type="audio/ogg">
                            Tu navegador no soporta el elemento de audio.
                        </audio>
                        ${post.duracion ? `<div class="audio-duration">${formatDuracion(post.duracion)}</div>` : ''}
                    </div>
                ` : ''}
                
                ${post.video ? `
                    <div class="post-video">
                        <video controls class="video-player">
                            <source src="${post.video}" type="video/mp4">
                            <source src="${post.video}" type="video/webm">
                            <source src="${post.video}" type="video/ogg">
                            Tu navegador no soporta el elemento de video.
                        </video>
                        ${post.duracion ? `<div class="video-duration">${formatDuracion(post.duracion)}</div>` : ''}
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

// Función auxiliar para verificar si estamos viendo nuestro propio perfil
function isOwnProfile() {
    const viewingUserId = localStorage.getItem('viewingUserProfile');
    return !viewingUserId || viewingUserId === currentUser._id;
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

// Función para inicializar eventos del formulario de edición
// Función para inicializar eventos del formulario de edición
function initializeEditFormEvents() {
    const form = document.getElementById('profileEditForm');
    const bioTextarea = document.getElementById('editBiografia');
    const bioCharCount = document.getElementById('bioCharCount');

    // Inicializar intereses del usuario
    const user = userProfileData?.usuario || currentUser;
    initializeSelectedInterests(user);

    // Contador de caracteres para biografía
    if (bioTextarea && bioCharCount) {
        bioTextarea.addEventListener('input', function() {
            const length = this.value.length;
            bioCharCount.textContent = `${length}/500`;
            bioCharCount.style.color = length > 450 ? '#e74c3c' : length > 400 ? '#f39c12' : '#7f8c8d';
        });
    }

    // Envío del formulario
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfileChanges();
        });
    }
}

// Función para actualizar la visualización de intereses seleccionados
function updateSelectedInterests() {
    const selectedInterestsContainer = document.getElementById('selectedInterests');
    const selectedCheckboxes = document.querySelectorAll('input[name="intereses"]:checked');
    
    if (!selectedInterestsContainer) return;

    if (selectedCheckboxes.length === 0) {
        selectedInterestsContainer.innerHTML = '<p class="no-interests">Aún no has seleccionado intereses</p>';
    } else {
        selectedInterestsContainer.innerHTML = Array.from(selectedCheckboxes)
            .map(checkbox => `<span class="interest-tag selected">${checkbox.value}</span>`)
            .join('');
    }

    // Actualizar clases de los checkboxes
    document.querySelectorAll('.interes-checkbox').forEach(label => {
        const checkbox = label.querySelector('input');
        if (checkbox.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    });
}

// Función para validar límite de intereses
function validateInterestsLimit() {
    const selectedCheckboxes = document.querySelectorAll('input[name="intereses"]:checked');
    const remainingCheckboxes = document.querySelectorAll('input[name="intereses"]:not(:checked)');
    
    if (selectedCheckboxes.length >= 10) {
        remainingCheckboxes.forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.parentElement.classList.add('disabled');
        });
        
        showToast('ℹ️ Has alcanzado el límite de 10 intereses', 'info', 2000);
    } else {
        remainingCheckboxes.forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.parentElement.classList.remove('disabled');
        });
    }
}

// ===== FUNCIONES UTILITARIAS PARA FECHAS =====

/**
 * Convierte una fecha a formato YYYY-MM-DD para inputs type="date"
 * Maneja correctamente las zonas horarias
 */
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Ajustar por zona horaria para obtener la fecha correcta
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    
    return adjustedDate.toISOString().split('T')[0];
}

/**
 * Convierte una fecha de input a formato ISO para guardar en la base de datos
 */
function formatDateForStorage(dateString) {
    if (!dateString) return '';
    
    // Las fechas de input type="date" ya están en formato YYYY-MM-DD
    // Agregar tiempo para evitar problemas de zona horaria
    return new Date(dateString + 'T12:00:00').toISOString();
}

/**
 * Formatea una fecha para mostrar al usuario (DD/MM/YYYY)
 */
function formatDateForDisplay(dateString) {
    if (!dateString) return 'No especificada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// Función para guardar los cambios del perfil
// Función para guardar los cambios del perfil - VERSIÓN CORREGIDA
async function saveProfileChanges() {
    console.log('💾 Intentando guardar cambios del perfil...');
    
    const form = document.getElementById('profileEditForm');
    if (!form) {
        console.error('❌ Formulario no encontrado');
        showToast('❌ Error: Formulario no encontrado', 'error');
        return;
    }

    // Obtener valores de los inputs
    const nombreInput = document.getElementById('editNombre');
    const biografiaInput = document.getElementById('editBiografia');
    const ubicacionInput = document.getElementById('editUbicacion');
    const fechaNacimientoInput = document.getElementById('editFechaNacimiento');
    const generoSelect = document.getElementById('editGenero');

    // Validar que los elementos existen
    if (!nombreInput) {
        console.error('❌ Campo nombre no encontrado');
        showToast('❌ Error: Campo nombre no encontrado', 'error');
        return;
    }

    const profileData = {
        nombre: nombreInput ? nombreInput.value.trim() : '',
        biografia: biografiaInput ? biografiaInput.value.trim() : '',
        ubicacion: ubicacionInput ? ubicacionInput.value.trim() : '',
        // CORREGIDO: Usar el formateo correcto para fechas
        fecha_nacimiento: fechaNacimientoInput && fechaNacimientoInput.value ? 
            formatDateForStorage(fechaNacimientoInput.value) : '',
        genero: generoSelect ? generoSelect.value : 'prefiero_no_decir',
        intereses: selectedInterests || []
    };

    console.log('📦 Datos a enviar:', profileData);

    // Validaciones básicas MEJORADAS
    if (!profileData.nombre) {
        showToast('❌ El nombre es obligatorio', 'error');
        
        // Resaltar el campo con error
        if (nombreInput) {
            nombreInput.style.borderColor = '#e74c3c';
            nombreInput.focus();
        }
        return;
    }

    if (profileData.nombre.length < 2) {
        showToast('❌ El nombre debe tener al menos 2 caracteres', 'error');
        nombreInput.style.borderColor = '#e74c3c';
        nombreInput.focus();
        return;
    }

    try {
        showToast('⏳ Guardando cambios...', 'info');

        const response = await fetch(`${API_URL}/profile/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();
        console.log('📨 Respuesta del servidor:', result);

        if (result.success) {
            showToast('✅ Perfil actualizado exitosamente', 'success');
            
            // Actualizar datos locales
            if (userProfileData && userProfileData.usuario) {
                Object.assign(userProfileData.usuario, result.data);
            }
            
            // Actualizar currentUser en localStorage
            Object.assign(currentUser, result.data);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Actualizar la interfaz
            updateProfileHeader(userProfileData.usuario);
            loadAboutSection(userProfileData.usuario);
            initializeSidebar();
            
            closeEditProfileModal();
            
        } else {
            console.error('❌ Error del servidor:', result.error);
            showToast(`❌ Error: ${result.error}`, 'error');
        }

    } catch (error) {
        console.error('❌ Error guardando cambios del perfil:', error);
        showToast('❌ Error al guardar los cambios', 'error');
    }
}

// Función para cerrar el modal de edición de perfil
window.closeEditProfileModal = function() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
};

// Actualizar la función editProfile existente para usar el nuevo modal
window.editProfile = function() {
    openEditProfileModal();
};


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


// Función para actualizar el post en el DOM
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

// Función de diagnóstico temporal
function diagnoseFormData() {
    const form = document.getElementById('profileEditForm');
    if (!form) {
        console.error('❌ Formulario no encontrado');
        return;
    }
    
    const formData = new FormData(form);
    console.log('🔍 DIAGNÓSTICO FORM DATA:');
    
    // Verificar todos los campos del formulario
    for (let [key, value] of formData.entries()) {
        console.log(`📋 ${key}:`, value);
    }
    
    // Verificar campos específicos
    const nombreInput = document.getElementById('editNombre');
    console.log('✅ Campo nombre existe:', !!nombreInput);
    if (nombreInput) {
        console.log('📝 Valor del nombre:', nombreInput.value);
    }
    
    // Verificar intereses seleccionados
    console.log('🎯 Intereses seleccionados:', selectedInterests);
}

// ===== FUNCIONES DE UTILIDAD PARA AUDIO Y VIDEO =====

// Función para formatear la duración
function formatDuracion(segundos) {
    if (!segundos || segundos === 0) return '';
    
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

// Función para manejar like en publicaciones
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
                showToast('❤️ Te gusta esta publicación', 'success');
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

// Función para manejar share en publicaciones
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
            
            // Recargar las publicaciones para mostrar el nuevo post compartido
            setTimeout(() => {
                loadProfilePosts();
            }, 1000);
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error compartiendo publicación:', error);
        showToast('❌ Error al compartir la publicación', 'error');
    }
}

// Función para ver publicación completa
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

// ===== SISTEMA DE COMENTARIOS IDÉNTICO A DASHBOARD =====

// Variable global para el post actual en el modal


// Función para mostrar el modal de publicación (IDÉNTICA A DASHBOARD)
function showPostModal(post) {
    console.log('🎯 Abriendo modal para post en profile:', post._id);
    currentPostId = post._id;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'postModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; height: 90vh;">
            <div class="modal-header">
                <h3><i class="fas fa-comment"></i> Publicación</h3>
                <span class="close-modal" onclick="closeModal('post')">&times;</span>
            </div>
            <div class="modal-body" style="height: calc(100% - 120px); overflow-y: auto;">
                ${createPostModalContent(post)}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupModalEvents(post);
    loadComentariosModal(post._id);
    openModal('post');
}

// Función IDÉNTICA a dashboard.js
function createPostModalContent(post) {
    const isLiked = post.likes.some(like => 
        typeof like === 'object' ? like._id === currentUser._id : like === currentUser._id
    );
    
    const shareCount = post.shares ? post.shares.length : 0;
    const isAuthor = post.autor._id === currentUser._id;
    const isSharedPost = post.tipo === 'share';

    return `
        <!-- Contenido Principal - MISMAS CLASES QUE DASHBOARD -->
        <div class="post-content-modal-adjusted">
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
            ${!isSharedPost ? `
                <button class="option-item edit-option" onclick="editPost('${post._id}'); closeModal('post');">
                    <i class="fas fa-edit"></i>
                    <span>Editar publicación</span>
                </button>
            ` : ''}
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

        <!-- Estadísticas - MISMAS CLASES QUE DASHBOARD -->
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

        <!-- Acciones - MISMAS CLASES QUE DASHBOARD -->
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

        <!-- Sección de Comentarios INTEGRADA CON EL DISEÑO DEL MODAL - MISMAS CLASES -->
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
}

// Configurar eventos del modal - MISMAS FUNCIONES QUE DASHBOARD
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

// Función para manejar like en el modal - IDÉNTICA A DASHBOARD
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

// Función para manejar share en el modal - IDÉNTICA A DASHBOARD
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
            
            // Recargar las publicaciones del perfil
            setTimeout(() => {
                loadProfilePosts();
            }, 500);
            
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error compartiendo publicación:', error);
        showToast('❌ Error al compartir la publicación', 'error');
    }
}

// ===== FUNCIONES DE COMENTARIOS IDÉNTICAS A DASHBOARD =====

// Inicializar eventos del área de comentarios - IDÉNTICA A DASHBOARD
function initializeComentarioEvents() {
    const comentarioTextarea = document.getElementById('nuevoComentario');
    const btnEnviarComentario = document.getElementById('btnEnviarComentario');
    
    if (!comentarioTextarea || !btnEnviarComentario) {
        console.error('❌ Elementos de comentario no encontrados');
        return;
    }

    console.log('✅ Inicializando eventos de comentarios en profile...');

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

// Cargar comentarios en el modal - IDÉNTICA A DASHBOARD
async function loadComentariosModal(postId) {
    console.log('🔄 Cargando comentarios para post en profile:', postId);
    
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
        console.log('📨 Respuesta comentarios en profile:', result);

        if (result.success && result.data && result.data.length > 0) {
            console.log(`✅ ${result.data.length} comentarios encontrados en profile`);
            
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
            console.log('ℹ️ No hay comentarios o respuesta vacía en profile');
            listaComentarios.innerHTML = `
                <div class="empty-comments">
                    <i class="fas fa-comments"></i>
                    <p>No hay comentarios aún</p>
                    <small>Sé el primero en comentar</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error cargando comentarios en profile:', error);
        listaComentarios.innerHTML = `
            <div class="empty-comments error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar comentarios</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Enviar comentario desde el modal - IDÉNTICA A DASHBOARD
async function enviarComentarioModal() {
    console.log('🔄 Intentando enviar comentario desde profile...');
    
    const comentarioTextarea = document.getElementById('nuevoComentario');
    const btnEnviarComentario = document.getElementById('btnEnviarComentario');
    
    if (!comentarioTextarea || !btnEnviarComentario || !currentPostId) {
        console.error('❌ Elementos necesarios no disponibles en profile');
        return;
    }
    
    const contenido = comentarioTextarea.value.trim();
    if (!contenido) {
        console.error('❌ Contenido de comentario vacío en profile');
        return;
    }

    try {
        console.log('📤 Enviando comentario desde profile:', { 
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
        
        console.log('📦 Request body (CORREGIDO) desde profile:', requestBody);
        
        const response = await fetch(`${API_URL}/posts/${currentPostId}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📨 Response status desde profile:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response desde profile:', errorText);
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Respuesta enviar comentario desde profile:', result);
        
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
        console.error('❌ Error enviando comentario desde profile:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    } finally {
        btnEnviarComentario.disabled = false;
        btnEnviarComentario.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

// Función para abrir modal - IDÉNTICA A DASHBOARD
function openModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

// Función para cerrar modal - IDÉNTICA A DASHBOARD
function closeModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
        
        if (type === 'post') {
            currentPostId = null;
            const comentarioTextarea = document.getElementById('nuevoComentario');
            if (comentarioTextarea) {
                comentarioTextarea.value = '';
            }
        }
    }
}