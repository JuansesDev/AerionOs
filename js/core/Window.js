import { EventEmittable } from './EventEmittable.js';

export class Window extends EventEmittable {
    constructor(id, title, iconClass, windowManager, options = {}) {
        super();
        this.id = id;
        this.title = title;
        this.iconClass = iconClass || 'fas fa-window-maximize';
        this.wm = windowManager;
        this.options = {
            width: 500, height: 400,
            minWidth: 250, minHeight: 150,
            x: null, y: null,
            resizable: true,
            ...options
        };

        this.element = this._createDOM();
        this._setupEventListeners();

        this.isMinimized = false;
        this.isMaximized = false;
        this.originalState = {};

        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;

        if (this.options.x !== null && this.options.y !== null) {
            this.element.style.left = `${this.options.x}px`;
            this.element.style.top = `${this.options.y}px`;
        } else {
            const existingWindows = Object.keys(this.wm.openWindows).length;
            const taskbarHeight = this.wm.webOS.taskbar?.element.offsetHeight || 45;
            const desktopRect = this.wm.webOS.desktop.element.getBoundingClientRect();

            let top = 40 + (existingWindows % 7) * 25;
            let left = 60 + (existingWindows % 10) * 25;

            if (top + this.options.height > desktopRect.height - taskbarHeight) top = 20;
            if (left + this.options.width > desktopRect.width) left = 20;
            this.element.style.top = `${top}px`;
            this.element.style.left = `${left}px`;
        }

        this.wm.webOS.desktop.element.appendChild(this.element);
        this.bringToFront();
    }

    _createDOM() {
        const template = document.getElementById('window-template');
        if (!template) {
            console.error("Window template not found!");
            throw new Error("Window template missing from DOM.");
        }
        const clone = template.content.cloneNode(true);
        const windowElement = clone.querySelector('.window');

        windowElement.dataset.windowId = this.id;
        this.titleElement = windowElement.querySelector('.window-title');
        this.titleElement.textContent = this.title;
        this.iconElement = windowElement.querySelector('.window-icon i');
        this.iconElement.className = this.iconClass;

        this.contentElement = windowElement.querySelector('.window-content');
        this.headerElement = windowElement.querySelector('.window-header');
        if (this.options.customClass) {
            windowElement.classList.add(this.options.customClass);
        }

        return windowElement;
    }

