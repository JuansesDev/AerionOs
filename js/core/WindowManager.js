// Clase WindowManager: Gestiona la creación, posicionamiento y ciclo de vida de las ventanas
import { EventEmittable } from './EventEmittable.js';

export class WindowManager extends EventEmittable {
    constructor(webOS) {
        super();
        this.webOS = webOS;
        this.openWindows = {}; // Registro de ventanas abiertas
        this.highestZIndex = 100; // Índice Z más alto para control de capas
        this.windowIdCounter = 0; // Contador para generar IDs únicos
        this.activeWindow = null; // Ventana actualmente activa
    }

    // Crea una nueva ventana
    createWindow(appId, title, iconClass, options = {}) {
        this.windowIdCounter++;
        const windowInstanceId = `${appId}-win${this.windowIdCounter}`;

        // Asegura que la clase Window esté disponible. Es mejor si WebOS la inyecta o las aplicaciones la importan directamente.
        // Para esta estructura, WebOS creará instancias de App, y las instancias de App crearán ventanas a través de WM.
        // Por lo tanto, la clase Window necesita ser accesible aquí, probablemente importada.
        // Supongamos que WebOS maneja la importación de Window.js y la hace disponible si es necesario.
        // O, de manera más limpia, las aplicaciones podrían crear su propia instancia de Window, pasando WM.
        // Por ahora, supongamos que la clase 'Window' está disponible globalmente desde Window.js para simplicidad en este ejemplo.
        // (En una configuración real de bundler, las importaciones manejarían esto de manera natural)

        // El constructor de Window está definido en js/core/Window.js
        // Se importará en los archivos que lo utilicen (como App.js)
        // Aquí, simplemente llamamos a `new Window(...)` asumiendo que está disponible.
        const newWindow = new window.AuraOS_Window(windowInstanceId, title, iconClass, this, options); // Usar referencia global por ahora

        this.openWindows[windowInstanceId] = newWindow;
        this.emit('windowOpened', newWindow);

        // Escuchar el evento de enfoque desde la ventana misma
        newWindow.on('focus', (focusedWindow) => {
            if (this.activeWindow && this.activeWindow !== focusedWindow) {
                this.emit('windowBlurred', this.activeWindow);
            }
            this.activeWindow = focusedWindow;
            this.emit('windowFocused', focusedWindow);
        });

        return newWindow;
    }

    // Cierra una ventana por su ID
    closeWindow(windowId) {
        const windowToClose = this.openWindows[windowId];
        if (windowToClose) {
            if (windowToClose.element.parentNode) {
                windowToClose.element.parentNode.removeChild(windowToClose.element);
            }
            const wasActive = this.activeWindow === windowToClose;
            delete this.openWindows[windowId];
            if (wasActive) this.activeWindow = null;

            this.emit('windowClosed', windowToClose);
            this.focusNextAvailableWindow(windowId);
        }
    }

    // Enfoca la siguiente ventana disponible
    focusNextAvailableWindow(closedWindowIdToIgnore) {
        const activeWindows = Object.values(this.openWindows)
            .filter(win => !win.isMinimized && win.id !== closedWindowIdToIgnore)
            .sort((a, b) => parseInt(b.element.style.zIndex || 0) - parseInt(a.element.style.zIndex || 0));

        if (activeWindows.length > 0) {
            activeWindows[0].bringToFront(); // bringToFront manejará la configuración de activeWindow a través del evento 'focus'
        } else if (Object.keys(this.openWindows).length === 0 && this.activeWindow) {
            // No quedan ventanas, limpiar ventana activa
            this.emit('windowBlurred', this.activeWindow);
            this.activeWindow = null;
        }
    }

    // Trae una ventana al frente (mayor índice Z)
    bringToFront(windowInstance) {
        if (this.activeWindow === windowInstance && windowInstance.element.style.zIndex == this.highestZIndex) {
            // Ya está activa y en la parte superior, no es necesario reemitir el enfoque o cambiar el índice z
            return;
        }
        this.highestZIndex++;
        windowInstance.element.style.zIndex = this.highestZIndex;
        // El evento 'focus' de la ventana misma actualizará this.activeWindow y emitirá 'windowFocused'
    }

    // Obtiene una ventana por su ID
    getWindow(windowId) {
        return this.openWindows[windowId];
    }

    // Alias para getWindow (compatibilidad)
    getWindowById(windowId) {
        return this.getWindow(windowId);
    }

    // Obtiene las ventanas abiertas para una aplicación específica
    getWindowsByAppId(appId) {
        return Object.values(this.openWindows).filter(win => win.getAppId() === appId);
    }

    // Obtiene la ventana actualmente activa
    getActiveWindow() {
        return this.activeWindow;
    }
}