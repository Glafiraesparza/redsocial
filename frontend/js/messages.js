// frontend/js/messages.js
console.log('📦 messages.js cargado');

const MESSAGES_API = 'http://localhost:3001/api/messages';
const USERS_API = 'http://localhost:3001/api/users';

// Variables globales específicas de mensajes
let currentConversacion = null;
let currentUserMessages = null;
let conversaciones = [];
let mensajesInterval = null;
let isMessagesInitialized = false;
let isStartingNewChat = false;
let isUserBlocked = false;
let blockStatus = null;

// ========== INICIALIZACIÓN ==========
function initializeMessages() {
    console.log('💬 Inicializando mensajes...');
    
    if (isMessagesInitialized) {
        console.log('⚠️ Mensajes ya inicializados, omitiendo...');
        return;
    }
    
    try {
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
    
    const searchInput = document.getElementById('searchConversations');
    if (searchInput) {
        searchInput.addEventListener('input', filterConversaciones);
    }
    
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
    
    const sendButton = document.getElementById('sendMessageBtn');
    if (sendButton) {
        sendButton.addEventListener('click', enviarMensaje);
    }
    
    const newChatButton = document.querySelector('.btn-new-chat');
    if (newChatButton) {
        newChatButton.addEventListener('click', openNewChatModal);
    }
    
    console.log('✅ Event listeners de mensajes configurados');
}

// ========== VERIFICACIÓN DE BLOQUEOS ==========
async function checkBlockStatus(conversacion) {
    if (!conversacion || !conversacion.participantes || !currentUserMessages) {
        return { isBlocked: false, status: null };
    }
    
    const otroUsuario = conversacion.participantes.find(p => p._id !== currentUserMessages._id);
    if (!otroUsuario) {
        return { isBlocked: false, status: null };
    }
    
    try {
        console.log('🔍 Verificando estado de bloqueo con usuario:', otroUsuario._id);
        
        const response = await fetch(`${USERS_API}/check-block-status/${currentUserMessages._id}/${otroUsuario._id}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Estado de bloqueo:', result.data);
            return {
                isBlocked: result.data.isBlocked,
                status: result.data.status,
                blockedBy: result.data.blockedBy
            };
        }
    } catch (error) {
        console.error('❌ Error verificando estado de bloqueo:', error);
    }
    
    return { isBlocked: false, status: null };
}

function updateUIForBlockedUser(blockStatus) {
    const messageInput = document.getElementById('newMessageInput');
    const sendButton = document.getElementById('sendMessageBtn');
    const charCounter = document.getElementById('charCounter');
    
    // Crear o obtener el elemento de mensaje de bloqueo
    let blockedMessage = document.getElementById('blockedMessage');
    if (!blockedMessage) {
        blockedMessage = document.createElement('div');
        blockedMessage.id = 'blockedMessage';
        blockedMessage.className = 'blocked-message';
        
        // Insertar después del input de mensaje
        const messageInputContainer = messageInput?.parentElement;
        if (messageInputContainer) {
            messageInputContainer.parentNode.insertBefore(blockedMessage, messageInputContainer.nextSibling);
        }
    }
    
    if (!blockStatus.isBlocked) {
        // Usuario no bloqueado - habilitar UI
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = "Escribe un mensaje...";
        }
        if (sendButton) sendButton.disabled = false;
        if (charCounter) charCounter.style.display = 'block';
        if (blockedMessage) blockedMessage.style.display = 'none';
        isUserBlocked = false;
        return;
    }
    
    // Usuario bloqueado - deshabilitar UI
    isUserBlocked = true;
    
    let messageText = '';
    let messageType = '';
    
    switch (blockStatus.status) {
        case 'tu_has_bloqueado':
            messageText = 'No puedes mandar mensajes porque has bloqueado a este usuario';
            messageType = 'you-blocked';
            break;
        case 'te_han_bloqueado':
            messageText = 'No puedes mandar mensajes porque este usuario te bloqueó';
            messageType = 'they-blocked';
            break;
        case 'bloqueo_mutuo':
            messageText = 'No puedes mandar mensajes debido a un bloqueo mutuo';
            messageType = 'mutual-block';
            break;
        default:
            messageText = 'No puedes mandar mensajes a este usuario';
            messageType = 'generic-block';
    }
    
    // Actualizar UI
    if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = "No puedes enviar mensajes...";
        messageInput.value = '';
    }
    if (sendButton) sendButton.disabled = true;
    if (charCounter) charCounter.style.display = 'none';
    
    // Mostrar mensaje de bloqueo
    blockedMessage.innerHTML = `
        <div class="blocked-alert ${messageType}">
            <i class="fas fa-ban"></i>
            <span>${messageText}</span>
        </div>
    `;
    blockedMessage.style.display = 'block';
}

// ========== CONVERSACIONES ==========
let lastConversacionesHash = '';

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
    
    // Verificar estado de bloqueo ANTES de cargar mensajes
    blockStatus = await checkBlockStatus(conversacion);
    console.log('🔍 Estado de bloqueo al abrir conversación:', blockStatus);
    
    // Actualizar UI basado en el bloqueo
    updateUIForBlockedUser(blockStatus);
    
    // Cargar mensajes
    await loadMensajes(conversacion._id);
    
    // Marcar como leídos solo si no está bloqueado
    if (!blockStatus.isBlocked) {
        await marcarMensajesLeidos(conversacion._id);
    }
    
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

function updateChatHeader(otroUsuario) {
    console.log('🔄 Actualizando header del chat con usuario:', otroUsuario);
    
    let chatAvatar = document.querySelector('.chat-user-avatar');
    if (!chatAvatar) {
        chatAvatar = document.querySelector('.chat-header-avatar');
    }
    if (!chatAvatar) {
        chatAvatar = document.querySelector('.current-chat-avatar');
    }
    if (!chatAvatar) {
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatAvatar = chatHeader.querySelector('.user-avatar');
        }
    }
    
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
    }
    
    const currentChatUser = document.getElementById('currentChatUser');
    const currentChatUsername = document.getElementById('currentChatUsername');
    
    if (currentChatUser) {
        currentChatUser.textContent = otroUsuario.nombre;
        currentChatUser.style.cursor = 'pointer';
        currentChatUser.style.color = '#3498db';
        currentChatUser.setAttribute('onclick', `navigateToUserProfile('${otroUsuario._id}')`);
    }
    
    if (currentChatUsername) {
        currentChatUsername.textContent = `@${otroUsuario.username}`;
        currentChatUsername.style.cursor = 'pointer';
        currentChatUsername.style.color = '#7f8c8d';
        currentChatUsername.setAttribute('onclick', `navigateToUserProfile('${otroUsuario._id}')`);
    }
    
    // Agregar indicador de bloqueo en el header si es necesario
    updateBlockStatusInHeader(blockStatus);
}

function updateBlockStatusInHeader(blockStatus) {
    const chatHeader = document.querySelector('.chat-header');
    if (!chatHeader) return;
    
    // Remover indicador anterior si existe
    const existingIndicator = chatHeader.querySelector('.block-status-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    if (blockStatus.isBlocked) {
        const indicator = document.createElement('div');
        indicator.className = 'block-status-indicator';
        
        let indicatorText = '';
        let indicatorClass = '';
        
        switch (blockStatus.status) {
            case 'tu_has_bloqueado':
                indicatorText = 'Has bloqueado a este usuario';
                indicatorClass = 'you-blocked';
                break;
            case 'te_han_bloqueado':
                indicatorText = 'Este usuario te ha bloqueado';
                indicatorClass = 'they-blocked';
                break;
            case 'bloqueo_mutuo':
                indicatorText = 'Bloqueo mutuo';
                indicatorClass = 'mutual-block';
                break;
        }
        
        indicator.innerHTML = `
            <span class="block-indicator ${indicatorClass}">
                <i class="fas fa-ban"></i>
                ${indicatorText}
            </span>
        `;
        
        // Insertar después del nombre de usuario
        const userInfo = chatHeader.querySelector('.chat-user-info');
        if (userInfo) {
            userInfo.appendChild(indicator);
        }
    }
}

function createMensajeHTML(mensaje) {
    const isOwnMessage = mensaje.remitente._id === currentUserMessages._id;
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
    // Verificar si el usuario está bloqueado antes de enviar
    if (isUserBlocked) {
        showMessageToast('❌ No puedes enviar mensajes a este usuario', 'error');
        return;
    }
    
    const input = document.getElementById('newMessageInput');
    const contenido = input.value.trim();
    
    if (!contenido || !currentConversacion) return;
    
    if (contenido.length > 150) {
        showMessageToast('❌ El mensaje no puede tener más de 150 caracteres', 'error');
        return;
    }
    
    try {
        // Verificar bloqueo nuevamente antes de enviar (por si acaso)
        const currentBlockStatus = await checkBlockStatus(currentConversacion);
        if (currentBlockStatus.isBlocked) {
            updateUIForBlockedUser(currentBlockStatus);
            showMessageToast('❌ No puedes enviar mensajes a este usuario', 'error');
            return;
        }
        
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
            
            const mensajesContainer = document.getElementById('messagesContainer');
            const emptyState = mensajesContainer.querySelector('.empty-messages');
            if (emptyState) {
                emptyState.remove();
            }
            
            mensajesContainer.innerHTML += createMensajeHTML(result.data);
            mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
            
            loadConversaciones();
            
            showMessageToast('✅ Mensaje enviado', 'success');
        } else {
            showMessageToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showMessageToast('❌ Error al enviar el mensaje', 'error');
    }
}

// ========== NUEVO CHAT ==========
async function openNewChatModal() {
    try {
        const response = await fetch(`${MESSAGES_API}/usuarios-disponibles/${currentUserMessages._id}`);
        const result = await response.json();
        
        if (result.success) {
            // Verificar bloqueos para cada usuario antes de mostrar
            const usuariosConEstado = await Promise.all(
                result.data.map(async (user) => {
                    const blockStatus = await checkBlockStatus({
                        participantes: [currentUserMessages, user]
                    });
                    return {
                        ...user,
                        isBlocked: blockStatus.isBlocked,
                        blockStatus: blockStatus.status
                    };
                })
            );
            
            showNewChatModal(usuariosConEstado);
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
    
    usuarios.forEach(user => {
        const element = document.getElementById(`user-chat-${user._id}`);
        if (element) {
            element.addEventListener('click', () => {
                if (user.isBlocked) {
                    showMessageToast('❌ No puedes chatear con un usuario bloqueado', 'error');
                    return;
                }
                startNewChat(user);
            });
        }
    });
}

function createUserChatItemHTML(user) {
    const blockedBadge = user.isBlocked ? 
        `<div class="blocked-badge" title="${user.blockStatus === 'tu_has_bloqueado' ? 'Has bloqueado a este usuario' : 'Este usuario te ha bloqueado'}">
            <i class="fas fa-ban"></i>
            Bloqueado
        </div>` : '';
    
    return `
        <div class="user-chat-item ${user.isBlocked ? 'blocked-user' : ''}" id="user-chat-${user._id}">
            <div class="user-chat-avatar">
                ${user.foto_perfil ? 
                    `<img src="${user.foto_perfil}" alt="${user.nombre}">` : 
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="user-chat-info">
                <h4>${user.nombre} ${user.isBlocked ? '🚫' : ''}</h4>
                <p>@${user.username}</p>
            </div>
            <div class="user-chat-action">
                ${blockedBadge}
                ${!user.isBlocked ? '<i class="fas fa-chevron-right"></i>' : ''}
            </div>
        </div>
    `;
}

// ========== FUNCIONES RESTANTES (sin cambios) ==========
async function startNewChat(user) {
    if (isStartingNewChat) {
        console.log('⏳ Ya se está iniciando un chat, omitiendo...');
        return;
    }

    const userElement = document.getElementById(`user-chat-${user._id}`);
    
    try {
        isStartingNewChat = true;
        
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
            
            setTimeout(() => {
                openConversacion(result.data);
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
        
        if (userElement) {
            setTimeout(() => {
                userElement.style.pointerEvents = 'auto';
                userElement.style.opacity = '1';
                userElement.querySelector('.user-chat-action').innerHTML = '<i class="fas fa-chevron-right"></i>';
            }, 1000);
        }
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

function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
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

function cleanupMessages() {
    if (mensajesInterval) {
        clearInterval(mensajesInterval);
        mensajesInterval = null;
    }
    isMessagesInitialized = false;
}

function navigateToUserProfile(userId) {
    console.log('🎯 Navegando al perfil de usuario:', userId);
    
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
            
            localStorage.setItem('viewingUserProfile', userId);
            window.location.href = 'profile.html';
        }).catch(error => {
            console.error('Error verificando bloqueo:', error);
            localStorage.setItem('viewingUserProfile', userId);
            window.location.href = 'profile.html';
        });
    } else {
        localStorage.setItem('viewingUserProfile', userId);
        window.location.href = 'profile.html';
    }
}

// Hacer funciones disponibles globalmente
window.initializeMessages = initializeMessages;
window.openNewChatModal = openNewChatModal;
window.closeNewChatModal = closeNewChatModal;
window.cleanupMessages = cleanupMessages;

console.log('✅ messages.js completamente cargado y funciones disponibles');