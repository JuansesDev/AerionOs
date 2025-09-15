// js/core/ModalSystem.js
import { EventEmittable } from './EventEmittable.js';

export class ModalSystem extends EventEmittable {
    constructor(webOS) {
        super();
        this.webOS = webOS;
        this.activeModals = new Map();
    }

    // Modal de alerta (reemplaza alert())
    showAlert(message, title = 'Información', icon = 'fa-info-circle') {
        return new Promise((resolve) => {
            const modalId = this._generateModalId();
            const modal = this._createBaseModal(modalId, title, icon);
            
            const body = modal.querySelector('.custom-modal-body');
            body.innerHTML = `<p>${message}</p>`;
            
            const footer = modal.querySelector('.custom-modal-footer');
            const okButton = document.createElement('button');
            okButton.className = 'confirm';
            okButton.textContent = 'Aceptar';
            okButton.addEventListener('click', () => {
                this._closeModal(modalId);
                resolve(true);
            });
            
            footer.appendChild(okButton);
            this._showModal(modalId, modal);
            
            // Focus en el botón
            setTimeout(() => okButton.focus(), 100);
        });
    }

    // Modal de confirmación (reemplaza confirm())
    showConfirm(message, title = 'Confirmar', icon = 'fa-question-circle') {
        return new Promise((resolve) => {
            const modalId = this._generateModalId();
            const modal = this._createBaseModal(modalId, title, icon);
            
            const body = modal.querySelector('.custom-modal-body');
            body.innerHTML = `<p>${message}</p>`;
            
            const footer = modal.querySelector('.custom-modal-footer');
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'cancel';
            cancelButton.textContent = 'Cancelar';
            cancelButton.addEventListener('click', () => {
                this._closeModal(modalId);
                resolve(false);
            });
            
            const confirmButton = document.createElement('button');
            confirmButton.className = 'confirm';
            confirmButton.textContent = 'Aceptar';
            confirmButton.addEventListener('click', () => {
                this._closeModal(modalId);
                resolve(true);
            });
            
            footer.appendChild(cancelButton);
            footer.appendChild(confirmButton);
            this._showModal(modalId, modal);
            
            // Focus en el botón de confirmación
            setTimeout(() => confirmButton.focus(), 100);
        });
    }

    // Modal de prompt (reemplaza prompt())
    showPrompt(message, defaultValue = '', title = 'Entrada requerida', icon = 'fa-edit') {
        return new Promise((resolve) => {
            const modalId = this._generateModalId();
            const modal = this._createBaseModal(modalId, title, icon);
            
            const body = modal.querySelector('.custom-modal-body');
            body.innerHTML = `
                <div class="form-group">
                    <label>${message}</label>
                    <input type="text" class="modal-input" value="${defaultValue}" autocomplete="off">
                </div>
            `;
            
            const input = body.querySelector('.modal-input');
            const footer = modal.querySelector('.custom-modal-footer');
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'cancel';
            cancelButton.textContent = 'Cancelar';
            cancelButton.addEventListener('click', () => {
                this._closeModal(modalId);
                resolve(null);
            });
            
            const confirmButton = document.createElement('button');
            confirmButton.className = 'confirm';
            confirmButton.textContent = 'Aceptar';
            
            const submitValue = () => {
                const value = input.value.trim();
                this._closeModal(modalId);
                resolve(value || null);
            };
            
            confirmButton.addEventListener('click', submitValue);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitValue();
                } else if (e.key === 'Escape') {
                    this._closeModal(modalId);
                    resolve(null);
                }
            });
            
            footer.appendChild(cancelButton);
            footer.appendChild(confirmButton);
            this._showModal(modalId, modal);
            
