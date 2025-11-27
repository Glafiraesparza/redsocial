// frontend/js/auth.js
const API_URL_AUTH = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : 'https://redsocial-cj60.onrender.com/api';

console.log('🌐 API URL configurada:', API_URL_AUTH); 

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Inicializando Kion-D...');
    
    // Inicializar event listeners
    initializeModals();
    initializeForms();
    initializeNavbar();
    initializeDateLimits();
}

// Funciones para modales - VERSIÓN MEJORADA
function initializeModals() {
    console.log('🔧 Configurando modales...');
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Prevenir que el click se propague al modal background
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(content => {
        content.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
}

function openModal(type) {
    console.log(`📱 Abriendo modal: ${type}`);
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 300);
    }
}

function closeModal(type) {
    console.log(`📱 Cerrando modal: ${type}`);
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            document.getElementById(`${type}Form`).reset();
        }, 300);
    }
}

function closeAllModals() {
    console.log('📱 Cerrando todos los modales');
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    });
}

// Cerrar modal al hacer clic fuera del contenido
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeAllModals();
    }
});

// REEMPLAZA ESTA FUNCIÓN COMPLETAMENTE:
function initializeDateLimits() {
    const fechaNacimientoInput = document.getElementById('regFechaNacimiento');
    
    if (fechaNacimientoInput) {
        // Calcular fechas límite manualmente
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        
        // Configurar input de fecha nativo con mejoras
        fechaNacimientoInput.type = 'date';
        fechaNacimientoInput.max = maxDate.toISOString().split('T')[0];
        fechaNacimientoInput.min = minDate.toISOString().split('T')[0];
        fechaNacimientoInput.setAttribute('placeholder', 'Selecciona tu fecha de nacimiento');
        
        // Agregar estilos CSS personalizados
        fechaNacimientoInput.style.padding = '12px';
        fechaNacimientoInput.style.border = '2px solid #e9ecef';
        fechaNacimientoInput.style.borderRadius = '8px';
        fechaNacimientoInput.style.fontSize = '16px';
        fechaNacimientoInput.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        fechaNacimientoInput.style.width = '100%';
        fechaNacimientoInput.style.cursor = 'pointer';
        
        // Efectos hover y focus
        fechaNacimientoInput.addEventListener('mouseenter', function() {
            this.style.borderColor = '#3498db';
            this.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
        });
        
        fechaNacimientoInput.addEventListener('mouseleave', function() {
            if (!this.matches(':focus')) {
                this.style.borderColor = '#e9ecef';
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            }
        });
        
        fechaNacimientoInput.addEventListener('focus', function() {
            this.style.borderColor = '#2ecc71';
            this.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
            this.style.outline = 'none';
        });
        
        fechaNacimientoInput.addEventListener('blur', function() {
            this.style.borderColor = '#e9ecef';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        });
        
        // Validación en tiempo real
        fechaNacimientoInput.addEventListener('change', function() {
            validateBirthDate(this);
        });
        
        console.log('✅ Selector de fecha nativo configurado correctamente');
    }
}

// AGREGA ESTA FUNCIÓN DE VALIDACIÓN:
function validateBirthDate(input) {
    const selectedDate = new Date(input.value);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    const maxAgeDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    if (selectedDate > minAgeDate) {
        input.style.borderColor = '#e74c3c';
        input.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
        showToast('❌ Debes tener al menos 13 años para registrarte', 'error');
    } else if (selectedDate < maxAgeDate) {
        input.style.borderColor = '#e74c3c';
        input.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
        showToast('❌ Por favor ingresa una fecha de nacimiento válida', 'error');
    } else {
        input.style.borderColor = '#2ecc71';
        input.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
    }
}

