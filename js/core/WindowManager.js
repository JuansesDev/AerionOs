import { EventEmittable } from './EventEmittable.js';

export class WindowManager extends EventEmittable {
    constructor(webOS) {
        super();
        this.webOS = webOS;
        this.openWindows = {};
        this.highestZIndex = 100;
        this.windowIdCounter = 0;
        this.activeWindow = null;
    }

    createWindow(appId, title, iconClass, options = {}) {
        this.windowIdCounter++;
        const windowInstanceId = `${appId}-win${this.windowIdCounter}`;

        const newWindow = new window.AerionOs_Window(windowInstanceId, title, iconClass, this, options);

        this.openWindows[windowInstanceId] = newWindow;
        this.emit('windowOpened', newWindow);

        newWindow.on('focus', (focusedWindow) => {
            if (this.activeWindow && this.activeWindow !== focusedWindow) {
                this.emit('windowBlurred', this.activeWindow);
            }
            this.activeWindow = focusedWindow;
            this.emit('windowFocused', focusedWindow);
        });

        return newWindow;
    }

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

    focusNextAvailableWindow(closedWindowIdToIgnore) {
        const activeWindows = Object.values(this.openWindows)
            .filter(win => !win.isMinimized && win.id !== closedWindowIdToIgnore)
            .sort((a, b) => parseInt(b.element.style.zIndex || 0) - parseInt(a.element.style.zIndex || 0));

        if (activeWindows.length > 0) {
            activeWindows[0].bringToFront();
        } else if (Object.keys(this.openWindows).length === 0 && this.activeWindow) {
            this.emit('windowBlurred', this.activeWindow);
            this.activeWindow = null;
        }
    }

    bringToFront(windowInstance) {
        if (this.activeWindow === windowInstance && windowInstance.element.style.zIndex == this.highestZIndex) {
            return;
        }
        this.highestZIndex++;
        windowInstance.element.style.zIndex = this.highestZIndex;
    }

    getWindow(windowId) {
        return this.openWindows[windowId];
    }

    getWindowById(windowId) {
        return this.getWindow(windowId);
    }

    getWindowsByAppId(appId) {
        return Object.values(this.openWindows).filter(win => win.getAppId() === appId);
    }

    getActiveWindow() {
        return this.activeWindow;
    }
}