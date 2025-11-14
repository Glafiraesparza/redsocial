// frontend/js/messages.js
console.log('📦 messages.js cargado');

const MESSAGES_API = 'http://localhost:3001/api/messages';

// Variables globales específicas de mensajes - DEFINIRLAS AL INICIO
let currentConversacion = null;
let currentUserMessages = null;
let conversaciones = [];
let mensajesInterval = null;
let isMessagesInitialized = false; // DEFINIDA AL INICIO
let isStartingNewChat = false;

// ========== INICIALIZACIÓN ==========
function initializeMessages() {
    console.log('💬 Inicializando mensajes...');
    
    // Evitar inicialización múltiple
    if (isMessagesInitialized) {
        console.log('⚠️ Mensajes ya inicializados, omitiendo...');
        return;
    }
    
    // Obtener usuario actual de forma segura
    try {
        // Primero intentar desde dashboard.js, luego desde localStorage
        currentUserMessages = window.currentUser;
        if (!currentUserMessages) {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                currentUserMessages = JSON.parse(storedUser);
            }
        }
        console.log('✅ Usuario para mensajes:', currentUserMessages);
    } catch (error) {
        console.error('❌ Error obteniendo usuario:', error);
        return;
    }
    
    if (!currentUserMessages) {
        console.error('❌ No hay usuario logueado para mensajes');
        return;
    }
    
    console.log('✅ Usuario para mensajes:', currentUserMessages.nombre);
    
    // Verificar que los elementos del DOM existen
    const messageInput = document.getElementById('newMessageInput');
    const sendButton = document.getElementById('sendMessageBtn');
    const conversationsList = document.getElementById('conversationsList');
    
    if (!messageInput || !sendButton || !conversationsList) {
        console.error('❌ Elementos del DOM de mensajes no encontrados');
        return;
    }
    
    // Habilitar inputs de mensajes
    messageInput.disabled = false;
    sendButton.disabled = false;
    
    console.log('✅ Inputs de mensajes habilitados');
    
    // Cargar datos
    loadConversaciones();
    initializeMessagesEventListeners();
    
    // Polling para nuevos mensajes
    if (mensajesInterval) {
        clearInterval(mensajesInterval);
    }
    mensajesInterval = setInterval(loadConversaciones, 5000);
    
    isMessagesInitialized = true;
    console.log('✅ Sistema de mensajes completamente inicializado');
}

function initializeMessagesEventListeners() {
    console.log('🔧 Inicializando event listeners de mensajes...');
    
    // Buscar conversaciones
    const searchInput = document.getElementById('searchConversations');
    if (searchInput) {
        searchInput.addEventListener('input', filterConversaciones);
    }
    
    // Nuevo mensaje
    const newMessageInput = document.getElementById('newMessageInput');
    if (newMessageInput) {
        newMessageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });
        
        newMessageInput.addEventListener('input', function() {
            const length = this.value.length;
            const counter = document.getElementById('charCounter');
            if (counter) {
                counter.textContent = `${length}/150`;
                counter.style.color = length > 130 ? '#e74c3c' : length > 100 ? '#f39c12' : '#7f8c8d';
            }
        });
    }
    
    // Botón enviar
    const sendButton = document.getElementById('sendMessageBtn');
    if (sendButton) {
        sendButton.addEventListener('click', enviarMensaje);
    }
    
    // Botón nuevo chat
    const newChatButton = document.querySelector('.btn-new-chat');
    if (newChatButton) {
        newChatButton.addEventListener('click', openNewChatModal);
    }
    
    console.log('✅ Event listeners de mensajes configurados');
}

// ========== CONVERSACIONES ==========
async function loadConversaciones() {
    if (!currentUserMessages || !currentUserMessages._id) {
        console.error('❌ No hay usuario para cargar conversaciones');
        return;
    }
    
    try {
        console.log('📋 Cargando conversaciones para:', currentUserMessages._id);
        const response = await fetch(`${MESSAGES_API}/conversaciones/${currentUserMessages._id}`);
        const result = await response.json();
        
        if (result.success) {
            conversaciones = result.data;
            displayConversaciones(conversaciones);
        } else {
            console.error('❌ Error en respuesta:', result.error);
        }
    } catch (error) {
        console.error('❌ Error cargando conversaciones:', error);
    }
}

