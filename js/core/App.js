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
            window: {},
            ...options
        };
        this.instances = [];
    }

    launch(launchOptions = {}) {
        if (!this.options.allowMultipleInstances && this.instances.length > 0) {
            const winToFocus = this.instances[0];
            if (winToFocus.isMinimized) {
                winToFocus.restore();
            } else {
                winToFocus.bringToFront();
            }
            this.onRelaunch(winToFocus, launchOptions);
            return winToFocus;
        }

        const windowOptions = {
            ...this.options.window,
            customClass: `${this.id}-app`
        };

        const newWindow = this.webOS.windowManager.createWindow(
            this.id,
            this.name,
            this.iconClass,
            windowOptions
        );

        this.instances.push(newWindow);
        this.renderContent(newWindow.contentElement, newWindow, launchOptions);

        newWindow.on('close', (closedWindow) => this._handleInstanceClose(closedWindow));
        this.emit('launched', newWindow);
        return newWindow;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `<p style="padding:20px;">Content for ${this.name}.</p>`;
    }

    onRelaunch(windowInstance, launchOptions) {
        console.log(`${this.name} relaunched. Options:`, launchOptions);
    }

    _handleInstanceClose(closedWindow) {
        this.instances = this.instances.filter(inst => inst !== closedWindow);
        if (this.instances.length === 0) {
            this.emit('allInstancesClosed', this);
        }
    }

    getMainWindow() {
        return this.instances.length > 0 ? this.instances[0] : null;
    }
}
