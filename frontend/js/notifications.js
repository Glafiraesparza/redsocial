// frontend/js/notifications.js

let currentNotifications = [];
let unreadCount = 0;

console.log('🔔 notifications.js cargado correctamente');

// Verificar dependencias
if (typeof API_URL === 'undefined') {
    console.error('❌ API_URL no está definida');
    // Definir una por defecto para testing
    const API_URL = 'http://localhost:3001/api';
}

if (typeof currentUser === 'undefined') {
    console.warn('⚠️ currentUser no está definido, buscando en localStorage...');
    // Intentar obtener del localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        window.currentUser = JSON.parse(userData);
        console.log('✅ Usuario obtenido de localStorage:', window.currentUser._id);
    } else {
        console.error('❌ No se pudo obtener el usuario actual');
    }
}

function getCurrentUser() {
    // Verificar de dónde obtienes el usuario actual
    if (typeof currentUser !== 'undefined') {
        return currentUser;
    }
    
    // Intentar obtener del localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        return JSON.parse(userData);
    }
    
    console.error('❌ No se pudo obtener el usuario actual');
    return null;
}

// Cargar notificaciones
async function loadNotifications() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser._id) {
        console.error('❌ Usuario no disponible');
        showToast('❌ Debes iniciar sesión para ver notificaciones', 'error');
        showEmptyState();
        return;
    }
    
    try {
        showLoadingState();
        console.log('🔄 Cargando notificaciones para usuario:', currentUser._id);
        
        const response = await fetch(`${API_URL}/notifications/${currentUser._id}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📨 Respuesta del servidor:', result);
        
        if (result.success) {
            currentNotifications = result.data.notifications;
            unreadCount = result.data.noLeidas;
            console.log(`📊 Notificaciones: ${currentNotifications.length}, No leídas: ${unreadCount}`);
            displayNotifications(currentNotifications);
            updateNotificationBadge(unreadCount);
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('❌ Error cargando notificaciones:', error);
        showToast('❌ Error al cargar notificaciones', 'error');
        showEmptyState();
    }
}

// Mostrar estado de carga
function showLoadingState() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando notificaciones...</p>
        </div>
    `;
}

// Mostrar estado vacío
function showEmptyState() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <h3>No hay notificaciones</h3>
            <p>Las notificaciones de likes, comentarios, seguidores y mensajes aparecerán aquí.</p>
            <small>Las notificaciones son visibles por 30 días</small>
        </div>
    `;
}

// Mostrar notificaciones en el DOM
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        showEmptyState();
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.leida ? '' : 'unread'}" 
             onclick="handleNotificationClick('${notification._id}', '${notification.tipo}', '${notification.post?._id || ''}', '${notification.emisor._id}')">
            <div class="notification-avatar">
                ${notification.emisor.foto_perfil ? 
                    `<img src="${notification.emisor.foto_perfil}" alt="${notification.emisor.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="notification-content">
                <div class="notification-text">
                    <strong>${notification.emisor.nombre}</strong>
                    ${getNotificationText(notification)}
                </div>
                <div class="notification-time">
                    ${getTimeAgo(new Date(notification.fecha_creacion))}
                </div>
                ${notification.comentario ? `
                    <div class="notification-comment-preview">
                        "${notification.comentario.substring(0, 100)}${notification.comentario.length > 100 ? '...' : ''}"
                    </div>
                ` : ''}
            </div>
            <div class="notification-actions">
                ${!notification.leida ? `
                    <button class="btn-icon btn-small" onclick="markAsRead('${notification._id}', event)" title="Marcar como leída">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="btn-icon btn-small btn-danger" onclick="deleteNotification('${notification._id}', event)" title="Eliminar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Obtener texto de la notificación
function getNotificationText(notification) {
    const texts = {
        'like': 'le gustó tu publicación',
        'comment': 'comentó tu publicación',
        'follow': 'empezó a seguirte',
        'share': 'compartió tu publicación',
        'message': 'te envió un mensaje'
    };
    return texts[notification.tipo] || 'te notificó';
}

// Manejar clic en notificación
function handleNotificationClick(notificationId, type, postId, emisorId) {
    markAsRead(notificationId);
    
    switch(type) {
        case 'like':
        case 'comment':
        case 'share':
            if (postId) {
                viewPost(postId);
            }
            break;
        case 'follow':
            if (emisorId) {
                navigateToUserProfile(emisorId);
            }
            break;
        case 'message':
            showSection('messages');
            break;
    }
}

// Marcar como leída
async function markAsRead(notificationId, event = null) {
    if (event) event.stopPropagation();
    
    try {
        const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationBadge(unreadCount);
            
            const notificationItem = document.querySelector(`[onclick*="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.classList.remove('unread');
                const markAsReadBtn = notificationItem.querySelector('.btn-icon');
                if (markAsReadBtn) {
                    markAsReadBtn.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
    }
}

// Marcar todas como leídas
async function markAllAsRead() {
    try {
        const response = await fetch(`${API_URL}/notifications/${currentUser._id}/read-all`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Todas las notificaciones marcadas como leídas', 'success');
            unreadCount = 0;
            updateNotificationBadge(0);
            loadNotifications();
        }
    } catch (error) {
        console.error('Error marcando todas como leídas:', error);
        showToast('❌ Error al marcar como leídas', 'error');
    }
}

// Eliminar notificación individual
async function deleteNotification(notificationId, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta notificación?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            const notificationItem = document.querySelector(`[onclick*="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.remove();
            }
            
            const notification = currentNotifications.find(n => n._id === notificationId);
            if (notification && !notification.leida) {
                unreadCount = Math.max(0, unreadCount - 1);
                updateNotificationBadge(unreadCount);
            }
            
            const remainingNotifications = document.querySelectorAll('.notification-item');
            if (remainingNotifications.length === 0) {
                showEmptyState();
            }
            
            showToast('✅ Notificación eliminada', 'success');
        }
    } catch (error) {
        console.error('Error eliminando notificación:', error);
        showToast('❌ Error eliminando notificación', 'error');
    }
}

// Limpiar todas las notificaciones
async function clearAllNotifications() {
    if (!confirm('¿Estás seguro de que quieres limpiar todas las notificaciones?\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/notifications/${currentUser._id}/clear-all`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Todas las notificaciones han sido eliminadas', 'success');
            unreadCount = 0;
            updateNotificationBadge(0);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error eliminando todas las notificaciones:', error);
        showToast('❌ Error eliminando notificaciones', 'error');
    }
}

// Actualizar badge de notificaciones
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Verificar nuevas notificaciones periódicamente
function startNotificationPolling() {
    setInterval(() => {
        if (currentUser && document.getElementById('notificationsSection').classList.contains('active')) {
            loadNotifications();
        }
    }, 30000);
}

// Inicializar notificaciones
function initializeNotifications() {
    if (currentUser) {
        loadNotifications();
        startNotificationPolling();
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeNotifications, 1000);
});

window.loadNotifications = loadNotifications;
window.markAllAsRead = markAllAsRead;
window.clearAllNotifications = clearAllNotifications;
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;

console.log('✅ Funciones de notificaciones registradas globalmente');