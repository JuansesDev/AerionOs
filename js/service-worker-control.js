// Este archivo desactiva cualquier Service Worker previamente registrado

// Verificar si el navegador soporta service worker y si estamos en un contexto seguro
try {
    if ('serviceWorker' in navigator) {
        // Intentar desregistrar cualquier service worker existente
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('Service Worker desactivado correctamente');
            }
        }).catch(function(err) {
            console.log('Error al desactivar Service Worker:', err);
        });
    }
} catch (e) {
    // Capturar errores de contexto sandbox u otros problemas
    console.log('No se puede acceder a serviceWorker debido a restricciones de seguridad:', e);
}

// Evitar que se registre un nuevo service worker
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('serviceWorker')) {
        event.preventDefault();
        console.log('Intento de registro de Service Worker bloqueado');
    }
});
