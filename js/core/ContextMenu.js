// js/core/ContextMenu.js
// Clase ContextMenu: Implementa menús contextuales personalizados en el sistema
export class ContextMenu {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = null;

        // Configuración de event listeners globales
        document.addEventListener('click', (event) => {
            // Verificar si el clic está en el widget del reloj para evitar cerrar el menú
            if (this.webOS.taskbar && this.webOS.taskbar.clockCalendarWidget) {
                if (this.webOS.taskbar.clockCalendarWidget.element.contains(event.target) ||
                    (this.webOS.taskbar.clockCalendarWidget.triggerElement &&
                     this.webOS.taskbar.clockCalendarWidget.triggerElement.contains(event.target))) {
                    return;
                }
            }
            this.hide();
        }, true);
        document.addEventListener('contextmenu', (e) => {
            // If the context menu itself is right-clicked, don't immediately hide it
            // (or rather, let the new one replace it if it's a different context menu trigger)
            if (this.element && this.element.contains(e.target)) {
                // Allow context menu on the context menu itself (e.g., for browser dev tools)
            } else {
                this.hide();
            }
        }, true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        }, true);
    }

    // Crea el DOM del menú contextual en las coordenadas especificadas
    _createDOM(x, y, items) {
        this.hide();

        const menuEl = document.createElement('div');
        menuEl.className = 'context-menu';
        const ul = document.createElement('ul');

        items.forEach(item => {
            if (item.separator) {
                const sep = document.createElement('li');
                sep.className = 'context-menu-separator';
                ul.appendChild(sep);
                return;
            }
            const li = document.createElement('li');
            if (item.disabled) li.classList.add('disabled');

            li.innerHTML = `<i class="fas ${item.icon || 'fa-angle-right'}"></i> <span>${item.label}</span>`;

            if (!item.disabled) {
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof item.action === 'function') item.action();
                    this.hide();
                });
            }
            ul.appendChild(li);
        });
        menuEl.appendChild(ul);

        menuEl.style.top = `${y}px`;
        menuEl.style.left = `${x}px`;

        document.body.appendChild(menuEl);
        this.element = menuEl;

        const rect = menuEl.getBoundingClientRect();
        const margin = 5; // Small margin from window edge
        if (rect.right > window.innerWidth - margin) {
            menuEl.style.left = `${window.innerWidth - rect.width - margin}px`;
        }
        if (rect.bottom > window.innerHeight - margin) {
            menuEl.style.top = `${window.innerHeight - rect.height - margin}px`;
        }
        if (rect.left < margin) {
            menuEl.style.left = `${margin}px`;
        }
        if (rect.top < margin) {
            menuEl.style.top = `${margin}px`;
        }
    }

    // Muestra el menú contextual en las coordenadas especificadas
    show(x, y, items) {
        if (!items || items.length === 0) return;
        // Request animation frame to ensure any previous menu is hidden and DOM is updated
        requestAnimationFrame(() => {
            this._createDOM(x, y, items);
        });
    }

    // Oculta el menú contextual
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}