// Navbar functionality
function initializeNavbar() {
    console.log('🔧 Configurando navbar...');
    
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.addEventListener('click', function(event) {
            event.stopPropagation();
            const content = this.querySelector('.dropdown-content');
            if (content) {
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    
    document.addEventListener('click', function() {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    });
}

// Form functionality
function initializeForms() {
    console.log('🔧 Configurando formularios...');
    
    // Registro de usuario
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        
        // Validación en tiempo real para username
        const usernameInput = document.getElementById('regUsername');
        if (usernameInput) {
            usernameInput.addEventListener('input', validateUsername);
        }
        
        // Validación en tiempo real para nombre
        const nombreInput = document.getElementById('regNombre');
        if (nombreInput) {
            nombreInput.addEventListener('input', validateNombre);
        }
    }
    
    // Login de usuario
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Validación en tiempo real para confirmar contraseña
    const confirmPasswordInput = document.getElementById('regConfirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
}

// Validar caracteres del username
function validateUsername() {
    const usernameInput = document.getElementById('regUsername');
    const username = usernameInput.value;
    const invalidChars = /[^a-zA-Z0-9_]/;
    
    let isValid = true;
    let errorMessage = '';
    
    // Validar longitud
    if (username.length > 0 && username.length < 3) {
        isValid = false;
        errorMessage = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (username.length > 20) {
        isValid = false;
        errorMessage = 'El nombre de usuario no puede tener más de 20 caracteres';
    }
    // Validar caracteres inválidos
    else if (invalidChars.test(username)) {
        isValid = false;
        errorMessage = 'El nombre de usuario no puede contener espacios ni caracteres especiales (@, #, $, etc.)';
    }
    
    // Aplicar estilos
    if (!isValid && username.length > 0) {
        usernameInput.style.borderColor = '#e74c3c';
        usernameInput.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
        if (errorMessage) {
            showToast(errorMessage, 'error');
        }
    } else if (username.length >= 3 && username.length <= 20 && !invalidChars.test(username)) {
        usernameInput.style.borderColor = '#2ecc71';
        usernameInput.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
    } else {
        usernameInput.style.borderColor = '#e9ecef';
        usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    }
    
    return isValid;
}

// Validar nombre completo
function validateNombre() {
    const nombreInput = document.getElementById('regNombre');
    const nombre = nombreInput.value.trim();
    
    let isValid = true;
    let errorMessage = '';
    
    // Validar que no esté vacío
    if (nombre.length === 0) {
        isValid = false;
        errorMessage = 'El nombre completo no puede estar vacío';
    }
    // Validar longitud máxima
    else if (nombre.length > 40) {
        isValid = false;
        errorMessage = 'El nombre completo no puede tener más de 40 caracteres';
    }
    // Validar que tenga al menos nombre y apellido (opcional pero recomendado)
    else if (nombre.split(' ').length < 2) {
        // Esto es solo una sugerencia, no un error
        nombreInput.style.borderColor = '#f39c12';
        nombreInput.style.backgroundColor = 'rgba(243, 156, 18, 0.05)';
        return true;
    }
    
    // Aplicar estilos
    if (!isValid && nombre.length > 0) {
        nombreInput.style.borderColor = '#e74c3c';
        nombreInput.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
        if (errorMessage) {
            showToast(errorMessage, 'error');
        }
    } else if (nombre.length > 0 && nombre.length <= 40) {
        nombreInput.style.borderColor = '#2ecc71';
        nombreInput.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
    } else {
        nombreInput.style.borderColor = '#e9ecef';
        nombreInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    }
    
    return isValid;
}

// Validar que las contraseñas coincidan
function validatePasswordMatch() {
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const confirmInput = document.getElementById('regConfirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#e74c3c';
        confirmInput.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
    } else if (confirmPassword) {
        confirmInput.style.borderColor = '#2ecc71';
        confirmInput.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
    } else {
        confirmInput.style.borderColor = '#e9ecef';
        confirmInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('📝 Procesando registro...');
    
    // Validar username primero
    if (!validateUsername()) {
        showToast('❌ Por favor corrige el nombre de usuario', 'error');
        return;
    }
    
    // Validar nombre
    if (!validateNombre()) {
        showToast('❌ Por favor corrige el nombre completo', 'error');
        return;
    }
    
    const userData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nombre: document.getElementById('regNombre').value.trim(), // trim para quitar espacios extra
        fecha_nacimiento: document.getElementById('regFechaNacimiento').value,
        genero: document.getElementById('regGenero').value
    };
    
    // Validaciones de longitud específicas
    if (userData.username.length < 3 || userData.username.length > 20) {
        showToast('❌ El nombre de usuario debe tener entre 3 y 20 caracteres', 'error');
        return;
    }
    
    if (userData.nombre.length === 0) {
        showToast('❌ El nombre completo no puede estar vacío', 'error');
        return;
    }
    
    if (userData.nombre.length > 40) {
        showToast('❌ El nombre completo no puede tener más de 40 caracteres', 'error');
        return;
    }
    
    // Resto de validaciones existentes
    if (!userData.username || !userData.email || !userData.password || 
        !userData.nombre || !userData.fecha_nacimiento || !userData.genero) {
        showToast('❌ Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showToast('❌ Por favor ingresa un email válido', 'error');
        return;
    }
    
    if (userData.password.length < 6) {
        showToast('❌ La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Validar confirmación de contraseña
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    if (userData.password !== confirmPassword) {
        showToast('❌ Las contraseñas no coinciden', 'error');
        return;
    }
    
    // Validar fecha de nacimiento (mayor de 13 años)
    const birthDate = new Date(userData.fecha_nacimiento);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    if (birthDate > minAgeDate) {
        showToast('❌ Debes tener al menos 13 años para registrarte', 'error');
        return;
    }
    
    // Validar que no sea una fecha muy antigua
    const maxAgeDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    if (birthDate < maxAgeDate) {
        showToast('❌ Por favor ingresa una fecha de nacimiento válida', 'error');
        return;
    }
    
    try {
        showToast('⏳ Creando cuenta...', 'info');
        
        const response = await fetch(`${API_URL_AUTH}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ ¡Cuenta creada exitosamente!', 'success');
            closeModal('register');
            
            localStorage.setItem('currentUser', JSON.stringify(result.data));
            
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 2000);
        } else {
            showToast(`❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showToast('❌ Error de conexión con el servidor', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Procesando login...');
    
    const loginData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };
    
    console.log('🔍 Datos de login:', loginData);
    
    if (!loginData.username || !loginData.password) {
        showToast('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        showToast('⏳ Verificando credenciales...', 'info');
        
        // Usar el nuevo endpoint de login
        const response = await fetch(`${API_URL_AUTH}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        console.log('🔍 Respuesta del login:', result);
        
        if (result.success) {
            showToast('✅ ¡Login exitoso!', 'success');
            closeModal('login');
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 1000);
        } else {
            showToast(`❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showToast('❌ Error de conexión con el servidor', 'error');
    }
}

// Sistema de notificaciones Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (!toast || !toastMessage) {
        console.error('Toast elements not found');
        return;
    }
    
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
        case 'success':
        default:
            toast.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            toastIcon.className = 'fas fa-check-circle toast-icon';
            break;
    }
    
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

console.log('✅ auth.js cargado correctamente');