// frontend/js/auth.js
const API_URL = 'http://localhost:3001/api';

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
    initializeDateLimits(); // Para límites de fecha de nacimiento
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
        document.body.classList.add('modal-open'); // Agregar clase al body
        
        // Pequeño delay para la animación
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
        
        // Enfocar el primer input
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

// Configurar límites para fecha de nacimiento
// En tu auth.js, actualiza la función initializeDateLimits
function initializeDateLimits() {
    const fechaNacimientoInput = document.getElementById('regFechaNacimiento');
    
    if (fechaNacimientoInput && typeof flatpickr !== 'undefined') {
        // Usar Flatpickr para mejor experiencia
        flatpickr(fechaNacimientoInput, {
            locale: "es",
            dateFormat: "Y-m-d",
            maxDate: new Date().fp_incYears(-13), // Mínimo 13 años
            minDate: new Date().fp_incYears(-100), // Máximo 100 años
            position: "auto",
            static: true,
            monthSelectorType: "dropdown",
            yearSelectorType: "dropdown",
            prevArrow: '<i class="fas fa-chevron-left"></i>',
            nextArrow: '<i class="fas fa-chevron-right"></i>',
            onReady: function(selectedDates, dateStr, instance) {
                // Agregar clases personalizadas
                instance.calendarContainer.classList.add('custom-flatpickr');
            }
        });
        
        // Agregar placeholder personalizado
        fechaNacimientoInput.setAttribute('placeholder', 'DD/MM/AAAA');
        
    } else if (fechaNacimientoInput) {
        // Fallback si no hay Flatpickr
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        
        fechaNacimientoInput.max = maxDate.toISOString().split('T')[0];
        fechaNacimientoInput.min = minDate.toISOString().split('T')[0];
        fechaNacimientoInput.setAttribute('placeholder', 'DD/MM/AAAA');
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
    
    // Cerrar dropdown al hacer clic fuera
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
    
    // Obtener valores de los nuevos campos
    const userData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nombre: document.getElementById('regNombre').value,
        // NUEVOS CAMPOS
        fecha_nacimiento: document.getElementById('regFechaNacimiento').value,
        genero: document.getElementById('regGenero').value
    };
    
    // Validaciones mejoradas
    if (!userData.username || !userData.email || !userData.password || 
        !userData.nombre || !userData.fecha_nacimiento || !userData.genero) {
        showToast('❌ Por favor completa todos los campos obligatorios', 'error');
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
        
        const response = await fetch(`${API_URL}/users`, {
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
    
    if (!loginData.username || !loginData.password) {
        showToast('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        showToast('⏳ Verificando credenciales...', 'info');
        
        const response = await fetch(`${API_URL}/users`);
        const result = await response.json();
        
        if (result.success) {
            const user = result.data.find(u => 
                (u.username === loginData.username || u.email === loginData.username)
            );
            
            if (user) {
                showToast('✅ ¡Login exitoso!', 'success');
                closeModal('login');
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                setTimeout(() => {
                    window.location.href = 'pages/dashboard.html';
                }, 1000);
            } else {
                showToast('❌ Usuario o contraseña incorrectos', 'error');
            }
        } else {
            showToast('❌ Error al cargar usuarios', 'error');
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
    
    // Cambiar estilo según el tipo
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
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// Debug: Verificar que todo esté cargado
console.log('✅ auth.js cargado correctamente');