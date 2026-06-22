try {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('Service Worker disabled successfully');
            }
        }).catch(function(err) {
            console.log('Error disabling Service Worker:', err);
        });
    }
} catch (e) {
    console.log('Cannot access serviceWorker due to security restrictions:', e);
}

window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('serviceWorker')) {
        event.preventDefault();
        console.log('Service Worker registration attempt blocked');
    }
});
