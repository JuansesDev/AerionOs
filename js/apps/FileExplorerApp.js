import { App } from '../core/App.js';

export class FileExplorerApp extends App {
    constructor(webOS) {
        super('files', 'File Explorer', 'fas fa-folder-open', webOS, {
            window: { width: 750, height: 550, minWidth: 500, minHeight: 350, customClass: 'files-app' }
        });
        this.currentPath = '/';
        this.history = ['/'];
        this.historyIndex = 0;
        this.selectedItem = null;
        this.activeWindowInstance = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="file-explorer-toolbar">
                <button data-action="back" title="Back"><i class="fas fa-arrow-left"></i></button>
                <button data-action="forward" title="Forward"><i class="fas fa-arrow-right"></i></button>
                <button data-action="up" title="Up one level"><i class="fas fa-level-up-alt"></i></button>
                <button data-action="refresh" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                <input type="text" class="file-explorer-path-bar" placeholder="Path" spellcheck="false">
                <button data-action="new-folder" title="New folder"><i class="fas fa-folder-plus"></i></button>
                <button data-action="new-file" title="New text file"><i class="fas fa-file-medical"></i></button>
            </div>
            <div class="file-explorer-container">
                <div class="file-explorer-sidebar">
                    <ul>
                        <li data-path="/">Root</li>
                        <li data-path="/Desktop">Desktop</li>
                        <li data-path="/Documents">Documents</li>
                        <li data-path="/Downloads">Downloads</li>
                        <li data-path="/Pictures">Pictures</li>
                        <li data-path="/Music">Music</li>
                        <li data-path="/Videos">Videos</li>
                    </ul>
                </div>
                <div class="file-explorer-main-area">
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
            console.warn("normalizePath received a non-string value:", path);
            return '/';
        }
        let p = path.trim().replace(/\/+/g, '/');
        if (!p.startsWith('/')) p = '/' + p;
        if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
        return p || '/';
    }

    navigateTo(path, skipHistoryUpdate = false, isNavigatingHistory = false) {
        const normalizedPath = this._normalizePath(path);

        if (!this.activeWindowInstance) {
            console.error("FileExplorerApp.navigateTo: activeWindowInstance is not defined.");
        }

        if (!this.webOS.fs.isDirectory(normalizedPath)) {
            if (this.webOS.fs.isFile(normalizedPath)) {
                this._openFileItem(normalizedPath, normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1));
                if (this.pathBar) this.pathBar.value = this.currentPath;
                return false;
            }
            if (!isNavigatingHistory) {
                this.webOS.modals.showAlert(`The path '${normalizedPath}' is not a valid directory or does not exist.`, 'Navigation error', 'fa-exclamation-triangle');
            }
            if (this.pathBar) this.pathBar.value = this.currentPath;
            return false;
        }

        const success = this.renderDirectory(normalizedPath);

        if (success) {
            this.currentPath = normalizedPath;

            if (this.activeWindowInstance) {
                this.activeWindowInstance.setTitle(`File Explorer - ${this.currentPath === '/' ? 'Root' : this.currentPath.substring(this.currentPath.lastIndexOf('/') + 1) || 'Root'}`);
            } else {
                console.warn("FileExplorer.navigateTo: activeWindowInstance not available for setTitle");
            }

            if (this.pathBar) this.pathBar.value = this.currentPath;

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
        const items = this.webOS.fs.listDirectory(path);

        if (items === null) {
            console.error(`[RENDER DIR] listDirectory for '${path}' returned null.`);
            return false;
        }

        this.mainArea.innerHTML = '';
        this.selectedItem = null;

        if (items.length === 0) {
            this.mainArea.innerHTML = '<p class="empty-folder-message">This folder is empty.</p>';
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

            const iconClass = this._getFileIcon(item.name, item.type);

            itemEl.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span class="file-name">${item.name}</span>
                <span class="file-type">${item.type === 'folder' ? 'Folder' : 'File'}</span>
                <span class="file-size">${item.type === 'folder' ? '-' : this._formatSize(item.size)}</span>
            `;
            this.mainArea.appendChild(itemEl);
        });
        return true;
    }

    updateSidebarActiveState() {
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

    async _createNewFolder() {
        try {
            const folderName = await this.webOS.modals.showPrompt(
                'Name of the new folder:',
                'New Folder',
                'New Folder'
            );

            if (folderName && folderName.trim()) {
                const newPath = this._normalizePath(this.currentPath === '/' ? `/${folderName.trim()}` : `${this.currentPath}/${folderName.trim()}`);
                if (this.webOS.fs.createDirectory(newPath)) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    await this.webOS.modals.showAlert("Error creating the folder. Does it already exist, is the name invalid, or does the parent path not exist?", "Error");
                }
            }
        } catch (error) {
            console.log('Folder creation cancelled');
        }
    }

    async _createNewTextFile() {
        try {
            const fileName = await this.webOS.modals.showPrompt(
                'Name of the new file:',
                'New Text File',
                'new_document.txt'
            );

            if (fileName && fileName.trim()) {
                const trimmedName = fileName.trim();
                if (!trimmedName.endsWith('.txt')) {
                    await this.webOS.modals.showAlert("The file name must end in .txt", "Error");
                    return;
                }

                const newPath = this._normalizePath(this.currentPath === '/' ? `/${trimmedName}` : `${this.currentPath}/${trimmedName}`);
                if (this.webOS.fs.writeFile(newPath, "")) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    await this.webOS.modals.showAlert("Error creating the file. Does it already exist or does the parent path not exist?", "Error");
                }
            }
        } catch (error) {
            console.log('File creation cancelled');
        }
    }

    async _renameItem(path, oldName) {
        try {
            const newName = await this.webOS.modals.showPrompt(
                `New name for "${oldName}":`,
                'Rename',
                oldName
            );

            if (newName && newName.trim() && newName.trim() !== oldName) {
                if (this.webOS.fs.rename(path, newName.trim())) {
                    this.navigateTo(this.currentPath, true);
                } else {
                    await this.webOS.modals.showAlert("Error renaming. Verify that the new name is valid and does not already exist.", "Error");
                }
            }
        } catch (error) {
            console.log('Rename cancelled');
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

            menuItems.push({ label: `Open`, icon: itemType === 'folder' ? 'fa-folder-open' : 'fa-file-signature', action: () => itemType === 'folder' ? this.navigateTo(itemPath) : this._openFileItem(itemPath, itemName) });
            menuItems.push({ separator: true });
            menuItems.push({ label: 'Rename', icon: 'fa-edit', action: () => this._renameItem(itemPath, itemName) });
            menuItems.push({ label: 'Delete', icon: 'fa-trash-alt', action: () => this._deleteItem(itemPath, itemName) });
        }
        else if (isInsideMainArea) {
            menuItems.push({ label: 'New Folder', icon: 'fa-folder-plus', action: () => this._createNewFolder() });
            menuItems.push({ label: 'New Text File', icon: 'fa-file-medical', action: () => this._createNewTextFile() });
            menuItems.push({ separator: true });
            menuItems.push({ label: 'Refresh', icon: 'fa-sync-alt', action: () => this.navigateTo(this.currentPath, true) });
        }

        if (menuItems.length > 0) {
            this.webOS.contextMenu.show(e.clientX, e.clientY, menuItems);
        }
    }

    _openFileItem(path, name) {
        if (name.endsWith('.txt')) {
            this.webOS.launchApp('notepad', { filePathToOpen: path });
        } else if (/\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(name)) {
            this.webOS.modals.showAlert(`Simulation: Opening image "${name}" (Image viewer not implemented).`, "Image viewer", "fa-image");
        } else {
            this.webOS.modals.showAlert(`There is no default application to open the file "${name}".`, "Unsupported file type", "fa-question-circle");
        }
    }

    async _deleteItem(path, name) {
        const shouldDelete = await this.webOS.modals.showConfirm(
            `Are you sure you want to delete "${name}"? This action cannot be undone.`,
            "Confirm deletion",
            "fa-trash-alt"
        );

        if (shouldDelete) {
            if (this.webOS.fs.delete(path)) {
                this.navigateTo(this.currentPath, true);
            } else {
                this.webOS.modals.showAlert("Error deleting the file/folder.", "Error", "fa-exclamation-triangle");
            }
        }
    }

    _getFileIcon(fileName, fileType) {
        if (fileType === 'folder' || fileType === 'directory') {
            return 'fa-folder';
        }

        const extension = fileName.toLowerCase().split('.').pop();

        const iconMap = {
            'txt': 'fa-file-alt',
            'md': 'fa-file-alt',
            'rtf': 'fa-file-alt',

            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'odt': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'ods': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'odp': 'fa-file-powerpoint',
            'pdf': 'fa-file-pdf',

            'html': 'fa-file-code',
            'htm': 'fa-file-code',
            'css': 'fa-file-code',
            'js': 'fa-file-code',
            'jsx': 'fa-file-code',
            'ts': 'fa-file-code',
            'tsx': 'fa-file-code',
            'json': 'fa-file-code',
            'xml': 'fa-file-code',
            'php': 'fa-file-code',
            'py': 'fa-file-code',
            'java': 'fa-file-code',
            'cpp': 'fa-file-code',
            'c': 'fa-file-code',
            'h': 'fa-file-code',
            'cs': 'fa-file-code',
            'rb': 'fa-file-code',
            'go': 'fa-file-code',
            'rs': 'fa-file-code',
            'sql': 'fa-file-code',
            'sh': 'fa-file-code',
            'bat': 'fa-file-code',
            'cmd': 'fa-file-code',
            'ps1': 'fa-file-code',

            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image',
            'bmp': 'fa-file-image',
            'svg': 'fa-file-image',
            'webp': 'fa-file-image',
            'ico': 'fa-file-image',
            'tiff': 'fa-file-image',
            'tga': 'fa-file-image',

            'mp3': 'fa-file-audio',
            'wav': 'fa-file-audio',
            'flac': 'fa-file-audio',
            'aac': 'fa-file-audio',
            'ogg': 'fa-file-audio',
            'm4a': 'fa-file-audio',
            'wma': 'fa-file-audio',

            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mkv': 'fa-file-video',
            'mov': 'fa-file-video',
            'wmv': 'fa-file-video',
            'flv': 'fa-file-video',
            'webm': 'fa-file-video',
            'm4v': 'fa-file-video',
            '3gp': 'fa-file-video',

            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            '7z': 'fa-file-archive',
            'tar': 'fa-file-archive',
            'gz': 'fa-file-archive',
            'bz2': 'fa-file-archive',
            'xz': 'fa-file-archive',

            'ini': 'fa-cog',
            'cfg': 'fa-cog',
            'conf': 'fa-cog',
            'config': 'fa-cog',
            'properties': 'fa-cog',
            'env': 'fa-cog',

            'log': 'fa-list-alt',
            'csv': 'fa-table',
            'tsv': 'fa-table',
        };

        return iconMap[extension] || 'fa-file';
    }
}
