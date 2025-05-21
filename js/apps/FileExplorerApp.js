// Clase FileExplorerApp: Implementa un explorador de archivos
import { App } from '../core/App.js';

export class FileExplorerApp extends App {
    constructor(webOS) {
        super('files', 'Explorador', 'fas fa-folder-open', webOS, {
            window: { width: 750, height: 550, minWidth: 500, minHeight: 350, customClass: 'files-app' }
        });
        this.currentPath = '/';
        this.history = ['/'];
        this.historyIndex = 0;
        this.selectedItem = null;
        this.activeWindowInstance = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        // Configuración de la interfaz del explorador de archivos
        // Componentes:
        // - Barra de herramientas con navegación y acciones
        // - Panel lateral con accesos directos a carpetas importantes
        // - Área principal para mostrar archivos y carpetas

        contentElement.innerHTML = `
            <div class="file-explorer-toolbar">
                <button data-action="back" title="Atrás"><i class="fas fa-arrow-left"></i></button>
                <button data-action="forward" title="Adelante"><i class="fas fa-arrow-right"></i></button>
                <button data-action="up" title="Subir un nivel"><i class="fas fa-level-up-alt"></i></button>
                <button data-action="refresh" title="Refrescar"><i class="fas fa-sync-alt"></i></button>
                <input type="text" class="file-explorer-path-bar" placeholder="Ruta" spellcheck="false">
                <button data-action="new-folder" title="Nueva carpeta"><i class="fas fa-folder-plus"></i></button>
                <button data-action="new-file" title="Nuevo archivo de texto"><i class="fas fa-file-medical"></i></button>
            </div>
            <div class="file-explorer-container">
                <div class="file-explorer-sidebar">
                    <ul>
                        <li data-path="/">Raíz</li>
                        <li data-path="/Desktop">Escritorio</li>
                        <li data-path="/Documents">Documentos</li>
                        <li data-path="/Downloads">Descargas</li>
                        <li data-path="/Pictures">Imágenes</li>
                        <li data-path="/Music">Música</li>
                        <li data-path="/Videos">Videos</li>
                    </ul>
                </div>
                <div class="file-explorer-main-area">
                    <!-- Contenido del directorio actual -->
                </div>
            </div>
        `;

        this.mainArea = contentElement.querySelector('.file-explorer-main-area');
        this.pathBar = contentElement.querySelector('.file-explorer-path-bar');
        this.backButton = contentElement.querySelector('[data-action="back"]');
        this.forwardButton = contentElement.querySelector('[data-action="forward"]');
        this.upButton = contentElement.querySelector('[data-action="up"]');
        this.sidebar = contentElement.querySelector('.file-explorer-sidebar ul');
        this.fileExplorerContainer = contentElement.querySelector('.file-explorer-container');

        // Guardar la referencia a la ventana
        this.activeWindowInstance = windowInstance;

        contentElement.querySelector('.file-explorer-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) this._handleToolbarAction(button.dataset.action);
        });

