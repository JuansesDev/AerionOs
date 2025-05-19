// js/ui/Taskbar.js
import { ClockCalendarWidget } from './ClockCalendarWidget.js'; // Import the new widget

// Clase Taskbar: Gestiona la barra de tareas del sistema operativo
export class Taskbar {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.appIconsContainer = this.element.querySelector('#taskbar-apps');
        this.clockTriggerElement = this.element.querySelector('#clock-trigger');
        this.taskbarAppIcons = {}; // Mapeo de iconos por ID de ventana
        this.pinnedApps = {};      // Mapeo de aplicaciones ancladas por ID

        // Inicializar el widget del reloj/calendario
        this.clockCalendarWidget = new ClockCalendarWidget(this.webOS);

        // Inicializar el reloj del taskbar y widget
        this._updateTaskbarClock(this.clockTriggerElement);
        this.taskbarClockInterval = setInterval(() => this._updateTaskbarClock(this.clockTriggerElement), 15000);

        this._listenToWindowManager();

        // Anclar aplicaciones predeterminadas
        this.addPinnedApp('terminal');
        this.addPinnedApp('codeeditor');
        this.addPinnedApp('browser');
        this.addPinnedApp('files');
    }

    // Crear el DOM de la barra de tareas
    _createDOM() {
        const taskbarEl = document.createElement('div');
        taskbarEl.id = 'taskbar';
        taskbarEl.innerHTML = `
            <div id="start-button-area">
                <button id="start-button" aria-label="Menú de inicio">
                    <img src="public/auraOs.svg" alt="AuraOS" class="start-button-icon">
                </button>
            </div>
            <div id="taskbar-apps"></div>
            <div id="taskbar-system-tray">
                <div id="clock-trigger" class="clock-display">12:00</div> <!-- Changed ID for clarity -->
                <!-- Future: Volume, Network, Notifications icons -->
            </div>
        `;
        taskbarEl.querySelector('#start-button').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent body click from closing menu immediately
            this.webOS.startMenu.toggle();
        });

        // Event listener for the clock trigger
        const clockTriggerEl = taskbarEl.querySelector('#clock-trigger');
        clockTriggerEl.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent this click from bubbling up to document
            this.clockCalendarWidget.toggle(clockTriggerEl); // Pass the trigger element
        });

        // Initial clock display for the taskbar itself
        this._updateTaskbarClock(clockTriggerEl);
        this.taskbarClockInterval = setInterval(() => this._updateTaskbarClock(clockTriggerEl), 15000); // Update taskbar clock periodically

        return taskbarEl;
    }

    // Método para anclar aplicaciones a la barra de tareas
    addPinnedApp(appId) {
        if (this.pinnedApps[appId]) return; // Ya está anclada

        const app = this.webOS.apps[appId];
        if (!app) return; // La app no existe

        const iconEl = document.createElement('div');
        iconEl.className = 'taskbar-app-icon pinned';
        iconEl.dataset.appId = appId;

        const i = document.createElement('i');
        i.className = app.iconClass;
        iconEl.appendChild(i);

        const span = document.createElement('span');
        span.textContent = app.name;
        iconEl.appendChild(span);

        iconEl.addEventListener('click', () => {
            // Si ya hay una ventana abierta para esta app
            const openWindows = Object.values(this.webOS.windowManager.openWindows)
                .filter(win => win.getAppId() === appId);

            if (openWindows.length > 0) {
                // Si hay ventanas abiertas, comportamiento estándar de taskbar
                const activeWin = openWindows.find(win => !win.isMinimized) || openWindows[0];

                if (activeWin.isMinimized) {
                    activeWin.restore();
                } else if (activeWin === this.webOS.windowManager.getActiveWindow()) {
                    activeWin.minimize();
                } else {
                    activeWin.bringToFront();
                }
            } else {
                // Si no hay ventanas, lanzar la aplicación
                this.webOS.launchApp(appId);
            }
        });

        // Insertar al principio del contenedor de apps
        if (this.appIconsContainer.firstChild) {
            this.appIconsContainer.insertBefore(iconEl, this.appIconsContainer.firstChild);
        } else {
            this.appIconsContainer.appendChild(iconEl);
        }

        this.pinnedApps[appId] = iconEl;
    }

    // Añade un icono para representar una ventana abierta
    _addAppIcon(win) {
        const appId = win.getAppId();

        // Si la app está anclada, usamos ese icono y actualizamos su estado
        if (this.pinnedApps[appId]) {
            const iconEl = this.pinnedApps[appId];
            iconEl.dataset.windowId = win.id;
            this.taskbarAppIcons[win.id] = iconEl;

            // Escuchar eventos de la ventana
            win.on('minimize', (w) => this._updateIconState(w));
            win.on('restore', (w) => this._updateIconState(w));
            win.on('titleChanged', (newTitle) => {
                const span = iconEl.querySelector('span');
                if (span) span.textContent = newTitle.substring(0,15) + (newTitle.length > 15 ? '…' : '');
            });
            win.on('iconChanged', (newIconClass) => {
                const i = iconEl.querySelector('i');
                if (i) i.className = newIconClass;
            });

            this._updateIconState(win);
            return iconEl;
        }

        // Si no está anclada, comportamiento original
        if (this.taskbarAppIcons[win.id]) return; // Icon already exists

        const iconEl = document.createElement('div');
        iconEl.className = 'taskbar-app-icon';
        iconEl.dataset.windowId = win.id;

        const i = document.createElement('i');
        i.className = win.iconClass;
        iconEl.appendChild(i);

        const span = document.createElement('span');
        span.textContent = win.title.substring(0,15) + (win.title.length > 15 ? '…' : '');
        iconEl.appendChild(span);

        iconEl.addEventListener('click', () => {
            if (win.isMinimized) {
                win.restore();
            } else {
                // If window is active and on top, minimize it. Otherwise, bring to front.
                if (this.webOS.windowManager.getActiveWindow() === win && win.element.style.zIndex == this.webOS.windowManager.highestZIndex) {
                    win.minimize();
                } else {
                    win.bringToFront();
                }
            }
        });

        this.appIconsContainer.appendChild(iconEl);
        this.taskbarAppIcons[win.id] = iconEl;

        // Listen to window-specific events for taskbar icon state
        win.on('minimize', (w) => this._updateIconState(w));
        win.on('restore', (w) => this._updateIconState(w));
        win.on('titleChanged', (newTitle) => {
            span.textContent = newTitle.substring(0,15) + (newTitle.length > 15 ? '…' : '');
        });
        win.on('iconChanged', (newIconClass) => {
            i.className = newIconClass;
        });

        this._updateIconState(win); // Initial state
        return iconEl;
    }

    // Elimina el icono de una ventana cuando se cierra
    _removeAppIcon(win) {
        const appId = win.getAppId();
        const iconEl = this.taskbarAppIcons[win.id];

        if (!iconEl) return;

        // Si es un icono anclado, solo eliminarlo de taskbarAppIcons pero dejarlo visible
        if (this.pinnedApps[appId] && this.pinnedApps[appId] === iconEl) {
            delete this.taskbarAppIcons[win.id];
            iconEl.classList.remove('active', 'minimized');
            // Mantener el icono porque está anclado
        } else {
            // Comportamiento original
            iconEl.remove();
            delete this.taskbarAppIcons[win.id];
        }
    }

    // Actualiza la hora mostrada en la barra de tareas
    _updateTaskbarClock(clockElement) {
        // This updates the simple clock display in the taskbar, not the widget's clock
        if (!clockElement) return;
        const now = new Date();
        clockElement.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // Suscribe a eventos del gestor de ventanas
    _listenToWindowManager() {
        this.webOS.windowManager.on('windowOpened', (win) => this._addAppIcon(win));
        this.webOS.windowManager.on('windowClosed', (win) => this._removeAppIcon(win));
        this.webOS.windowManager.on('windowFocused', (win) => this._setActiveAppIcon(win));
        this.webOS.windowManager.on('windowBlurred', (win) => this._setInactiveAppIcon(win));
    }

    // Actualiza el estado visual de un icono según el estado de la ventana
    _updateIconState(win) {
        const iconEl = this.taskbarAppIcons[win.id];
        if (!iconEl) return;

        // Actualizar clases CSS según estado de la ventana
        iconEl.classList.toggle('minimized', win.isMinimized);
        iconEl.classList.toggle('active', win === this.webOS.windowManager.getActiveWindow());
    }

    // Marca el icono de una app como activo
    _setActiveAppIcon(win) {
        Object.values(this.taskbarAppIcons).forEach(icon => icon.classList.remove('active'));

        const iconEl = this.taskbarAppIcons[win.id];
        if (iconEl) iconEl.classList.add('active');
    }

    // Desmarca el icono de una app como activo
    _setInactiveAppIcon(win) {
        const iconEl = this.taskbarAppIcons[win.id];
        if (iconEl) iconEl.classList.remove('active');
    }

    // Limpia timers y recursos al destruir
    destroy() {
        if (this.taskbarClockInterval) clearInterval(this.taskbarClockInterval);
        if (this.clockCalendarWidget) {
            this.clockCalendarWidget.destroy();
        }
    }
}