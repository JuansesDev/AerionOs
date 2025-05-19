// js/core/Config.js

// Configuración de fondos de escritorio
const wallpapers = [
    { id: 'default_bg', src: 'public/wallpapers/default_background.png', name: 'Predeterminado' },
    { id: 'mountains', src: 'public/wallpapers/mountains.jpg', name: 'Montañas' },
    { id: 'beach', src: 'public/wallpapers/beach.jpg', name: 'Playa' },
    { id: 'forest', src: 'public/wallpapers/forest.jpg', name: 'Bosque' },
    { id: 'abstract', src: 'public/wallpapers/abstract.jpg', name: 'Abstracto' },
    // Añadimos el wallpaper que era predeterminado como una opción más
    { id: 'previous_default', src: 'public/wallpapers/default.jpg', name: 'Clásico' },
    // ...existing wallpaper options...
];

// Cambiamos el fondo por defecto
const defaultSettings = {
    // ...existing code...
    wallpaper: 'public/wallpapers/default_background.png', // Nueva imagen predeterminada
    // ...existing code...
};

export { wallpapers, defaultSettings };