function displayConversaciones(conversacionesList) {
    const container = document.getElementById('conversationsList');
    if (!container) {
        console.error('❌ Container de conversaciones no encontrado');
        return;
    }
    
    if (conversacionesList.length === 0) {
        container.innerHTML = `
            <div class="empty-conversations">
                <i class="fas fa-comments"></i>
                <h3>No hay conversaciones</h3>
                <p>Inicia una nueva conversación para comenzar a chatear</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = conversacionesList.map(conv => createConversacionHTML(conv)).join('');
    
    // Agregar event listeners
    conversacionesList.forEach(conv => {
        const element = document.getElementById(`conversacion-${conv._id}`);
        if (element) {
            element.addEventListener('click', () => openConversacion(conv));
        }
    });
}

function createConversacionHTML(conversacion) {
    if (!conversacion.participantes || !currentUserMessages) {
        return '';
    }
    
    const otroUsuario = conversacion.participantes.find(p => p._id !== currentUserMessages._id);
    if (!otroUsuario) return '';
    
    const ultimoMensaje = conversacion.ultimo_mensaje;
    const mensajeCorto = ultimoMensaje ? 
        (ultimoMensaje.contenido.length > 40 ? 
         ultimoMensaje.contenido.substring(0, 40) + '...' : 
         ultimoMensaje.contenido) : 
        'Inicia la conversación';
    
    const timeAgo = ultimoMensaje ? getMessageTimeAgo(ultimoMensaje.fecha_envio) : '';
    const isUnread = ultimoMensaje && !ultimoMensaje.leido && ultimoMensaje.remitente.toString() !== currentUserMessages._id;
    
    return `
        <div class="conversacion-item ${isUnread ? 'unread' : ''}" id="conversacion-${conversacion._id}">
            <div class="conversacion-avatar">
                ${otroUsuario.foto_perfil ? 
                    `<img src="${otroUsuario.foto_perfil}" alt="${otroUsuario.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="conversacion-info">
                <div class="conversacion-header">
                    <h4>${otroUsuario.nombre}</h4>
                    <span class="conversacion-time">${timeAgo}</span>
                </div>
                <div class="conversacion-preview">
                    <p class="last-message">${mensajeCorto}</p>
                    ${isUnread ? '<span class="unread-badge"></span>' : ''}
                </div>
            </div>
        </div>
    `;
}

function filterConversaciones() {
    const searchTerm = document.getElementById('searchConversations').value.toLowerCase();
    const filtered = conversaciones.filter(conv => {
        const otroUsuario = conv.participantes.find(p => p._id !== currentUserMessages._id);
        return otroUsuario && (
            otroUsuario.nombre.toLowerCase().includes(searchTerm) || 
            otroUsuario.username.toLowerCase().includes(searchTerm)
        );
    });
    displayConversaciones(filtered);
}

// ========== MEJORAR CARGA DE CONVERSACIONES ==========
let lastConversacionesHash = ''; // 🔥 Track del estado anterior

async function loadConversaciones() {
    if (!currentUserMessages || !currentUserMessages._id) {
        return;
    }
    
    if (window.isLoadingConversaciones) {
        return;
    }
    
    try {
        window.isLoadingConversaciones = true;
        
        const response = await fetch(`${MESSAGES_API}/conversaciones/${currentUserMessages._id}`);
        const result = await response.json();
        
        if (result.success) {
            // 🔥 DETECCIÓN DE CAMBIOS MÁS EFECTIVA
            const newHash = JSON.stringify(result.data);
            if (newHash !== lastConversacionesHash) {
                conversaciones = result.data;
                lastConversacionesHash = newHash;
                displayConversaciones(conversaciones);
                console.log('✅ Conversaciones actualizadas');
            }
        }
    } catch (error) {
        console.error('❌ Error cargando conversaciones:', error);
    } finally {
        window.isLoadingConversaciones = false;
    }
}


// ========== MENSAJES ==========
async function openConversacion(conversacion) {
    currentConversacion = conversacion;
    
    // Actualizar UI
    document.querySelectorAll('.conversacion-item').forEach(item => {
        item.classList.remove('active');
    });
    const currentElement = document.getElementById(`conversacion-${conversacion._id}`);
    if (currentElement) {
        currentElement.classList.add('active');
    }
    
    // Cargar mensajes
    await loadMensajes(conversacion._id);
    
    // Marcar como leídos
    await marcarMensajesLeidos(conversacion._id);
    
    // Actualizar conversaciones
    loadConversaciones();
}

async function loadMensajes(conversacionId) {
    try {
        const response = await fetch(`${MESSAGES_API}/conversacion/${conversacionId}/mensajes?currentUserId=${currentUserMessages._id}`);
        const result = await response.json();
        
        if (result.success) {
            displayMensajes(result.data);
        }
    } catch (error) {
        console.error('Error cargando mensajes:', error);
    }
}

function displayMensajes(mensajes) {
    const container = document.getElementById('messagesContainer');
    if (!container || !currentConversacion) return;
    
    const otroUsuario = currentConversacion.participantes.find(p => p._id !== currentUserMessages._id);
    if (!otroUsuario) return;
    
    // ACTUALIZAR HEADER COMPLETO CON AVATAR
    updateChatHeader(otroUsuario);
    
    if (mensajes.length === 0) {
        container.innerHTML = `
            <div class="empty-messages">
                <i class="fas fa-comment-slash"></i>
                <h3>No hay mensajes aún</h3>
                <p>Envía el primer mensaje para comenzar la conversación</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = mensajes.map(msg => createMensajeHTML(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

// NUEVA FUNCIÓN PARA ACTUALIZAR EL HEADER DEL CHAT
function updateChatHeader(otroUsuario) {
    console.log('🔄 Actualizando header del chat con usuario:', otroUsuario);
    
    // Buscar el avatar del header por múltiples selectores
    let chatAvatar = document.querySelector('.chat-user-avatar');
    
    // Si no se encuentra, buscar por otras clases comunes
    if (!chatAvatar) {
        chatAvatar = document.querySelector('.chat-header-avatar');
    }
    if (!chatAvatar) {
        chatAvatar = document.querySelector('.current-chat-avatar');
    }
    if (!chatAvatar) {
        // Buscar por estructura del DOM
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatAvatar = chatHeader.querySelector('.user-avatar');
        }
    }
    
    // Actualizar el avatar si se encontró - HACERLO CLICKEABLE
    if (chatAvatar) {
        if (otroUsuario.foto_perfil) {
            chatAvatar.innerHTML = `
                <img src="${otroUsuario.foto_perfil}" 
                     alt="${otroUsuario.nombre}" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; cursor: pointer;"
                     onclick="navigateToUserProfile('${otroUsuario._id}')">
            `;
        } else {
            chatAvatar.innerHTML = `
                <i class="fas fa-user" 
                   style="cursor: pointer;" 
                   onclick="navigateToUserProfile('${otroUsuario._id}')"></i>
            `;
        }
        chatAvatar.style.cursor = 'pointer';
        chatAvatar.setAttribute('onclick', `navigateToUserProfile('${otroUsuario._id}')`);
        console.log('✅ Avatar actualizado en el header (clickeable)');
    } else {
        console.error('❌ No se pudo encontrar el elemento del avatar en el header');
    }
    
    // Actualizar nombre y username - HACERLOS CLICKEABLES
    const currentChatUser = document.getElementById('currentChatUser');
    const currentChatUsername = document.getElementById('currentChatUsername');
    
    if (currentChatUser) {
        currentChatUser.textContent = otroUsuario.nombre;
        currentChatUser.style.cursor = 'pointer';
        currentChatUser.style.color = '#3498db';
        currentChatUser.setAttribute('onclick', `navigateToUserProfile('${otroUsuario._id}')`);
        console.log('✅ Nombre actualizado (clickeable):', otroUsuario.nombre);
    } else {
        console.error('❌ Elemento currentChatUser no encontrado');
    }
    
    if (currentChatUsername) {
        currentChatUsername.textContent = `@${otroUsuario.username}`;
        currentChatUsername.style.cursor = 'pointer';
        currentChatUsername.style.color = '#7f8c8d';
        currentChatUsername.setAttribute('onclick', `navigateToUserProfile('${otroUsuario._id}')`);
        console.log('✅ Username actualizado (clickeable):', otroUsuario.username);
    } else {
        console.error('❌ Elemento currentChatUsername no encontrado');
    }
    
    // AGREGAR EVENTO AL HEADER COMPLETO SI ES NECESARIO
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader && !chatHeader.hasAttribute('data-profile-click-initialized')) {
        chatHeader.style.cursor = 'pointer';
        chatHeader.setAttribute('data-profile-click-initialized', 'true');
        chatHeader.addEventListener('click', function(e) {
            // Evitar que se active cuando se hace clic en otros elementos del header
            if (!e.target.closest('.chat-actions') && !e.target.closest('.btn-icon')) {
                navigateToUserProfile(otroUsuario._id);
            }
        });
    }
}

// FUNCIÓN PARA NAVEGAR AL PERFIL DEL USUARIO
function navigateToUserProfile(userId) {
    console.log('🎯 Navegando al perfil de usuario:', userId);
    
    // Verificar si el usuario está bloqueado antes de navegar
    if (typeof checkIfUserIsBlocked === 'function') {
        checkIfUserIsBlocked(userId).then(isBlocked => {
            if (isBlocked) {
                if (typeof showBlockedUserModal === 'function') {
                    showBlockedUserModal(userId);
                } else {
                    showMessageToast('❌ No puedes ver este perfil', 'error');
                }
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
    } else {
        // Si no existe la función de verificación, navegar directamente
        localStorage.setItem('viewingUserProfile', userId);
        window.location.href = 'profile.html';
    }
}

function createMensajeHTML(mensaje) {
    const isOwnMessage = mensaje.remitente._id === currentUserMessages._id;
    
    // Obtener el usuario correcto para mostrar la foto
    const usuarioMensaje = isOwnMessage ? currentUserMessages : mensaje.remitente;
    
    return `
        <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
            ${!isOwnMessage ? `
                <div class="message-avatar">
                    ${usuarioMensaje.foto_perfil ? 
                        `<img src="${usuarioMensaje.foto_perfil}" alt="${usuarioMensaje.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
            ` : ''}
            
            <div class="message-content">
                <div class="message-text">${mensaje.contenido}</div>
                <div class="message-time">
                    ${new Date(mensaje.fecha_envio).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                    ${mensaje.leido && isOwnMessage ? '<i class="fas fa-check-double read-indicator"></i>' : ''}
                </div>
            </div>
            
            ${isOwnMessage ? `
                <div class="message-avatar own-avatar">
                    ${usuarioMensaje.foto_perfil ? 
                        `<img src="${usuarioMensaje.foto_perfil}" alt="${usuarioMensaje.nombre}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
            ` : ''}
        </div>
    `;
}

async function enviarMensaje() {
    const input = document.getElementById('newMessageInput');
    const contenido = input.value.trim();
    
    if (!contenido || !currentConversacion) return;
    
    if (contenido.length > 150) {
        showMessageToast('❌ El mensaje no puede tener más de 150 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${MESSAGES_API}/mensaje/enviar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversacionId: currentConversacion._id,
                remitenteId: currentUserMessages._id,
                contenido: contenido
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            input.value = '';
            const charCounter = document.getElementById('charCounter');
            if (charCounter) charCounter.textContent = '0/150';
            
            // Agregar mensaje a la UI
            const mensajesContainer = document.getElementById('messagesContainer');
            const emptyState = mensajesContainer.querySelector('.empty-messages');
            if (emptyState) {
                emptyState.remove();
            }
            
            mensajesContainer.innerHTML += createMensajeHTML(result.data);
            mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
            
            // Actualizar conversaciones
            loadConversaciones();
            
            showMessageToast('✅ Mensaje enviado', 'success');
        }
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showMessageToast('❌ Error al enviar el mensaje', 'error');
    }
}

async function marcarMensajesLeidos(conversacionId) {
    try {
        await fetch(`${MESSAGES_API}/mensajes/marcar-leidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversacionId: conversacionId,
                userId: currentUserMessages._id
            })
        });
    } catch (error) {
        console.error('Error marcando mensajes como leídos:', error);
    }
}

