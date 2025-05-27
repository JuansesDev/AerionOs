// Clase Window: Representa una ventana individual en el sistema
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
            x: null, y: null, // Posición inicial
            resizable: true, // Para futuras implementaciones
            ...options
        };

        this.element = this._createDOM();
        this._setupEventListeners();

        this.isMinimized = false;
        this.isMaximized = false;
        this.originalState = {}; // Guarda el estado para restaurar después de maximizar

        // Configuración inicial de tamaño y posición
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;

        if (this.options.x !== null && this.options.y !== null) {
            this.element.style.left = `${this.options.x}px`;
            this.element.style.top = `${this.options.y}px`;
        } else {
            // Posicionamiento en cascada por defecto
            const existingWindows = Object.keys(this.wm.openWindows).length;
            const taskbarHeight = this.wm.webOS.taskbar?.element.offsetHeight || 45; // Valor por defecto si la barra de tareas no está lista
            const desktopRect = this.wm.webOS.desktop.element.getBoundingClientRect();

            let top = 40 + (existingWindows % 7) * 25; // Mayor separación en cascada
            let left = 60 + (existingWindows % 10) * 25;

            if (top + this.options.height > desktopRect.height - taskbarHeight) top = 20;
            if (left + this.options.width > desktopRect.width) left = 20;
            this.element.style.top = `${top}px`;
            this.element.style.left = `${left}px`;
        }

        this.wm.webOS.desktop.element.appendChild(this.element);
        this.bringToFront(); // Esto también emitirá 'focus'
    }

    // Crea el DOM de la ventana
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
        if (this.options.customClass) { // Agrega clase específica de la app
            windowElement.classList.add(this.options.customClass);
        }

        return windowElement;
    }

    // Configura los event listeners de la ventana
    _setupEventListeners() {
        this.headerElement.addEventListener('mousedown', (e) => this._onDragStart(e));
        this.element.addEventListener('mousedown', (e) => {
            // Prevenir selección de texto al hacer clic en partes de la ventana que no son campos de entrada
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

        // Guarda el estado inicial, para poder calcular el cambio de tamaño
        const rect = this.element.getBoundingClientRect();
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startLeft = rect.left;
        this.startTop = rect.top;

        // Referencias para los listeners
        this._onResizeMoveRef = (ev) => this._onResizeMove(ev);
        this._onResizeEndRef = (ev) => this._onResizeEnd(ev);

        // Cambiar el cursor y agregar clase de resizing
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

        // Lógica de cambio de tamaño según el borde
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

        // Respetar mínimos y ajustar posición solo si no se alcanzó el mínimo
        let minWidth = this.options.minWidth;
        let minHeight = this.options.minHeight;

        // Si el nuevo ancho es menor que el mínimo, no mover el left
        if (newWidth < minWidth) {
            newLeft = this.startLeft + (this.startWidth - minWidth);
            newWidth = minWidth;
        }
        // Si el nuevo alto es menor que el mínimo, no mover el top
        if (newHeight < minHeight) {
            newTop = this.startTop + (this.startHeight - minHeight);
            newHeight = minHeight;
        }

        // Aplicar cambios
        this.element.style.width = `${newWidth}px`;
        this.element.style.height = `${newHeight}px`;

        // Ajustar posición solo si se arrastra desde izquierda o arriba
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

    // Maneja el inicio del arrastre de la ventana
    _onDragStart(e) {
        if (e.button !== 0 || this.isMaximized) return;
        // Permitir arrastre solo si el mousedown es en el encabezado, no en los botones dentro del encabezado
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

    // Maneja el movimiento durante el arrastre
    _onDragMove(e) {
        if (!this.isDragging) return;

        let newX = e.clientX - this.offsetX;
        let newY = e.clientY - this.offsetY;

        const desktopRect = this.wm.webOS.desktop.element.getBoundingClientRect();
        const headerHeight = this.headerElement.offsetHeight;

        // Mantener la ventana dentro de los límites del escritorio
        newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
        newY = Math.max(0, Math.min(newY, desktopRect.height - headerHeight - 5)); // Permitir que el encabezado esté ligeramente fuera de la parte superior

        this.element.style.left = `${newX}px`;
        this.element.style.top = `${newY}px`;
    }

    // Maneja el fin del arrastre
    _onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.style.cursor = 'default';
        this.headerElement.style.cursor = 'move';
        document.removeEventListener('mousemove', this._onDragMoveRef);
        // El listener de mouseup ya se eliminó debido a { once: true }
    }

    // Establece el contenido de la ventana
    setContent(htmlOrElement) {
        this.contentElement.innerHTML = '';
        if (typeof htmlOrElement === 'string') {
            this.contentElement.innerHTML = htmlOrElement;
        } else if (htmlOrElement instanceof HTMLElement) {
            this.contentElement.appendChild(htmlOrElement);
        }
    }

    // Cambia el título de la ventana
    setTitle(newTitle) {
        this.title = newTitle;
        if (this.titleElement) this.titleElement.textContent = newTitle;
        this.emit('titleChanged', newTitle); // Para actualización de la barra de tareas
    }

    // Cambia el icono de la ventana
    setIcon(newIconClass) {
        this.iconClass = newIconClass;
        if (this.iconElement) this.iconElement.className = newIconClass;
        this.emit('iconChanged', newIconClass); // Para actualización de la barra de tareas
    }

    // Trae la ventana al frente
    bringToFront() {
        this.wm.bringToFront(this);
        this.emit('focus', this); // Pasar referencia a sí mismo
    }

    // Cierra la ventana
    close() {
        this.emit('beforeClose', this); // Permitir que la app intercepte
        // Si el manejador 'beforeClose' no previene el cierre, proceder
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.wm.closeWindow(this.id);
            this.emit('close', this);
        }, 200); // Coincidir con la transición CSS
    }

    // Minimiza la ventana
    minimize() {
        if (this.isMinimized) return;
        this.element.classList.add('minimized-state');
        this.isMinimized = true;
        this.emit('minimize', this);
        this.wm.focusNextAvailableWindow(this.id);
    }

    // Restaura una ventana minimizada
    restore() {
        if (!this.isMinimized) return;
        this.element.classList.remove('minimized-state');
        this.isMinimized = false;
        this.emit('restore', this);
        this.bringToFront();
    }

    // Alterna entre estado normal y maximizado
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
        this.bringToFront(); // Asegurar que esté arriba después del cambio de estado
    }

    // Obtiene el ID de la aplicación asociada a la ventana
    getAppId() {
        // El ID de ventana está estructurado como "appId-winInstanceNum"
        const parts = this.id.split('-');
        return parts.slice(0, -1).join('-'); // Maneja IDs de apps con guiones
    }
}