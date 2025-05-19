// Clase App: Base para todas las aplicaciones del sistema
import { EventEmittable } from './EventEmittable.js';

export class App extends EventEmittable {
    constructor(appId, appName, iconClass, webOS, options = {}) {
        super();
        this.id = appId;
        this.name = appName;
        this.iconClass = iconClass;
        this.webOS = webOS;
        this.options = {
            allowMultipleInstances: false,
            window: {}, // Opciones predeterminadas de ventana
            ...options
        };
        this.instances = []; // Almacena instancias de ventanas para esta app
    }

    // Lanza la aplicación, creando una nueva instancia o reutilizando una existente
    launch(launchOptions = {}) { // launchOptions can be e.g. { filePathToOpen: '...' }
        if (!this.options.allowMultipleInstances && this.instances.length > 0) {
            const winToFocus = this.instances[0]; // Focus the first (and only) instance
            if (winToFocus.isMinimized) {
                winToFocus.restore();
            } else {
                winToFocus.bringToFront();
            }
            this.onRelaunch(winToFocus, launchOptions); // Call a method for already running app
            return winToFocus;
        }

        const windowOptions = {
            ...this.options.window, // App's default window options
            customClass: `${this.id}-app` // Add app-specific class to window
        };

        const newWindow = this.webOS.windowManager.createWindow(
            this.id,
            this.name,
            this.iconClass,
            windowOptions // Pass merged window options
        );

        this.instances.push(newWindow);
        this.renderContent(newWindow.contentElement, newWindow, launchOptions);

        newWindow.on('close', (closedWindow) => this._handleInstanceClose(closedWindow));
        this.emit('launched', newWindow);
        return newWindow;
    }

    // Renderiza el contenido de la aplicación (a implementar por subclases)
    renderContent(contentElement, windowInstance, launchOptions) {
        // Implementación base que las subclases deben sobrescribir
        contentElement.innerHTML = `<p style="padding:20px;">Contenido para ${this.name}.</p>`;
    }

    // Maneja el relanzamiento cuando la app ya está en ejecución
    onRelaunch(windowInstance, launchOptions) {
        // Called when app is launched but already running (and !allowMultipleInstances)
        // Subclasses can override this to handle new data (e.g., open another file in existing editor)
        console.log(`${this.name} relaunched. Options:`, launchOptions);
    }

    // Gestiona el cierre de una instancia de la aplicación
    _handleInstanceClose(closedWindow) {
        this.instances = this.instances.filter(inst => inst !== closedWindow);
        if (this.instances.length === 0) {
            this.emit('allInstancesClosed', this); // App fully closed
        }
    }

    // Obtiene la ventana principal si solo se permite una instancia
    getMainWindow() {
        return this.instances.length > 0 ? this.instances[0] : null;
    }
}