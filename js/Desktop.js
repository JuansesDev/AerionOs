// js/Desktop.js
import { App } from '../core/App.js';

export class Desktop extends App {
    constructor(webOS) {
        super('desktop', 'Escritorio', 'fas fa-desktop', webOS);
        this.wallpapers = [
            'public/wallpapers/default_background.png',
            'public/wallpapers/wallpaper1.jpg',
            'public/wallpapers/wallpaper2.jpg'
        ];
        this.currentWallpaperIndex = 0;
    }

    initDesktop() {
        // Establecer el fondo de pantalla actual
        this._setWallpaper(this.wallpapers[this.currentWallpaperIndex]);

        // Inicializar los iconos y otras configuraciones del escritorio
        this._initIcons();
        this._initTaskbar();
    }

    _setWallpaper(imagePath) {
        document.body.style.backgroundImage = `url('${imagePath}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
    }

    _initIcons() {
        // Lógica para inicializar los iconos del escritorio
    }

    _initTaskbar() {
        // Lógica para inicializar la barra de tareas
    }

    onClose() {
        // Limpiar intervalos, eventos, etc.
        super.onClose();
    }
}