            // Focus y seleccionar texto
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        });
    }

    // Modal de explorador de archivos para guardar
    showFileSaveDialog(defaultPath = '/Documents/', defaultName = 'nuevo_archivo.txt', allowedExtensions = ['.txt']) {
        return new Promise((resolve) => {
            const modalId = this._generateModalId();
            const modal = this._createBaseModal(modalId, 'Guardar archivo', 'fa-save', 'large');
            
            this._createFileExplorerModal(modal, defaultPath, allowedExtensions, false, defaultName, resolve);
        });
    }

    // Modal de explorador de archivos para cargar
    showFileOpenDialog(defaultPath = '/Documents/', allowedExtensions = ['.txt']) {
        return new Promise((resolve) => {
            const modalId = this._generateModalId();
            const modal = this._createBaseModal(modalId, 'Abrir archivo', 'fa-folder-open', 'large');
            
            this._createFileExplorerModal(modal, defaultPath, allowedExtensions, true, null, resolve);
        });
    }

    // Método auxiliar para crear el explorador de archivos común
    _createFileExplorerModal(modal, defaultPath, allowedExtensions, isOpenDialog, defaultName, resolve) {
        const modalId = modal.dataset.modalId;
        const body = modal.querySelector('.custom-modal-body');
        
        body.innerHTML = `
            <div class="file-explorer-dialog">
                <div class="file-explorer-toolbar">
                    <button class="nav-back" title="Atrás" disabled><i class="fas fa-arrow-left"></i></button>
                    <button class="nav-forward" title="Adelante" disabled><i class="fas fa-arrow-right"></i></button>
                    <button class="nav-up" title="Subir un nivel"><i class="fas fa-level-up-alt"></i></button>
                    <button class="nav-refresh" title="Refrescar"><i class="fas fa-sync-alt"></i></button>
                    <div class="path-bar-container">
                        <input type="text" class="path-bar" value="${defaultPath}" placeholder="Ruta">
                    </div>
                </div>
                <div class="file-explorer-container">
                    <div class="file-explorer-sidebar">
                        <ul>
                            <li data-path="/" ${defaultPath === '/' ? 'class="active"' : ''}>Raíz</li>
                            <li data-path="/Desktop" ${defaultPath === '/Desktop' ? 'class="active"' : ''}>Escritorio</li>
                            <li data-path="/Documents" ${defaultPath === '/Documents' ? 'class="active"' : ''}>Documentos</li>
                            <li data-path="/Downloads" ${defaultPath === '/Downloads' ? 'class="active"' : ''}>Descargas</li>
                            <li data-path="/Pictures" ${defaultPath === '/Pictures' ? 'class="active"' : ''}>Imágenes</li>
                            <li data-path="/Music" ${defaultPath === '/Music' ? 'class="active"' : ''}>Música</li>
                            <li data-path="/Videos" ${defaultPath === '/Videos' ? 'class="active"' : ''}>Videos</li>
                        </ul>
                    </div>
                    <div class="file-explorer-main">
                        <div class="file-browser-content">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>
                </div>
                ${!isOpenDialog ? `
                <div class="filename-input-section">
                    <label for="filename-input">Nombre del archivo:</label>
                    <input type="text" id="filename-input" class="filename-input" value="${defaultName || ''}">
                </div>
                ` : ''}
            </div>
        `;
        
        // Referencias a elementos
        const pathBar = body.querySelector('.path-bar');
        const browserContent = body.querySelector('.file-browser-content');
        const filenameInput = body.querySelector('.filename-input');
        const navBackButton = body.querySelector('.nav-back');
        const navForwardButton = body.querySelector('.nav-forward');
        const navUpButton = body.querySelector('.nav-up');
        const navRefreshButton = body.querySelector('.nav-refresh');
        const sidebar = body.querySelector('.file-explorer-sidebar ul');
        
        // Estado de navegación
        let currentPath = this._normalizePath(defaultPath);
        let history = [currentPath];
        let historyIndex = 0;
        let selectedFile = null;
        
        const _normalizePath = (path) => {
            if (typeof path !== 'string') return '/';
            let p = path.trim().replace(/\/+/g, '/');
            if (!p.startsWith('/')) p = '/' + p;
            if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
            return p || '/';
        };

        const updateNavButtons = () => {
            navBackButton.disabled = historyIndex <= 0;
            navForwardButton.disabled = historyIndex >= history.length - 1;
            navUpButton.disabled = currentPath === '/';
        };

        const updateSidebarActiveState = () => {
            sidebar.querySelectorAll('li').forEach(li => {
                li.classList.toggle('active', _normalizePath(li.dataset.path) === currentPath);
            });
        };

        const navigateTo = (path, skipHistoryUpdate = false) => {
            const normalizedPath = _normalizePath(path);
            
            if (!this.webOS.fs.isDirectory(normalizedPath)) {
                this.showAlert(`La ruta '${normalizedPath}' no es un directorio válido.`);
                pathBar.value = currentPath;
                return false;
            }

            const success = updateFileList(normalizedPath);
            if (success) {
                currentPath = normalizedPath;
                pathBar.value = currentPath;
                
                if (!skipHistoryUpdate) {
                    if (historyIndex < history.length - 1) {
                        history = history.slice(0, historyIndex + 1);
                    }
                    if (history[historyIndex] !== currentPath) {
                        history.push(currentPath);
                        historyIndex = history.length - 1;
                    }
                }
                
                updateNavButtons();
                updateSidebarActiveState();
                selectedFile = null;
                return true;
            }
            
            pathBar.value = currentPath;
            return false;
        };
        
        const updateFileList = (path) => {
            const items = this.webOS.fs.listDirectory(path);
            
            if (!items) {
                return false;
            }
            
            browserContent.innerHTML = '';
            
            if (items.length === 0) {
                browserContent.innerHTML = '<div class="empty-folder">Esta carpeta está vacía</div>';
                return true;
            }
            
            // Ordenar: carpetas primero, luego archivos
            items.sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            });
            
            items.forEach(item => {
                const itemPath = _normalizePath(path === '/' ? `/${item.name}` : `${path}/${item.name}`);
                const itemEl = document.createElement('div');
                itemEl.className = 'file-item';
                itemEl.dataset.name = item.name;
                itemEl.dataset.type = item.type;
                itemEl.dataset.path = itemPath;
                
                const iconClass = this._getFileIcon(item.name, item.type);
                
                // Para el diálogo de apertura, solo mostrar archivos con extensiones permitidas
                if (isOpenDialog && item.type === 'file') {
                    if (allowedExtensions.length > 0) {
                        const hasValidExtension = allowedExtensions.some(ext => 
                            item.name.toLowerCase().endsWith(ext.toLowerCase())
                        );
                        if (!hasValidExtension) {
                            return; // Skip este archivo
                        }
                    }
                }
                
                itemEl.innerHTML = `
                    <i class="fas ${iconClass}"></i>
                    <span class="file-name">${item.name}</span>
                    <span class="file-type">${item.type === 'folder' ? 'Carpeta' : 'Archivo'}</span>
                `;
                
                // Eventos
                itemEl.addEventListener('click', () => {
                    // Deseleccionar otros
                    browserContent.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
                    itemEl.classList.add('selected');
                    
                    if (item.type === 'file') {
                        selectedFile = itemPath;
                        if (!isOpenDialog && filenameInput) {
                            filenameInput.value = item.name;
                        }
                    } else {
                        selectedFile = null;
                    }
                });
                
                itemEl.addEventListener('dblclick', () => {
                    if (item.type === 'folder') {
                        navigateTo(itemPath);
                    } else if (isOpenDialog) {
                        // En diálogo de apertura, hacer doble click en archivo lo selecciona
                        resolve(itemPath);
                        this._closeModal(modalId);
                    }
                });
                
                browserContent.appendChild(itemEl);
            });
            
            return true;
        };
        
        // Event listeners para navegación
        navBackButton.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                navigateTo(history[historyIndex], true);
            }
        });
        
        navForwardButton.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                navigateTo(history[historyIndex], true);
            }
        });
        
        navUpButton.addEventListener('click', () => {
            if (currentPath !== '/') {
                const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                navigateTo(parentPath);
            }
        });
        
        navRefreshButton.addEventListener('click', () => {
            navigateTo(currentPath, true);
        });
        
        pathBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                navigateTo(pathBar.value);
            }
        });
        
        sidebar.addEventListener('click', (e) => {
            const li = e.target.closest('li[data-path]');
            if (li && li.dataset.path) {
                navigateTo(li.dataset.path);
            }
        });
        
        // Footer con botones
        const footer = modal.querySelector('.custom-modal-footer');
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel';
        cancelButton.textContent = 'Cancelar';
        cancelButton.addEventListener('click', () => {
            this._closeModal(modalId);
            resolve(null);
        });
        
        const actionButton = document.createElement('button');
        actionButton.className = 'confirm';
        actionButton.textContent = isOpenDialog ? 'Abrir' : 'Guardar';
        
        const performAction = () => {
            if (isOpenDialog) {
                if (selectedFile) {
                    this._closeModal(modalId);
                    resolve(selectedFile);
                } else {
                    this.showAlert('Por favor, selecciona un archivo.');
                }
            } else {
                const filename = filenameInput.value.trim();
                if (!filename) {
                    this.showAlert('Por favor, ingresa un nombre para el archivo.');
                    return;
                }
                
                // Validar extensión si se especificaron extensiones permitidas
                if (allowedExtensions.length > 0) {
                    const hasValidExtension = allowedExtensions.some(ext => 
                        filename.toLowerCase().endsWith(ext.toLowerCase())
                    );
                    if (!hasValidExtension) {
                        this.showAlert(`El archivo debe tener una de estas extensiones: ${allowedExtensions.join(', ')}`);
                        return;
                    }
                }
                
                const fullPath = _normalizePath(`${currentPath}/${filename}`);
                this._closeModal(modalId);
                resolve(fullPath);
            }
        };
        
        actionButton.addEventListener('click', performAction);
        
        if (filenameInput) {
            filenameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performAction();
                } else if (e.key === 'Escape') {
                    this._closeModal(modalId);
                    resolve(null);
                }
            });
        }
        
        footer.appendChild(cancelButton);
        footer.appendChild(actionButton);
        
        // Inicializar
        updateFileList(currentPath);
        updateNavButtons();
        updateSidebarActiveState();
        this._showModal(modalId, modal);
        
        setTimeout(() => {
            if (isOpenDialog) {
                pathBar.focus();
            } else if (filenameInput) {
                filenameInput.focus();
                filenameInput.select();
            }
        }, 100);
    }

    _normalizePath(path) {
        if (typeof path !== 'string') return '/';
        let p = path.trim().replace(/\/+/g, '/');
        if (!p.startsWith('/')) p = '/' + p;
        if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
        return p || '/';
    }

    // Método auxiliar para crear el modal base
    _createBaseModal(modalId, title, icon, size = 'normal') {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.dataset.modalId = modalId;
        
        const modal = document.createElement('div');
        modal.className = `custom-modal ${size === 'large' ? 'large-modal' : ''}`;
        
        modal.innerHTML = `
            <div class="custom-modal-header">
                <i class="fas ${icon}"></i>
                <h3>${title}</h3>
                <button class="modal-close-btn" title="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="custom-modal-body">
                <!-- Contenido dinámico -->
            </div>
            <div class="custom-modal-footer">
                <!-- Botones dinámicos -->
            </div>
        `;
        
        // Manejar cierre con X
        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            this._closeModal(modalId);
        });
        
        // Manejar cierre con click en overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this._closeModal(modalId);
            }
        });
        
        // Manejar Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this._closeModal(modalId);
            }
        };
        document.addEventListener('keydown', handleEscape);
        overlay.dataset.escapeHandler = 'true';
        
        overlay.appendChild(modal);
        return overlay;
    }

    _showModal(modalId, modalElement) {
        document.body.appendChild(modalElement);
        this.activeModals.set(modalId, modalElement);
        
        // Animación de entrada
        setTimeout(() => {
            modalElement.classList.add('show');
        }, 10);
    }

    _closeModal(modalId) {
        const modal = this.activeModals.get(modalId);
        if (modal) {
            modal.classList.add('hide');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                this.activeModals.delete(modalId);
            }, 200);
        }
    }

    _generateModalId() {
        return 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Función helper para obtener el icono apropiado basado en el tipo y nombre del archivo
    _getFileIcon(fileName, fileType) {
        if (fileType === 'folder' || fileType === 'directory') {
            return 'fa-folder';
        }
        
        // Obtener la extensión del archivo
        const extension = fileName.toLowerCase().split('.').pop();
        
        // Iconos específicos por extensión
        const iconMap = {
            // Documentos de texto
            'txt': 'fa-file-alt',
            'md': 'fa-file-alt',
            'rtf': 'fa-file-alt',
            
            // Documentos de oficina
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
            
            // Código fuente
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
            
            // Imágenes
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
            
            // Audio
            'mp3': 'fa-file-audio',
            'wav': 'fa-file-audio',
            'flac': 'fa-file-audio',
            'aac': 'fa-file-audio',
            'ogg': 'fa-file-audio',
            'm4a': 'fa-file-audio',
            'wma': 'fa-file-audio',
            
            // Video
            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mkv': 'fa-file-video',
            'mov': 'fa-file-video',
            'wmv': 'fa-file-video',
            'flv': 'fa-file-video',
            'webm': 'fa-file-video',
            'm4v': 'fa-file-video',
            '3gp': 'fa-file-video',
            
            // Archivos comprimidos
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            '7z': 'fa-file-archive',
            'tar': 'fa-file-archive',
            'gz': 'fa-file-archive',
            'bz2': 'fa-file-archive',
            'xz': 'fa-file-archive',
            
            // Archivos de configuración
            'ini': 'fa-cog',
            'cfg': 'fa-cog',
            'conf': 'fa-cog',
            'config': 'fa-cog',
            'properties': 'fa-cog',
            'env': 'fa-cog',
            
            // Archivos especiales
            'log': 'fa-list-alt',
            'csv': 'fa-table',
            'tsv': 'fa-table',
        };
        
        return iconMap[extension] || 'fa-file';
    }
}