import { ClockCalendarWidget } from './ClockCalendarWidget.js';

export class Taskbar {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.appIconsContainer = this.element.querySelector('#taskbar-apps');
        this.clockTriggerElement = this.element.querySelector('#clock-trigger');
        this.taskbarAppIcons = {};
        this.pinnedApps = {};

        this.clockCalendarWidget = new ClockCalendarWidget(this.webOS);

        this._updateTaskbarClock(this.clockTriggerElement);
        this.taskbarClockInterval = setInterval(() => this._updateTaskbarClock(this.clockTriggerElement), 15000);

        this._listenToWindowManager();

        this.addPinnedApp('terminal');
        this.addPinnedApp('codeeditor');
        this.addPinnedApp('browser');
        this.addPinnedApp('files');
    }

    _createDOM() {
        const taskbarEl = document.createElement('div');
        taskbarEl.id = 'taskbar';
        taskbarEl.innerHTML = `
            <div id="start-button-area">
                <button id="start-button" aria-label="Start menu">
                    <img src="public/IconAerionOs.png" alt="AerionOs" class="start-button-icon">
                </button>
            </div>
            <div id="taskbar-apps"></div>
            <div id="taskbar-system-tray">
                <div id="clock-trigger" class="clock-display">12:00</div>
            </div>
        `;
        taskbarEl.querySelector('#start-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.webOS.startMenu.toggle();
        });

        const clockTriggerEl = taskbarEl.querySelector('#clock-trigger');
        clockTriggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clockCalendarWidget.toggle(clockTriggerEl);
        });

        this._updateTaskbarClock(clockTriggerEl);
        this.taskbarClockInterval = setInterval(() => this._updateTaskbarClock(clockTriggerEl), 15000);

        return taskbarEl;
    }

    addPinnedApp(appId) {
        if (this.pinnedApps[appId]) return;

        const app = this.webOS.apps[appId];
        if (!app) return;

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
            const openWindows = Object.values(this.webOS.windowManager.openWindows)
                .filter(win => win.getAppId() === appId);

            if (openWindows.length > 0) {
                const activeWin = openWindows.find(win => !win.isMinimized) || openWindows[0];

                if (activeWin.isMinimized) {
                    activeWin.restore();
                } else if (activeWin === this.webOS.windowManager.getActiveWindow()) {
                    activeWin.minimize();
                } else {
                    activeWin.bringToFront();
                }
            } else {
                this.webOS.launchApp(appId);
            }
        });

        if (this.appIconsContainer.firstChild) {
            this.appIconsContainer.insertBefore(iconEl, this.appIconsContainer.firstChild);
        } else {
            this.appIconsContainer.appendChild(iconEl);
        }

        this.pinnedApps[appId] = iconEl;
    }

    _addAppIcon(win) {
        const appId = win.getAppId();

        if (this.pinnedApps[appId]) {
            const iconEl = this.pinnedApps[appId];
            iconEl.dataset.windowId = win.id;
            this.taskbarAppIcons[win.id] = iconEl;

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

        if (this.taskbarAppIcons[win.id]) return;

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
                if (this.webOS.windowManager.getActiveWindow() === win && win.element.style.zIndex == this.webOS.windowManager.highestZIndex) {
                    win.minimize();
                } else {
                    win.bringToFront();
                }
            }
        });

        this.appIconsContainer.appendChild(iconEl);
        this.taskbarAppIcons[win.id] = iconEl;

        win.on('minimize', (w) => this._updateIconState(w));
        win.on('restore', (w) => this._updateIconState(w));
        win.on('titleChanged', (newTitle) => {
            span.textContent = newTitle.substring(0,15) + (newTitle.length > 15 ? '…' : '');
        });
        win.on('iconChanged', (newIconClass) => {
            i.className = newIconClass;
        });

        this._updateIconState(win);
        return iconEl;
    }

    _removeAppIcon(win) {
        const appId = win.getAppId();
        const iconEl = this.taskbarAppIcons[win.id];

        if (!iconEl) return;

        if (this.pinnedApps[appId] && this.pinnedApps[appId] === iconEl) {
            delete this.taskbarAppIcons[win.id];
            iconEl.classList.remove('active', 'minimized');
        } else {
            iconEl.remove();
            delete this.taskbarAppIcons[win.id];
        }
    }

    _updateTaskbarClock(clockElement) {
        if (!clockElement) return;
        const now = new Date();
        clockElement.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    _listenToWindowManager() {
        this.webOS.windowManager.on('windowOpened', (win) => this._addAppIcon(win));
        this.webOS.windowManager.on('windowClosed', (win) => this._removeAppIcon(win));
        this.webOS.windowManager.on('windowFocused', (win) => this._setActiveAppIcon(win));
        this.webOS.windowManager.on('windowBlurred', (win) => this._setInactiveAppIcon(win));
    }

    _updateIconState(win) {
        const iconEl = this.taskbarAppIcons[win.id];
        if (!iconEl) return;

        iconEl.classList.toggle('minimized', win.isMinimized);
        iconEl.classList.toggle('active', win === this.webOS.windowManager.getActiveWindow());
    }

    _setActiveAppIcon(win) {
        Object.values(this.taskbarAppIcons).forEach(icon => icon.classList.remove('active'));

        const iconEl = this.taskbarAppIcons[win.id];
        if (iconEl) iconEl.classList.add('active');
    }

    _setInactiveAppIcon(win) {
        const iconEl = this.taskbarAppIcons[win.id];
        if (iconEl) iconEl.classList.remove('active');
    }

    destroy() {
        if (this.taskbarClockInterval) clearInterval(this.taskbarClockInterval);
        if (this.clockCalendarWidget) {
            this.clockCalendarWidget.destroy();
        }
    }
}
