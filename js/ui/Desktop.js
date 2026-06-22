export class Desktop {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = document.createElement('div');
        this.element.id = 'desktop';
        this.iconPositions = {};
        this.draggedIcon = null;

        this.GRID_CELL_WIDTH = 90 + 10;
        this.GRID_CELL_HEIGHT = 100 + 10;

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

        const desktopPaddingTop = parseFloat(getComputedStyle(this.element).paddingTop) || 0;
        const desktopPaddingLeft = parseFloat(getComputedStyle(this.element).paddingLeft) || 0;

        const availableHeight = (desktopRect.height > 0 ? desktopRect.height : (window.innerHeight - 40)) - desktopPaddingTop * 2;
        const availableWidth = (desktopRect.width > 0 ? desktopRect.width : (window.innerWidth - 20)) - desktopPaddingLeft * 2;

        let maxRowsEffective = 1;
        if (availableHeight > 0 && this.GRID_CELL_HEIGHT > 0) {
            maxRowsEffective = Math.max(1, Math.floor(availableHeight / this.GRID_CELL_HEIGHT));
        } else {
            maxRowsEffective = Math.floor((window.innerHeight - 40 - desktopPaddingTop * 2) / this.GRID_CELL_HEIGHT) || 5;
        }

        let maxColsEffective = 1;
        if (availableWidth > 0 && this.GRID_CELL_WIDTH > 0) {
            maxColsEffective = Math.max(1, Math.floor(availableWidth / this.GRID_CELL_WIDTH));
        } else {
            maxColsEffective = Math.floor((window.innerWidth - 20 - desktopPaddingLeft * 2) / this.GRID_CELL_WIDTH) || 5;
        }

        let attempts = 0;
        const maxTotalSlotsToTry = (maxRowsEffective * maxColsEffective) + (maxRowsEffective + maxColsEffective) * 2;

        while (attempts < maxTotalSlotsToTry) {
            if (!occupiedSlots.has(`${col}-${row}`)) {
                return { col, row };
            }

            col++;
            if (col > maxColsEffective) {
                col = 1;
                row++;
            }

            if (row > maxRowsEffective && attempts > maxRowsEffective * maxColsEffective) {
                 break;
            }
            attempts++;
        }

        console.warn(`Could not find an empty slot after ${attempts} attempts within calculated bounds. Trying extended fallback placement.`);
        if (row > maxRowsEffective + 3) {
            row = 1;
            col = maxColsEffective + 1;
        }

        let fallbackAttempts = 0;
        const maxFallbackAttempts = (maxColsEffective + 10) * (maxRowsEffective + 10);

        while(fallbackAttempts < maxFallbackAttempts) {
            if (!occupiedSlots.has(`${col}-${row}`)) {
                return { col, row };
            }
            col++;
            if (col > (maxColsEffective + 10)) {
                col = 1;
                row++;
            }
            fallbackAttempts++;
            if (row > maxRowsEffective + 10) break;
        }

        console.error("Ultimate fallback for _findNextAvailableSlot: Could not place icon. Returning 1,1 (may cause overlap).");
        return { col: 1, row: 1 };
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
            e.preventDefault();
            this.webOS.launchApp(appId);
        });

        let clickTimer = null;
        iconEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            clickTimer = setTimeout(() => {
                clickTimer = null;
            }, 300);
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
        }

        iconEl.style.gridColumnStart = position.col;
        iconEl.style.gridRowStart = position.row;

        this.element.appendChild(iconEl);
    }

    _setupDragAndDrop() {
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('desktop-icon')) {
                const isDoubleClickAttempt = e.target.dataset.isDoubleClickAttempt === 'true';
                delete e.target.dataset.isDoubleClickAttempt;
                if (isDoubleClickAttempt) {
                    e.preventDefault();
                    return;
                }

                this.draggedIcon = e.target;
                e.dataTransfer.setData('text/plain', e.target.dataset.appId);
                e.dataTransfer.effectAllowed = 'move';
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
                const desktopStyle = getComputedStyle(this.element);
                const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
                const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

                const x = e.clientX - desktopRect.left - desktopPaddingLeft;
                const y = e.clientY - desktopRect.top - desktopPaddingTop;

                const targetCol = Math.max(1, Math.floor(x / this.GRID_CELL_WIDTH) + 1);
                const targetRow = Math.max(1, Math.floor(y / this.GRID_CELL_HEIGHT) + 1);

                const occupyingAppId = Object.keys(this.iconPositions).find(id =>
                    id !== droppedAppId &&
                    this.iconPositions[id] &&
                    this.iconPositions[id].col === targetCol &&
                    this.iconPositions[id].row === targetRow
                );

                if (occupyingAppId) {
                    console.warn(`Slot ${targetCol},${targetRow} is occupied by app ${occupyingAppId}. Icon ${droppedAppId} will not move there.`);
                } else {
                    iconBeingDragged.style.gridColumnStart = targetCol;
                    iconBeingDragged.style.gridRowStart = targetRow;

                    this.iconPositions[droppedAppId] = { col: targetCol, row: targetRow };
                    this.saveIconPositions();
                }
            }
        });
    }


    loadWallpaper() {
        const defaultWallpaper = 'public/AerionOs.png';
        const savedWallpaper = this._hasActiveUser() ? this.webOS.userSession.getUserSetting('wallpaper') : null;

        if (savedWallpaper && (savedWallpaper.startsWith('http') || savedWallpaper.startsWith('data:image') || savedWallpaper.startsWith('public/'))) {
            this.element.style.backgroundImage = `url('${savedWallpaper}')`;
        } else {
            this.element.style.backgroundImage = `url('${defaultWallpaper}')`;
            if (this._hasActiveUser()) {
                this.webOS.userSession.setUserSetting('wallpaper', defaultWallpaper);
            }
        }
    }

    setWallpaper(url) {
        const defaultWallpaper = 'public/AerionOs.png';
        if (url && (url.startsWith('http') || url.startsWith('data:image') || url.startsWith('public/'))) {
            this.element.style.backgroundImage = `url('${url}')`;
            if (this._hasActiveUser()) {
                this.webOS.userSession.setUserSetting('wallpaper', url);
                console.log('Wallpaper set to:', url);
            } else {
                console.warn('No active user session, wallpaper applied but not saved');
            }
        } else if (url === "") {
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
            if (this.draggedIcon || e.target.closest('.desktop-icon')) {
                return;
            }

            const items = [
                { label: 'Change Wallpaper (Settings)', icon: 'fa-palette', action: () => this.webOS.launchApp('settings') },
                { label: 'Refresh Desktop', icon: 'fa-sync-alt', action: () => {
                    this.saveIconPositions();
                    this.element.querySelectorAll('.desktop-icon').forEach(icon => icon.remove());
                    this.loadIconPositions();
                    this.webOS._populateDesktop();
                 } },
                 { separator: true},
                 { label: 'About AerionOs', icon: 'fa-info-circle', action: () => {
                    const windowId = 'about-AerionOs-desktop';
                    const existingWindow = this.webOS.windowManager.getWindowById(windowId);
                    if (existingWindow) {
                        existingWindow.focus();
                        return;
                    }
                    const aboutWindow = this.webOS.windowManager.createWindow(
                        windowId,
                        'About AerionOs',
                        'fas fa-info-circle',
                        { width: 420, height: 320, minWidth: 350, minHeight: 280, customClass: 'about-window-theme' }
                    );
                    const aboutContentHTML = `
                        <div style="padding: 20px; line-height: 1.6; color: var(--text-color); font-family: var(--font-family);">
                            <h3 style="margin-bottom: 15px; color: var(--accent-color); text-align: center; font-size: 1.6em; font-weight: 500;">
                                <i class="fab fa-linux" style="margin-right: 8px;"></i>AerionOs
                            </h3>
                            <p style="text-align: center; font-size: 0.95em; margin-bottom: 10px;">Version 0.5 (Community Edition)</p>
                            <p style="text-align: center; margin-bottom: 15px;">
                                Developed by: <strong style="color: var(--accent-color-hover);">JuansesDev</strong>
                            </p>
                            <p style="font-size: 0.9em; margin-bottom:8px;">
                                AerionOs is an interactive web operating system simulator,
                                designed to demonstrate front-end development skills
                                using HTML, CSS and modular JavaScript.
                            </p>
                            <p style="font-size:0.9em;margin-top:10px;">
                                Default background images provided by
                                <a href="https://pixeldreamsgallery.me/" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color);text-decoration:none;">Pixel Dreams Gallery</a> and other sources.
                            </p>
                            <p style="text-align:center;margin-top:25px;font-size:0.85em;color:var(--text-color-darker);">
                                © ${new Date().getFullYear()} JuansesDev.
                            </p>
                        </div>
                    `.trim();
                    if (aboutWindow) {
                        aboutWindow.setContent(aboutContentHTML);
                    } else {
                        console.error("Could not create the 'About AerionOs' window");
                    }
                 } }
            ];
            this.webOS.contextMenu.show(e.clientX, e.clientY, items);
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-modal-overlay')) {
                e.target.remove();
            }
        });
    }

    showAlertModal(message, title = 'Alert', icon = 'fa-exclamation-circle') {
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
        okButton.textContent = 'OK';

        footer.appendChild(okButton);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        setTimeout(() => okButton.focus(), 100);

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

    showConfirmModal(message, onConfirm, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', icon = 'fa-question-circle') {
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

        setTimeout(() => confirmButton.focus(), 100);

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
