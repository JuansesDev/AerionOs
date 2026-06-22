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
        this._setWallpaper(this.wallpapers[this.currentWallpaperIndex]);

        this._initIcons();
        this._initTaskbar();
    }

    _setWallpaper(imagePath) {
        document.body.style.backgroundImage = `url('${imagePath}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
    }

    _initIcons() {
    }

    _initTaskbar() {
    }

    onClose() {
        super.onClose();
    }
}