        this.pathBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.navigateTo(this.pathBar.value.trim());
            }
        });
        // El listener de 'blur' fue comentado para depuración, puedes decidir si reincorporarlo.
        // this.pathBar.addEventListener('blur', () => {
        //      if (this.pathBar.value.trim() !== this.currentPath) this.navigateTo(this.pathBar.value.trim());
        // });

        this.sidebar.addEventListener('click', (e) => {
            const li = e.target.closest('li[data-path]');
            if (li && li.dataset.path) {
                console.log('[SIDEBAR CLICK] Navigating to:', li.dataset.path);
                this.navigateTo(li.dataset.path);
            } else if (li) {
                console.warn('[SIDEBAR CLICK] Clicked on li, but no data-path found:', li);
            }
        });

        this.mainArea.addEventListener('dblclick', (e) => this._handleItemDoubleClick(e));
        this.mainArea.addEventListener('click', (e) => this._handleItemSingleClick(e));
        this.fileExplorerContainer.addEventListener('contextmenu', (e) => this._handleContextMenu(e));

        this.navigateTo(launchOptions?.path || this.currentPath, true);
    }

    _normalizePath(path) {
        if (typeof path !== 'string') {
            console.warn("normalizePath recibió un valor no string:", path);
            return '/';
        }
        let p = path.trim().replace(/\/+/g, '/');
        if (!p.startsWith('/')) p = '/' + p;
        if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
        return p || '/';
    }

    navigateTo(path, skipHistoryUpdate = false, isNavigatingHistory = false) {
        const normalizedPath = this._normalizePath(path);
        // console.log(`[NAVIGATE TO] Path: '${path}', Normalized: '${normalizedPath}', Current: '${this.currentPath}'`);

        if (!this.activeWindowInstance) {
            console.error("FileExplorerApp.navigateTo: activeWindowInstance no está definida.");
            // No podemos cambiar el título si no hay ventana, pero podríamos intentar navegar.
        }

        if (!this.webOS.fs.isDirectory(normalizedPath)) {
            // console.warn(`[NAVIGATE TO] Path '${normalizedPath}' is NOT a directory or does not exist.`);
            if (this.webOS.fs.isFile(normalizedPath)) {
                this._openFileItem(normalizedPath, normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1));
                if (this.pathBar) this.pathBar.value = this.currentPath;
                return false;
            }
            if (!isNavigatingHistory) { // Evitar alertas en navegación por historial si la ruta ya no es válida
                this.webOS.desktop.showAlertModal(`La ruta '${normalizedPath}' no es un directorio válido o no existe.`, 'Error de navegación', 'fa-exclamation-triangle');
            }
            if (this.pathBar) this.pathBar.value = this.currentPath;
            return false;
        }

        // console.log(`[NAVIGATE TO] Path '${normalizedPath}' IS a directory. Proceeding to render.`);
        const success = this.renderDirectory(normalizedPath);

        if (success) {
            // console.log(`[NAVIGATE TO] renderDirectory for '${normalizedPath}' was successful.`);
            this.currentPath = normalizedPath;

            if (this.activeWindowInstance) { // Usar la instancia de ventana guardada
                this.activeWindowInstance.setTitle(`Explorador - ${this.currentPath === '/' ? 'Raíz' : this.currentPath.substring(this.currentPath.lastIndexOf('/') + 1) || 'Raíz'}`);
            } else {
                console.warn("FileExplorer.navigateTo: activeWindowInstance no disponible para setTitle");
            }

            if (this.pathBar) this.pathBar.value = this.currentPath;
            // console.log(`[NAVIGATE TO] Pathbar set to: '${this.pathBar?.value || 'N/A'}'`);

            if (!skipHistoryUpdate) {
                if (this.historyIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                }
                if (this.history[this.historyIndex] !== this.currentPath) {
                    this.history.push(this.currentPath);
                    this.historyIndex = this.history.length - 1;
                }
            }

            this.updateNavButtons();
            this.updateSidebarActiveState();
            return true;
        } else {
             console.warn(`[NAVIGATE TO] renderDirectory for '${normalizedPath}' FAILED.`);
             if (this.pathBar) this.pathBar.value = this.currentPath;
             return false;
        }
    }

    renderDirectory(path) {
        // console.log(`[RENDER DIR] Rendering: ${path}`); // Path ya está normalizado
        const items = this.webOS.fs.listDirectory(path);

        if (items === null) {
            console.error(`[RENDER DIR] listDirectory for '${path}' returned null.`);
            return false;
        }

        this.mainArea.innerHTML = '';
        this.selectedItem = null;

        if (items.length === 0) {
            this.mainArea.innerHTML = '<p class="empty-folder-message">Esta carpeta está vacía.</p>';
            return true;
        }

        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'file-item';
            itemEl.dataset.name = item.name;
            itemEl.dataset.type = item.type;
            itemEl.dataset.path = this._normalizePath(path === '/' ? `/${item.name}` : `${path}/${item.name}`);

            let iconClass = 'fa-file';
            if (item.type === 'folder') iconClass = 'fa-folder';
            else if (item.name.endsWith('.txt')) iconClass = 'fa-file-alt';
            else if (/\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(item.name)) iconClass = 'fa-file-image';
            else if (/\.(mp3|wav|ogg|aac)$/i.test(item.name)) iconClass = 'fa-file-audio';
            else if (/\.(mp4|webm|mov|avi)$/i.test(item.name)) iconClass = 'fa-file-video';
            else if (/\.(zip|rar|tar|gz)$/i.test(item.name)) iconClass = 'fa-file-archive';

            itemEl.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span class="file-name">${item.name}</span>
                <span class="file-type">${item.type === 'folder' ? 'Carpeta' : 'Archivo'}</span>
                <span class="file-size">${item.type === 'folder' ? '-' : this._formatSize(item.size)}</span>
            `;
            this.mainArea.appendChild(itemEl);
        });
        return true;
    }

    updateSidebarActiveState() {
        // console.log(`[SIDEBAR UPDATE] Updating active state for currentPath: '${this.currentPath}'`);
        this.sidebar.querySelectorAll('li').forEach(li => {
            const liPath = this._normalizePath(li.dataset.path);
            const isActive = liPath === this.currentPath;
            li.classList.toggle('active', isActive);
        });
    }

    _handleToolbarAction(action) {
        switch(action) {
            case 'back': this._historyBack(); break;
            case 'forward': this._historyForward(); break;
            case 'up': this._navigateUp(); break;
            case 'refresh': this.navigateTo(this.currentPath, true); break;
            case 'new-folder': this._createNewFolder(); break;
            case 'new-file': this._createNewTextFile(); break;
        }
    }

    _historyBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.navigateTo(this.history[this.historyIndex], true, true);
        }
    }
    _historyForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.navigateTo(this.history[this.historyIndex], true, true);
        }
    }
    _navigateUp() {
        if (this.currentPath === '/') return;
        const parentPath = this.currentPath.substring(0, this.currentPath.lastIndexOf('/')) || '/';
        this.navigateTo(parentPath);
    }

    _createNewFolder() {
        this._showModal({
            title: 'Nueva Carpeta',
            icon: 'fa-folder-plus',
            inputLabel: 'Nombre de la nueva carpeta:',
            inputValue: 'Nueva Carpeta',
            confirmButtonText: 'Crear',
            validator: (value) => value && value.trim(),
            onConfirm: (folderName) => {
                const newPath = this._normalizePath(this.currentPath === '/' ? `/${folderName.trim()}` : `${this.currentPath}/${folderName.trim()}`);
                if (this.webOS.fs.createDirectory(newPath)) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    this.webOS.desktop.showAlertModal("Error al crear la carpeta. ¿Ya existe, el nombre es inválido o la ruta padre no existe?", "Error", "fa-exclamation-triangle");
                }
            }
        });
    }

    _createNewTextFile() {
        this._showModal({
            title: 'Nuevo Archivo de Texto',
            icon: 'fa-file-medical',
            inputLabel: 'Nombre del nuevo archivo:',
            inputValue: 'nuevo_documento.txt',
            confirmButtonText: 'Crear',
            validator: (value) => {
                value = value.trim();
                return value && value.endsWith('.txt');
            },
            validationErrorMessage: "El nombre del archivo debe terminar en .txt",
            onConfirm: (fileName) => {
                const newPath = this._normalizePath(this.currentPath === '/' ? `/${fileName.trim()}` : `${this.currentPath}/${fileName.trim()}`);
                if (this.webOS.fs.writeFile(newPath, "")) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    this.webOS.desktop.showAlertModal("Error al crear el archivo. ¿Ya existe o la ruta padre no existe?", "Error", "fa-exclamation-triangle");
                }
            }
        });
    }

    _renameItem(path, oldName) {
        this._showModal({
            title: 'Renombrar',
            icon: 'fa-edit',
            inputLabel: `Nuevo nombre para "${oldName}":`,
            inputValue: oldName,
            confirmButtonText: 'Renombrar',
            validator: (value) => value && value.trim() && value.trim() !== oldName,
            validationErrorMessage: "El nuevo nombre debe ser diferente al actual",
            onConfirm: (newName) => {
                if (this.webOS.fs.rename(path, newName.trim())) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    this.webOS.desktop.showAlertModal("Error al renombrar. Verifique que el nuevo nombre sea válido y no exista ya.", "Error", "fa-exclamation-triangle");
                }
            }
        });
    }

    _showModal(options) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const header = document.createElement('div');
        header.className = 'custom-modal-header';
        header.innerHTML = `
            <i class="fas ${options.icon || 'fa-question-circle'}"></i>
            <h3>${options.title || 'Modal'}</h3>
        `;

        const body = document.createElement('div');
        body.className = 'custom-modal-body';

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = options.inputLabel || 'Ingrese un valor:';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = options.inputValue || '';
        input.autocomplete = 'off';

        // Mensaje de error (inicialmente oculto)
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'var(--error-color)';
        errorMessage.style.fontSize = '0.85em';
        errorMessage.style.marginTop = '5px';
        errorMessage.style.display = 'none';

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formGroup.appendChild(errorMessage);
        body.appendChild(formGroup);

        const footer = document.createElement('div');
        footer.className = 'custom-modal-footer';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel';
        cancelButton.textContent = options.cancelButtonText || 'Cancelar';

        const confirmButton = document.createElement('button');
        confirmButton.className = 'confirm';
        confirmButton.textContent = options.confirmButtonText || 'Aceptar';

        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // Enfocar el input automáticamente y seleccionar todo el texto
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        // Manejar el evento Enter para confirmar
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (validateAndConfirm()) {
                    closeModal();
                }
            }
        });

        // Manejar el evento Escape para cerrar
        document.addEventListener('keydown', handleEscape);
        function handleEscape(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
            }
        }

        cancelButton.addEventListener('click', closeModal);
        confirmButton.addEventListener('click', () => {
            if (validateAndConfirm()) {
                closeModal();
            }
        });

        function validateAndConfirm() {
            const value = input.value;

            if (options.validator && !options.validator(value)) {
                errorMessage.textContent = options.validationErrorMessage || 'Entrada inválida. Por favor, verifique.';
                errorMessage.style.display = 'block';
                input.focus();
                return false;
            }

            if (options.onConfirm) {
                options.onConfirm(value);
            }

            return true;
        }

        function closeModal() {
            document.removeEventListener('keydown', handleEscape);
            document.body.removeChild(overlay);
        }
    }

    updateNavButtons() {
        if (!this.backButton || !this.forwardButton || !this.upButton) return;
        this.backButton.disabled = this.historyIndex <= 0;
        this.forwardButton.disabled = this.historyIndex >= this.history.length - 1;
        this.upButton.disabled = this.currentPath === '/';
    }

    _formatSize(bytes) {
        if (bytes === undefined || bytes === null || bytes < 0) return '-';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k))));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + ' ' + sizes[i];
    }

    _handleItemSingleClick(e) {
        const itemEl = e.target.closest('.file-item');
        if (this.selectedItem && this.selectedItem !== itemEl) {
            this.selectedItem.classList.remove('selected');
        }
        if (itemEl) {
            itemEl.classList.add('selected');
            this.selectedItem = itemEl;
        } else {
            if (this.selectedItem && e.target === this.mainArea) {
                 this.selectedItem.classList.remove('selected');
                 this.selectedItem = null;
            }
        }
    }
    _handleItemDoubleClick(e) {
        const itemEl = e.target.closest('.file-item');
        if (itemEl) {
            const type = itemEl.dataset.type;
            const path = itemEl.dataset.path;
            const name = itemEl.dataset.name;

            if (type === 'folder') {
                this.navigateTo(path);
            } else {
                this._openFileItem(path, name);
            }
        }
    }

    _handleContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();

        this.webOS.contextMenu.hide();

        const targetItemElement = e.target.closest('.file-item');
        const isInsideMainArea = this.mainArea.contains(e.target);
        let menuItems = [];

        if (targetItemElement) {
            this._handleItemSingleClick(e);
            const itemName = targetItemElement.dataset.name;
            const itemPath = targetItemElement.dataset.path;
            const itemType = targetItemElement.dataset.type;

            menuItems.push({ label: `Abrir`, icon: itemType === 'folder' ? 'fa-folder-open' : 'fa-file-signature', action: () => itemType === 'folder' ? this.navigateTo(itemPath) : this._openFileItem(itemPath, itemName) });
            menuItems.push({ separator: true });
            menuItems.push({ label: 'Renombrar', icon: 'fa-edit', action: () => this._renameItem(itemPath, itemName) });
            menuItems.push({ label: 'Eliminar', icon: 'fa-trash-alt', action: () => this._deleteItem(itemPath, itemName) });
        }
        else if (isInsideMainArea) {
            menuItems.push({ label: 'Nueva Carpeta', icon: 'fa-folder-plus', action: () => this._createNewFolder() });
            menuItems.push({ label: 'Nuevo Archivo de Texto', icon: 'fa-file-medical', action: () => this._createNewTextFile() });
            menuItems.push({ separator: true });
            menuItems.push({ label: 'Refrescar', icon: 'fa-sync-alt', action: () => this.navigateTo(this.currentPath, true) });
        }

        if (menuItems.length > 0) {
            this.webOS.contextMenu.show(e.clientX, e.clientY, menuItems);
        }
    }

    _openFileItem(path, name) {
        if (name.endsWith('.txt')) {
            this.webOS.launchApp('notepad', { filePathToOpen: path });
        } else if (/\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(name)) {
            this.webOS.desktop.showAlertModal(`Simulación: Abriendo imagen "${name}" (Visor de imágenes no implementado).`, "Visor de imágenes", "fa-image");
        } else {
            this.webOS.desktop.showAlertModal(`No hay aplicación predeterminada para abrir el archivo "${name}".`, "Tipo de archivo no soportado", "fa-question-circle");
        }
    }

    _deleteItem(path, name) {
        this.webOS.desktop.showConfirmModal(
            `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
            () => {
                if (this.webOS.fs.delete(path)) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    this.webOS.desktop.showAlertModal("Error al eliminar el archivo/carpeta.", "Error", "fa-exclamation-triangle");
                }
            },
            "Confirmar eliminación",
            "Eliminar",
            "Cancelar",
            "fa-trash-alt"
        );
    }
}