export class FileSystem {
    constructor(username) {
        this.username = username;
        this.storageKey = `AerionOs_fs_${this.username}`;
        this.fs = this._loadFS();
        this._ensureBaseStructure();
    }

    _loadFS() {
        const storedFS = localStorage.getItem(this.storageKey);
        try {
            return storedFS ? JSON.parse(storedFS) : {};
        } catch (e) {
            console.error("Error parsing FileSystem from localStorage", e);
            return {};
        }
    }

    _saveFS() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.fs));
        } catch (e) {
            console.error("Error saving FileSystem to localStorage", e);
            alert("Error: Could not save the file system. Is LocalStorage full?");
        }
    }

    _ensureBaseStructure() {
        let changed = false;
        if (!this.fs['/']) {
            this.fs['/'] = { type: 'folder', name: '/', children: {}, meta: { createdAt: Date.now(), modifiedAt: Date.now() } };
            changed = true;
        }
        const baseFolders = ['Desktop', 'Documents', 'Pictures', 'Downloads', 'Music', 'Videos'];
        baseFolders.forEach(folderName => {
            const folderPath = `/${folderName}`;
            if (!this._resolvePath(folderPath)) {
                 this.createDirectory(folderPath, true);
                 changed = true;
            }
        });
        if (changed) this._saveFS();
    }

    _normalizePath(path) {
        if (!path || path === '/') return '/';

        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        const parts = path.split('/').filter(p => p && p !== '.');
        const normalized = [];

        for (const part of parts) {
            if (part === '..') {
                if (normalized.length > 0) {
                    normalized.pop();
                }
            } else {
                normalized.push(part);
            }
        }

        return normalized.length === 0 ? '/' : '/' + normalized.join('/');
    }

    _resolvePath(path, createIntermediate = false) {
        const normalizedPath = this._normalizePath(path);
        const parts = normalizedPath.split('/').filter(p => p);
        let current = this.fs['/'];
        if (normalizedPath === '/') return current;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (current && current.type === 'folder' && current.children) {
                if (current.children[part]) {
                    current = current.children[part];
                } else if (createIntermediate && i < parts.length -1) {
                    current.children[part] = { type: 'folder', name: part, children: {}, meta: { createdAt: Date.now(), modifiedAt: Date.now() } };
                    current = current.children[part];
                }
                 else {
                    return null;
                }
            } else {
                return null;
            }
        }
        return current;
    }

    _getParentNodeAndName(path) {
        const parts = path.split('/').filter(p => p);
        if (parts.length === 0) return { parentNode: null, name: null};
        const name = parts.pop();
        const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
        const parentNode = this._resolvePath(parentPath);
        return { parentNode, name };
    }

    listDirectory(path) {
        const node = this._resolvePath(path);
        if (node && node.type === 'folder') {
             return Object.values(node.children || {}).map(child => ({
                name: child.name,
                type: child.type,
                size: child.meta?.size || 0,
                modifiedAt: child.meta?.modifiedAt || child.meta?.createdAt,
                createdAt: child.meta?.createdAt
            }));
        }
        return null;
    }

    readFile(path) {
        const node = this._resolvePath(path);
        if (node && node.type === 'file') {
            return node.content;
        }
        return null;
    }

    writeFile(path, content) {
        const normalizedPath = this._normalizePath(path);
        const { parentNode, name } = this._getParentNodeAndName(normalizedPath);

        if (!parentNode) {
            const pathParts = normalizedPath.split('/').filter(p => p);
            if (pathParts.length === 0) return false;

            const fileName = pathParts.pop();
            const parentDir = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';

            this._createDirectoriesRecursively(parentDir);

            const { parentNode: newParentNode, name: newName } = this._getParentNodeAndName(normalizedPath);
            if (newParentNode && newParentNode.type === 'folder' && newName) {
                const existingNode = newParentNode.children[newName];
                newParentNode.children[newName] = {
                    type: 'file',
                    name: newName,
                    content: content,
                    meta: {
                        createdAt: existingNode?.meta.createdAt || Date.now(),
                        modifiedAt: Date.now(),
                        size: content.length
                    }
                };
                newParentNode.meta.modifiedAt = Date.now();
                this._saveFS();
                return true;
            }
        } else if (parentNode.type === 'folder' && name) {
            const existingNode = parentNode.children[name];
            parentNode.children[name] = {
                type: 'file',
                name: name,
                content: content,
                meta: {
                    createdAt: existingNode?.meta.createdAt || Date.now(),
                    modifiedAt: Date.now(),
                    size: content.length
                }
            };
            parentNode.meta.modifiedAt = Date.now();
            this._saveFS();
            return true;
        }
        return false;
    }

    _createDirectoriesRecursively(path) {
        const normalizedPath = this._normalizePath(path);
        if (normalizedPath === '/' || this.pathExists(normalizedPath)) {
            return true;
        }

        const parts = normalizedPath.split('/').filter(p => p);
        let currentPath = '';

        for (const part of parts) {
            currentPath += '/' + part;
            if (!this.pathExists(currentPath)) {
                this.createDirectory(currentPath, true);
            }
        }
        return true;
    }

    createDirectory(path, silent = false) {
        const { parentNode, name } = this._getParentNodeAndName(path);
        if (parentNode && parentNode.type === 'folder' && name && !parentNode.children[name]) {
            parentNode.children[name] = {
                type: 'folder',
                name: name,
                children: {},
                meta: { createdAt: Date.now(), modifiedAt: Date.now() }
            };
            parentNode.meta.modifiedAt = Date.now();
            if (!silent) this._saveFS();
            return true;
        }
        return false;
    }

    delete(path) {
        const { parentNode, name } = this._getParentNodeAndName(path);
        if (parentNode && parentNode.children && parentNode.children[name]) {
            delete parentNode.children[name];
            parentNode.meta.modifiedAt = Date.now();
            this._saveFS();
            return true;
        }
        return false;
    }

    rename(oldPath, newName) {
        if (!newName || newName.includes('/') || newName.includes('\\')) {
            console.error("Invalid new name for rename operation.");
            return false;
        }

        const { parentNode, name: oldName } = this._getParentNodeAndName(oldPath);
        if (parentNode && parentNode.children && parentNode.children[oldName] && !parentNode.children[newName]) {
            const item = parentNode.children[oldName];
            item.name = newName;
            item.meta.modifiedAt = Date.now();

            delete parentNode.children[oldName];
            parentNode.children[newName] = item;
            parentNode.meta.modifiedAt = Date.now();

            this._saveFS();
            return true;
        }
        return false;
    }

    getInfo(path) {
        const node = this._resolvePath(path);
        if (node) {
            return {
                name: node.name,
                type: node.type,
                meta: node.meta,
                content: node.type === 'file' ? node.content : undefined,
                childrenCount: node.type === 'folder' ? Object.keys(node.children || {}).length : undefined
            };
        }
        return null;
    }

    pathExists(path) {
        return !!this._resolvePath(path);
    }

    isDirectory(path) {
        const node = this._resolvePath(path);
        return node && node.type === 'folder';
    }

    isFile(path) {
        const node = this._resolvePath(path);
        return node && node.type === 'file';
    }
}
