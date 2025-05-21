// js/ui/Desktop.js
export class Desktop {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = document.createElement('div');
        this.element.id = 'desktop';
        this.iconPositions = {}; // { appId: { col, row } }
        this.draggedIcon = null;

        // Estas dimensiones deben ser consistentes con tu CSS
        // (tamaño del icono + gap)
        // CSS: minmax(90px, ...) + gap: 10px -> 90 + 10 = 100 (pero usamos el tamaño del contenido directo)
        // El cálculo de drop usa esto para determinar la celda, el padding de #desktop y el gap de grid
        // se manejan por el navegador al colocar los elementos.
        // Lo importante es que el tamaño de la "zona sensible" de cada celda sea correcto.
        this.GRID_CELL_WIDTH = 90 + 10; // (icon width + grid gap)
        this.GRID_CELL_HEIGHT = 100 + 10; // (icon height + grid gap)

        this.loadIconPositions();
        this.loadWallpaper();
        this._setupEventListeners();
        this._setupDragAndDrop();
    }

    loadIconPositions() {
        if (this._hasActiveUser()) {
            const savedPositions = this.webOS.userSession.getUserSetting('desktopIconPositions');
            if (savedPositions) {
                this.iconPositions = savedPositions;
                console.log('Loaded icon positions:', this.iconPositions);
            } else {
                this.iconPositions = {};
                console.log('No saved icon positions found, will use auto-placement.');
            }
        } else {
            this.iconPositions = {};
        }
    }

    saveIconPositions() {
        if (this._hasActiveUser()) {
            this.webOS.userSession.setUserSetting('desktopIconPositions', this.iconPositions);
            console.log('Saved icon positions:', this.iconPositions);
        } else {
            console.warn('No active user session, icon positions not saved.');
        }
    }

    _findNextAvailableSlot() {
        const occupiedSlots = new Set();
        Object.values(this.iconPositions).forEach(pos => {
            if (pos && typeof pos.col === 'number' && typeof pos.row === 'number') {
                occupiedSlots.add(`${pos.col}-${pos.row}`);
            }
        });

        let col = 1, row = 1;
        const desktopRect = this.element.getBoundingClientRect();

        // Usar clientHeight y clientWidth si son > 0, sino fallbacks
        // Considerar el padding del #desktop al calcular el espacio disponible para celdas
        const desktopPaddingTop = parseFloat(getComputedStyle(this.element).paddingTop) || 0;
        const desktopPaddingLeft = parseFloat(getComputedStyle(this.element).paddingLeft) || 0;

        const availableHeight = (desktopRect.height > 0 ? desktopRect.height : (window.innerHeight - 40)) - desktopPaddingTop * 2; // - taskbar, - padding
        const availableWidth = (desktopRect.width > 0 ? desktopRect.width : (window.innerWidth - 20)) - desktopPaddingLeft * 2; // - scrollbar, - padding

        let maxRowsEffective = 1;
        if (availableHeight > 0 && this.GRID_CELL_HEIGHT > 0) {
            maxRowsEffective = Math.max(1, Math.floor(availableHeight / this.GRID_CELL_HEIGHT));
        } else {
            maxRowsEffective = Math.floor((window.innerHeight - 40 - desktopPaddingTop * 2) / this.GRID_CELL_HEIGHT) || 5; // Fallback general
        }

        let maxColsEffective = 1;
        if (availableWidth > 0 && this.GRID_CELL_WIDTH > 0) {
            maxColsEffective = Math.max(1, Math.floor(availableWidth / this.GRID_CELL_WIDTH));
        } else {
            maxColsEffective = Math.floor((window.innerWidth - 20 - desktopPaddingLeft * 2) / this.GRID_CELL_WIDTH) || 5; // Fallback general
        }

        let attempts = 0;
        // Aumentar el número de intentos para ser más exhaustivo si es necesario
        const maxTotalSlotsToTry = (maxRowsEffective * maxColsEffective) + (maxRowsEffective + maxColsEffective) * 2; // Más que el total de celdas visibles

        // Lógica "Column-first": llenar verticalmente, luego pasar a la siguiente columna
        while (attempts < maxTotalSlotsToTry) {
            if (!occupiedSlots.has(`${col}-${row}`)) {
                return { col, row };
            }

            col++; // Intentar la siguiente columna en la misma fila
            if (col > maxColsEffective) { // Si superamos las columnas disponibles en esta fila
                col = 1;       // Resetear a la primera columna
                row++;         // Mover a la siguiente fila
            }

            // Si nos salimos de las filas calculadas y hemos probado muchas veces, ir a fallback
            if (row > maxRowsEffective && attempts > maxRowsEffective * maxColsEffective) {
                 break;
            }
            attempts++;
        }

        // Fallback si no se encontró un slot después de muchos intentos
        // Este fallback intenta seguir la misma lógica column-first, pero permitiendo que col/row
        // excedan los maxColsEffective/maxRowsEffective calculados, asumiendo que el grid puede expandirse.
        console.warn(`Could not find an empty slot after ${attempts} attempts within calculated bounds. Trying extended fallback placement.`);
        // Continuar desde donde se quedó col, row, o reiniciar si row ya era muy grande
        if (row > maxRowsEffective + 3) { // Si 'row' ya se pasó mucho, reiniciar búsqueda más allá
            row = 1;
            col = maxColsEffective + 1; // Empezar en una nueva columna más allá de lo visible
        }

        let fallbackAttempts = 0;
        // Permitir un número generoso de intentos adicionales
        const maxFallbackAttempts = (maxColsEffective + 10) * (maxRowsEffective + 10);

        while(fallbackAttempts < maxFallbackAttempts) {
            if (!occupiedSlots.has(`${col}-${row}`)) {
                return { col, row };
            }
            col++;
            // Permitir que las columnas crezcan más allá de maxColsEffective
            if (col > (maxColsEffective + 10)) {
                col = 1;
                row++;
            }
            fallbackAttempts++;
             // Si nos pasamos de un número razonable de filas en fallback
            if (row > maxRowsEffective + 10) break;
        }

        console.error("Ultimate fallback for _findNextAvailableSlot: Could not place icon. Returning 1,1 (may cause overlap).");
        return { col: 1, row: 1 }; // Como último recurso, puede causar superposición
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
        iconEl.draggable = true;
        iconEl.innerHTML = `
            <i class="${appIconClass || 'fas fa-question-circle'} fa-3x"></i>
            <span>${appName}</span>
        `;
        iconEl.addEventListener('dblclick', (e) => {
            // Prevenir que dblclick en el icono active el drag (Firefox a veces lo hace)
            e.preventDefault();
            this.webOS.launchApp(appId);
        });

        // Prevenir que el drag se inicie si el dblclick está en progreso (manejo de dblclick vs drag)
        let clickTimer = null;
        iconEl.addEventListener('mousedown', (e) => {
            // Solo botón izquierdo
            if (e.button !== 0) return;
            clickTimer = setTimeout(() => {
                clickTimer = null; // Si pasa el tiempo, no es dblclick
            }, 300); // Umbral de doble clic
        });
        iconEl.addEventListener('mouseup', () => {
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
        });


        let position = this.iconPositions[appId];
        if (!position || typeof position.col !== 'number' || typeof position.row !== 'number') {
            console.log(`No saved position for ${appId}, finding new slot...`);
            position = this._findNextAvailableSlot();
            this.iconPositions[appId] = position;
            // Es importante guardar inmediatamente si es un icono nuevo
            // para que el siguiente _findNextAvailableSlot lo tenga en cuenta.
            // No se guardará en userSession hasta un drag explícito o al cerrar/actualizar.
        }

        iconEl.style.gridColumnStart = position.col;
        iconEl.style.gridRowStart = position.row;

        this.element.appendChild(iconEl);
    }

    _setupDragAndDrop() {
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('desktop-icon')) {
                // Comprobar si fue un click rápido (intento de dblclick)
                // No es perfecto, pero puede ayudar a evitar drags no deseados en dblclick
                const isDoubleClickAttempt = e.target.dataset.isDoubleClickAttempt === 'true';
                delete e.target.dataset.isDoubleClickAttempt;
                if (isDoubleClickAttempt) {
                    e.preventDefault();
                    return;
                }

                this.draggedIcon = e.target;
                e.dataTransfer.setData('text/plain', e.target.dataset.appId);
                e.dataTransfer.effectAllowed = 'move';
                // Pequeño timeout para que el navegador capture el "fantasma" antes de aplicar la clase
                setTimeout(() => {
                    if(this.draggedIcon) this.draggedIcon.classList.add('dragging');
                }, 0);
            }
        });

        this.element.addEventListener('dragend', (e) => {
            if (this.draggedIcon) {
                this.draggedIcon.classList.remove('dragging');
                this.draggedIcon = null;
            }
        });

        // Permitir soltar sobre el escritorio
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.draggedIcon) return;

            const droppedAppId = e.dataTransfer.getData('text/plain');
            const iconBeingDragged = this.draggedIcon;

            if (iconBeingDragged && iconBeingDragged.dataset.appId === droppedAppId) {
                const desktopRect = this.element.getBoundingClientRect();
                // Posición del ratón relativa al escritorio
                // Ajustar por el padding del escritorio para calcular la celda correctamente
                const desktopStyle = getComputedStyle(this.element);
                const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
                const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

                const x = e.clientX - desktopRect.left - desktopPaddingLeft;
                const y = e.clientY - desktopRect.top - desktopPaddingTop;

                // Calcular la celda del grid (sumamos 1 porque grid-column/row son 1-indexed)
                const targetCol = Math.max(1, Math.floor(x / this.GRID_CELL_WIDTH) + 1);
                const targetRow = Math.max(1, Math.floor(y / this.GRID_CELL_HEIGHT) + 1);

                // Verificar si la celda destino está ocupada por OTRO icono
                const occupyingAppId = Object.keys(this.iconPositions).find(id =>
                    id !== droppedAppId &&
                    this.iconPositions[id] && // Asegurarse que la posición exista
                    this.iconPositions[id].col === targetCol &&
                    this.iconPositions[id].row === targetRow
                );

                if (occupyingAppId) {
                    // La celda está ocupada por otro icono. No mover.
                    console.warn(`Slot ${targetCol},${targetRow} is occupied by app ${occupyingAppId}. Icon ${droppedAppId} will not move there.`);
                } else {
                    // La celda está libre o es la celda original del icono (si se soltó sin que otro la ocupe)
                    iconBeingDragged.style.gridColumnStart = targetCol;
                    iconBeingDragged.style.gridRowStart = targetRow;

                    // Actualizar la posición en memoria
                    this.iconPositions[droppedAppId] = { col: targetCol, row: targetRow };
                    // Guardar todas las posiciones en la sesión del usuario
                    this.saveIconPositions();
                }
            }

            // dragend se encargará de quitar la clase 'dragging' y limpiar this.draggedIcon
        });
    }


    loadWallpaper() {
        const defaultWallpaper = 'https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png';
        const savedWallpaper = this._hasActiveUser() ? this.webOS.userSession.getUserSetting('wallpaper') : null;
        // console.log('Loading wallpaper:', savedWallpaper || '(none saved, using default)');

        if (savedWallpaper && (savedWallpaper.startsWith('http') || savedWallpaper.startsWith('data:image'))) {
            this.element.style.backgroundImage = `url('${savedWallpaper}')`;
        } else {
            this.element.style.backgroundImage = `url('${defaultWallpaper}')`;
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

    _hasActiveUser() {
        return this.webOS &&
               this.webOS.userSession &&
               this.webOS.userSession.currentUser;
    }

    _setupEventListeners() {
        this.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Evitar menú contextual si se está arrastrando un icono o si el target es un icono
            if (this.draggedIcon || e.target.closest('.desktop-icon')) {
                // Podrías tener un menú contextual diferente para los iconos aquí
                // Por ahora, simplemente no mostramos el menú del escritorio.
                return;
            }

            const items = [
                { label: 'Cambiar Fondo (Ajustes)', icon: 'fa-palette', action: () => this.webOS.launchApp('settings') },
                { label: 'Actualizar Escritorio', icon: 'fa-sync-alt', action: () => {
                    // Guardar posiciones actuales antes de recargar, por si acaso
                    this.saveIconPositions();
                    this.element.querySelectorAll('.desktop-icon').forEach(icon => icon.remove());
                    // Volver a cargar posiciones (por si algo cambió externamente, aunque no debería ser común)
                    this.loadIconPositions();
                    this.webOS._populateDesktop(); // Asumiendo que este método existe y llama a addIcon
                 } },
                 { separator: true},
                 { label: 'Acerca de AuraOS', icon: 'fa-info-circle', action: () => {
                    const windowId = 'about-auraos-desktop';
                    const existingWindow = this.webOS.windowManager.getWindowById(windowId);
                    if (existingWindow) {
                        existingWindow.focus();
                        return;
                    }
                    const aboutWindow = this.webOS.windowManager.createWindow(
                        windowId,
                        'Acerca de AuraOS',
                        'fas fa-info-circle',
                        { width: 420, height: 320, minWidth: 350, minHeight: 280, customClass: 'about-window-theme' }
                    );
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
                    if (aboutWindow) {
                        aboutWindow.setContent(aboutContentHTML);
                    } else {
                        console.error("No se pudo crear la ventana 'Acerca de AuraOS'");
                    }
                 } }
            ];
            this.webOS.contextMenu.show(e.clientX, e.clientY, items);
        });

        // Añadir un listener para cerrar modales personalizados haciendo clic fuera de ellos
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-modal-overlay')) {
                e.target.remove();
            }
        });
    }

    showAlertModal(message, title = 'Alerta', icon = 'fa-exclamation-circle') {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const header = document.createElement('div');
        header.className = 'custom-modal-header';
        header.innerHTML = `
            <i class="fas ${icon}"></i>
            <h3>${title}</h3>
        `;

        const body = document.createElement('div');
        body.className = 'custom-modal-body';
        body.innerHTML = `<p>${message}</p>`;

        const footer = document.createElement('div');
        footer.className = 'custom-modal-footer';

        const okButton = document.createElement('button');
        okButton.className = 'confirm';
        okButton.textContent = 'Aceptar';

        footer.appendChild(okButton);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // Enfocar el botón automáticamente
        setTimeout(() => okButton.focus(), 100);

        // Manejar el evento Enter y Espacio para confirmar
        const handleKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeydown);

        okButton.addEventListener('click', closeModal);

        function closeModal() {
            document.removeEventListener('keydown', handleKeydown);
            document.body.removeChild(overlay);
        }
    }

    showConfirmModal(message, onConfirm, title = 'Confirmar', confirmText = 'Aceptar', cancelText = 'Cancelar', icon = 'fa-question-circle') {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const header = document.createElement('div');
        header.className = 'custom-modal-header';
        header.innerHTML = `
            <i class="fas ${icon}"></i>
            <h3>${title}</h3>
        `;

        const body = document.createElement('div');
        body.className = 'custom-modal-body';
        body.innerHTML = `<p>${message}</p>`;

        const footer = document.createElement('div');
        footer.className = 'custom-modal-footer';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel';
        cancelButton.textContent = cancelText;

        const confirmButton = document.createElement('button');
        confirmButton.className = 'confirm';
        confirmButton.textContent = confirmText;

        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // Enfocar el botón de confirmar automáticamente
        setTimeout(() => confirmButton.focus(), 100);

        // Manejar el evento Enter para confirmar y Escape para cancelar
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
                closeModal();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeydown);

        cancelButton.addEventListener('click', closeModal);
        confirmButton.addEventListener('click', () => {
            onConfirm();
            closeModal();
        });

        function closeModal() {
            document.removeEventListener('keydown', handleKeydown);
            document.body.removeChild(overlay);
        }
    }
}