// ========== NUEVO CHAT ==========
async function openNewChatModal() {
    try {
        const response = await fetch(`${MESSAGES_API}/usuarios-disponibles/${currentUserMessages._id}`);
        const result = await response.json();
        
        if (result.success) {
            showNewChatModal(result.data);
        }
    } catch (error) {
        console.error('Error cargando usuarios disponibles:', error);
        showMessageToast('❌ Error al cargar usuarios', 'error');
    }
}

function showNewChatModal(usuarios) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'newChatModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus"></i> Nuevo Chat</h3>
                <span class="close-modal" onclick="closeNewChatModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="search-users">
                    <input type="text" id="searchUsersChat" placeholder="Buscar usuarios..." class="search-input">
                </div>
                <div class="users-list-chat" id="usersListChat">
                    ${usuarios.map(user => createUserChatItemHTML(user)).join('')}
                </div>
                ${usuarios.length === 0 ? `
                    <div class="empty-users">
                        <i class="fas fa-users-slash"></i>
                        <p>No hay usuarios disponibles para chatear</p>
                        <small>Solo puedes chatear con usuarios que te siguen y tú sigues</small>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    openMessageModal('newChat');
    
    // Event listeners para búsqueda
    const searchInput = document.getElementById('searchUsersChat');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filtered = usuarios.filter(user => 
                user.nombre.toLowerCase().includes(searchTerm) || 
                user.username.toLowerCase().includes(searchTerm)
            );
            const usersList = document.getElementById('usersListChat');
            if (usersList) {
                usersList.innerHTML = filtered.map(user => createUserChatItemHTML(user)).join('');
            }
        });
    }
    
    // Event listeners para items de usuario
    usuarios.forEach(user => {
        const element = document.getElementById(`user-chat-${user._id}`);
        if (element) {
            element.addEventListener('click', () => startNewChat(user));
        }
    });
}

function createUserChatItemHTML(user) {
    return `
        <div class="user-chat-item" id="user-chat-${user._id}">
            <div class="user-chat-avatar">
                ${user.foto_perfil ? 
                    `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="user-chat-info">
                <h4>${user.nombre}</h4>
                <p>@${user.username}</p>
            </div>
            <div class="user-chat-action">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `;
}

async function startNewChat(user) {
    if (isStartingNewChat) {
        console.log('⏳ Ya se está iniciando un chat, omitiendo...');
        return;
    }

    const userElement = document.getElementById(`user-chat-${user._id}`);
    
    try {
        isStartingNewChat = true;
        
        // Feedback visual
        if (userElement) {
            userElement.style.pointerEvents = 'none';
            userElement.style.opacity = '0.6';
            userElement.querySelector('.user-chat-action').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        console.log('🔄 Iniciando nuevo chat con:', user.nombre);
        
        const response = await fetch(`${MESSAGES_API}/conversacion/nueva`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario1Id: currentUserMessages._id,
                usuario2Id: user._id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Conversación procesada:', result.data._id, result.message);
            closeNewChatModal();
            showMessageToast(result.message, 'success');
            
            // Pequeño delay para UI
            setTimeout(() => {
                openConversacion(result.data);
                // 🔥 ACTUALIZAR CONVERSACIONES DESPUÉS DE CREAR NUEVA
                setTimeout(() => loadConversaciones(), 1000);
            }, 300);
        } else {
            console.error('❌ Error del servidor:', result.error);
            showMessageToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error de red iniciando chat:', error);
        showMessageToast('❌ Error de conexión', 'error');
    } finally {
        isStartingNewChat = false;
        
        // Restaurar UI
        if (userElement) {
            setTimeout(() => {
                userElement.style.pointerEvents = 'auto';
                userElement.style.opacity = '1';
                userElement.querySelector('.user-chat-action').innerHTML = '<i class="fas fa-chevron-right"></i>';
            }, 1000);
        }
    }
}


function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
}

// ========== UTILIDADES ==========
function getMessageTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    
    return new Date(date).toLocaleDateString();
}

function showMessageToast(message, type = 'success') {
    if (window.showToast && typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function openMessageModal(type) {
    if (window.openModal && typeof window.openModal === 'function') {
        window.openModal(type);
    }
}

// ========== LIMPIAR AL SALIR ==========
function cleanupMessages() {
    if (mensajesInterval) {
        clearInterval(mensajesInterval);
        mensajesInterval = null;
    }
    isMessagesInitialized = false;
}

// ========== DEBUG ==========
function debugConversaciones() {
    console.log('🐛 DEBUG CONVERSACIONES:');
    console.log('- Total conversaciones:', conversaciones.length);
    console.log('- Conversaciones actuales:', conversaciones.map(c => ({
        id: c._id,
        participantes: c.participantes.map(p => p.nombre),
        ultimoMensaje: c.ultimo_mensaje ? c.ultimo_mensaje.contenido : 'Ninguno'
    })));
    console.log('- CurrentConversacion:', currentConversacion ? currentConversacion._id : 'Ninguna');
    console.log('- isLoadingConversaciones:', window.isLoadingConversaciones);
    console.log('- isStartingNewChat:', isStartingNewChat);
}

// Ejecutar en consola para debug
window.debugMessages = debugConversaciones;

// Hacer funciones disponibles globalmente
window.initializeMessages = initializeMessages;
window.openNewChatModal = openNewChatModal;
window.closeNewChatModal = closeNewChatModal;
window.cleanupMessages = cleanupMessages;

console.log('✅ messages.js completamente cargado y funciones disponibles');