    _setupEventListeners() {
        this.headerElement.addEventListener('mousedown', (e) => this._onDragStart(e));
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
                e.preventDefault();
            }
            this.bringToFront();
        });

        const controls = this.element.querySelector('.window-controls');
        controls.querySelector('.close-button').addEventListener('click', () => this.close());
        controls.querySelector('.minimize-button').addEventListener('click', () => this.minimize());
        this.maximizeButton = controls.querySelector('.maximize-button');
        this.maximizeButton.addEventListener('click', () => this.toggleMaximize());

        if (this.options.resizable) {
            const borders = [
                'top-border', 'bottom-border', 'left-border', 'right-border',
                'top-left-corner', 'top-right-corner', 'bottom-left-corner', 'bottom-right-corner'
            ];
            borders.forEach(borderClass => {
                const element = this.element.querySelector('.' + borderClass);
                if (element) {
                    element.addEventListener('mousedown', (e) => this._onResizeStart(e, borderClass));
                }
            })
        }
    }

    _onResizeStart(e, borderClass) {
        if (this.isMaximized) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.resizingBorder = borderClass;

        const rect = this.element.getBoundingClientRect();
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startLeft = rect.left;
        this.startTop = rect.top;

        this._onResizeMoveRef = (ev) => this._onResizeMove(ev);
        this._onResizeEndRef = (ev) => this._onResizeEnd(ev);

        document.body.style.cursor = window.getComputedStyle(e.target).cursor || 'default';
        this.element.classList.add('resizing');
        document.addEventListener('mousemove', this._onResizeMoveRef);
        document.addEventListener('mouseup', this._onResizeEndRef, { once: true });
    }

    _onResizeMove(e) {
        if (!this.isResizing) return;

        let dx = e.clientX - this.startX;
        let dy = e.clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;

        if (this.resizingBorder.includes('right')) {
            newWidth = this.startWidth + dx;
        }
        if (this.resizingBorder.includes('left')) {
            newWidth = this.startWidth - dx;
            newLeft = this.startLeft + dx;
        }
        if (this.resizingBorder.includes('bottom')) {
            newHeight = this.startHeight + dy;
        }
        if (this.resizingBorder.includes('top')) {
            newHeight = this.startHeight - dy;
            newTop = this.startTop + dy;
        }

        if (this.options.maintainAspectRatio && this.options.aspectRatio) {
            const aspectRatio = this.options.aspectRatio;

            if (Math.abs(dx) > Math.abs(dy)) {
                newHeight = newWidth / aspectRatio;
            } else {
                newWidth = newHeight * aspectRatio;
            }

            if (this.resizingBorder.includes('left')) {
                newLeft = this.startLeft + (this.startWidth - newWidth);
            }
            if (this.resizingBorder.includes('top')) {
                newTop = this.startTop + (this.startHeight - newHeight);
            }
        }

        let minWidth = this.options.minWidth;
        let minHeight = this.options.minHeight;
        let maxWidth = this.options.maxWidth || Infinity;
        let maxHeight = this.options.maxHeight || Infinity;

        if (newWidth < minWidth) {
            newWidth = minWidth;
            if (this.options.maintainAspectRatio && this.options.aspectRatio) {
                newHeight = newWidth / this.options.aspectRatio;
            }
        }
        if (newHeight < minHeight) {
            newHeight = minHeight;
            if (this.options.maintainAspectRatio && this.options.aspectRatio) {
                newWidth = newHeight * this.options.aspectRatio;
            }
        }
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
            if (this.options.maintainAspectRatio && this.options.aspectRatio) {
                newHeight = newWidth / this.options.aspectRatio;
            }
        }
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            if (this.options.maintainAspectRatio && this.options.aspectRatio) {
                newWidth = newHeight * this.options.aspectRatio;
            }
        }

        this.element.style.width = `${newWidth}px`;
        this.element.style.height = `${newHeight}px`;

        if (this.resizingBorder.includes('left')) {
            this.element.style.left = `${newLeft - this.element.offsetParent.getBoundingClientRect().left}px`;
        }
        if (this.resizingBorder.includes('top')) {
            this.element.style.top = `${newTop - this.element.offsetParent.getBoundingClientRect().top}px`;
        }
    }

    _onResizeEnd(e) {
        this.isResizing = false;
        this.resizingBorder = null;
        document.body.style.cursor = 'default';
        this.element.classList.remove('resizing');
        document.removeEventListener('mousemove', this._onResizeMoveRef);
    }

    _onDragStart(e) {
        if (e.button !== 0 || this.isMaximized) return;
        if (e.target.closest('.window-controls')) return;

        this.isDragging = true;
        this.offsetX = e.clientX - this.element.offsetLeft;
        this.offsetY = e.clientY - this.element.offsetTop;

        document.body.style.cursor = 'grabbing';
        this.headerElement.style.cursor = 'grabbing';

        this._onDragMoveRef = (ev) => this._onDragMove(ev);
        this._onDragEndRef = () => this._onDragEnd();
        document.addEventListener('mousemove', this._onDragMoveRef);
        document.addEventListener('mouseup', this._onDragEndRef, { once: true });

        this.bringToFront();
    }

    _onDragMove(e) {
        if (!this.isDragging) return;

        let newX = e.clientX - this.offsetX;
        let newY = e.clientY - this.offsetY;

        const desktopRect = this.wm.webOS.desktop.element.getBoundingClientRect();
        const headerHeight = this.headerElement.offsetHeight;

        newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
        newY = Math.max(0, Math.min(newY, desktopRect.height - headerHeight - 5));

        this.element.style.left = `${newX}px`;
        this.element.style.top = `${newY}px`;
    }

    _onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.style.cursor = 'default';
        this.headerElement.style.cursor = 'move';
        document.removeEventListener('mousemove', this._onDragMoveRef);
    }

    setContent(htmlOrElement) {
        this.contentElement.innerHTML = '';
        if (typeof htmlOrElement === 'string') {
            this.contentElement.innerHTML = htmlOrElement;
        } else if (htmlOrElement instanceof HTMLElement) {
            this.contentElement.appendChild(htmlOrElement);
        }
    }

    setTitle(newTitle) {
        this.title = newTitle;
        if (this.titleElement) this.titleElement.textContent = newTitle;
        this.emit('titleChanged', newTitle);
    }

    setIcon(newIconClass) {
        this.iconClass = newIconClass;
        if (this.iconElement) this.iconElement.className = newIconClass;
        this.emit('iconChanged', newIconClass);
    }

    bringToFront() {
        this.wm.bringToFront(this);
        this.emit('focus', this);
    }

    close() {
        this.emit('beforeClose', this);
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.wm.closeWindow(this.id);
            this.emit('close', this);
        }, 200);
    }

    minimize() {
        if (this.isMinimized) return;
        this.element.classList.add('minimized-state');
        this.isMinimized = true;
        this.emit('minimize', this);
        this.wm.focusNextAvailableWindow(this.id);
    }

    restore() {
        if (!this.isMinimized) return;
        this.element.classList.remove('minimized-state');
        this.isMinimized = false;
        this.emit('restore', this);
        this.bringToFront();
    }

    toggleMaximize() {
        const iconElement = this.maximizeButton.querySelector('i');
        if (this.isMaximized) {
            this.element.style.top = this.originalState.top;
            this.element.style.left = this.originalState.left;
            this.element.style.width = this.originalState.width;
            this.element.style.height = this.originalState.height;
            this.element.classList.remove('maximized-state');
            iconElement.classList.remove('fa-window-restore');
            iconElement.classList.add('fa-square');
            this.isMaximized = false;
        } else {
            this.originalState = {
                top: this.element.style.top,
                left: this.element.style.left,
                width: this.element.style.width,
                height: this.element.style.height,
            };
            const taskbarHeight = this.wm.webOS.taskbar.element.offsetHeight;
            this.element.style.top = '0px';
            this.element.style.left = '0px';
            this.element.style.width = '100%';
            this.element.style.height = `calc(100% - ${taskbarHeight}px)`;
            this.element.classList.add('maximized-state');
            iconElement.classList.remove('fa-square');
            iconElement.classList.add('fa-window-restore');
            this.isMaximized = true;
        }
        this.emit('maximize', { window: this, isMaximized: this.isMaximized });
        this.bringToFront();
    }

    getAppId() {
        const parts = this.id.split('-');
        return parts.slice(0, -1).join('-');
    }
}