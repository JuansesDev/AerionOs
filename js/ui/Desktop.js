// js/ui/Desktop.js
export class Desktop {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = document.createElement('div');
        this.element.id = 'desktop';
        this.loadWallpaper();
        this._setupEventListeners();
    }

    addIcon(appId, appName, appIconClass) {
        const app = this.webOS.apps[appId];
        if (!app) {
            console.warn(`Cannot add desktop icon for non-existent app: ${appId}`);
            return;
        }

        const iconEl = document.createElement('div');
        iconEl.className = 'desktop-icon';
        iconEl.dataset.appId = appId;
        iconEl.innerHTML = `
            <i class="${appIconClass || 'fas fa-question-circle'} fa-3x"></i>
            <span>${appName}</span>
        `;
        iconEl.addEventListener('dblclick', () => {
            this.webOS.launchApp(appId);
        });
        this.element.appendChild(iconEl);
    }

    loadWallpaper() {
        const defaultWallpaper = 'https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png';
        const savedWallpaper = this._hasActiveUser() ? this.webOS.userSession.getUserSetting('wallpaper') : null;
        console.log('Loading wallpaper:', savedWallpaper || '(none saved, using default)');

        if (savedWallpaper && (savedWallpaper.startsWith('http') || savedWallpaper.startsWith('data:image'))) {
            this.element.style.backgroundImage = `url('${savedWallpaper}')`;
        } else {
            // Si no hay fondo guardado o no es válido, usar el predeterminado y guardarlo
            this.element.style.backgroundImage = `url('${defaultWallpaper}')`;
            // Asegurar que el valor predeterminado esté guardado solo si hay un usuario activo
            if (this._hasActiveUser()) {
                this.webOS.userSession.setUserSetting('wallpaper', defaultWallpaper);
            }
        }
    }

    setWallpaper(url) {
        const defaultWallpaper = 'https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png';
        if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
            this.element.style.backgroundImage = `url('${url}')`;
            if (this._hasActiveUser()) {
                this.webOS.userSession.setUserSetting('wallpaper', url);
                console.log('Wallpaper set to:', url);
            } else {
                console.warn('No active user session, wallpaper applied but not saved');
            }
        } else if (url === "") { // Reset to default
            this.element.style.backgroundImage = `url('${defaultWallpaper}')`;
            if (this._hasActiveUser()) {
                this.webOS.userSession.setUserSetting('wallpaper', defaultWallpaper);
                console.log('Wallpaper reset to default');
            } else {
                console.warn('No active user session, default wallpaper applied but not saved');
            }
        }
    }

    // Método auxiliar para verificar si hay un usuario activo
    _hasActiveUser() {
        return this.webOS &&
               this.webOS.userSession &&
               this.webOS.userSession.currentUser;
    }

    _setupEventListeners() {
        this.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const items = [
                { label: 'Cambiar Fondo (Ajustes)', icon: 'fa-palette', action: () => this.webOS.launchApp('settings') },
                { label: 'Actualizar Escritorio', icon: 'fa-sync-alt', action: () => {
                    this.element.querySelectorAll('.desktop-icon').forEach(icon => icon.remove());
                    this.webOS._populateDesktop(); // Asumiendo que este método existe en WebOS
                 } },
                 { separator: true},
                 { label: 'Acerca de AuraOS', icon: 'fa-info-circle', action: () => {
                    const windowId = 'about-auraos-desktop';

                    // Comprobar si la ventana ya está abierta
                    const existingWindow = this.webOS.windowManager.getWindowById(windowId);
                    if (existingWindow) {
                        // Si ya está abierta, solo la enfocamos
                        existingWindow.focus();
                        return;
                    }

                    // Si no existe, creamos una nueva ventana
                    const aboutWindow = this.webOS.windowManager.createWindow(
                        windowId,
                        'Acerca de AuraOS',
                        'fas fa-info-circle',
                        {
                            width: 420,
                            height: 320,
                            minWidth: 350,
                            minHeight: 280,
                            customClass: 'about-window-theme'
                        }
                    );

                    // Definir el contenido HTML (sin cambios)
                    const aboutContentHTML = `
                        <div style="padding: 20px; line-height: 1.6; color: var(--text-color); font-family: var(--font-family);">
                            <h3 style="margin-bottom: 15px; color: var(--accent-color); text-align: center; font-size: 1.6em; font-weight: 500;">
                                <i class="fab fa-linux" style="margin-right: 8px;"></i>AuraOS
                            </h3>
                            <p style="text-align: center; font-size: 0.95em; margin-bottom: 10px;">Versión 0.5 (Portfolio Edition)</p>
                            <p style="text-align: center; margin-bottom: 15px;">
                                Desarrollado por: <strong style="color: var(--accent-color-hover);">JuansesDev</strong>
                            </p>
                            <p style="font-size: 0.9em; margin-bottom:8px;">
                                AuraOS es un simulador de sistema operativo web interactivo,
                                diseñado para demostrar habilidades en desarrollo front-end
                                utilizando HTML, CSS y JavaScript modular.
                            </p>
                            <p style="font-size:0.9em;margin-top:10px;">
                                Imágenes de fondo por defecto proporcionadas por
                                <a href="https://pixeldreamsgallery.me/" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color);text-decoration:none;">Pixel Dreams Gallery</a> y otras fuentes.
                            </p>
                            <p style="text-align:center;margin-top:25px;font-size:0.85em;color:var(--text-color-darker);">
                                © ${new Date().getFullYear()} JuansesDev.
                            </p>
                        </div>
                    `.trim();

                    // Establecer el contenido si se creó la ventana
                    if (aboutWindow) {
                        aboutWindow.setContent(aboutContentHTML);
                    } else {
                        console.error("No se pudo crear la ventana 'Acerca de AuraOS'");
                    }
                 }}
            ];
            this.webOS.contextMenu.show(e.clientX, e.clientY, items);
        });
    }
}