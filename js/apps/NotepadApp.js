import { App } from '../core/App.js';

export class NotepadApp extends App {
    constructor(webOS) {
        super('notepad', 'Notepad', 'fas fa-file-alt', webOS, {
            window: { width: 650, height: 500, minWidth: 400, minHeight: 300, customClass: 'notepad-app' },
            allowMultipleInstances: true
        });
        this.windows = new Map();
    }

    _state(windowInstance) {
        return windowInstance ? this.windows.get(windowInstance.id) : null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="notepad-toolbar">
                <button data-action="new" title="New (Ctrl+N)"><i class="fas fa-file"></i> New</button>
                <button data-action="open" title="Open (Ctrl+O)"><i class="fas fa-folder-open"></i> Open</button>
                <button data-action="save" title="Save (Ctrl+S)"><i class="fas fa-save"></i> Save</button>
                <button data-action="save-as" title="Save As... (Ctrl+Shift+S)"><i class="fas fa-file-export"></i> Save As</button>
                <span class="notepad-filename-display"></span>
            </div>
            <textarea class="notepad-textarea" spellcheck="false"></textarea>
        `;

        const state = {
            textarea: contentElement.querySelector('.notepad-textarea'),
            filenameDisplay: contentElement.querySelector('.notepad-filename-display'),
            currentFilePath: null,
            originalContent: '',
            isDirty: false
        };
        this.windows.set(windowInstance.id, state);

        contentElement.querySelector('.notepad-toolbar').addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) await this._handleToolbarAction(button.dataset.action, windowInstance);
        });

        state.textarea.addEventListener('input', () => {
            state.isDirty = state.textarea.value !== state.originalContent;
            this._updateWindowTitle(windowInstance);
        });

        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e, windowInstance));

        windowInstance.on('beforeClose', () => this._handleBeforeClose(windowInstance));
        windowInstance.on('close', () => this.windows.delete(windowInstance.id));

        if (launchOptions && launchOptions.filePathToOpen) {
            this._loadFile(launchOptions.filePathToOpen, windowInstance);
        } else {
            this._newFile(windowInstance);
        }
        state.textarea.focus();
    }

    _handleKeyDown(e, windowInstance) {
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    this._handleToolbarAction('new', windowInstance);
                    break;
                case 'o':
                    e.preventDefault();
                    this._handleToolbarAction('open', windowInstance);
                    break;
                case 's':
                    e.preventDefault();
                    this._handleToolbarAction(e.shiftKey ? 'save-as' : 'save', windowInstance);
                    break;
            }
        }
    }

    async _handleBeforeClose(windowInstance) {
        const state = this._state(windowInstance);
        if (state && state.isDirty) {
            const shouldSave = await this.webOS.modals.showConfirm(
                "You have unsaved changes. Do you want to save before closing?",
                'Unsaved changes',
                'fa-exclamation-triangle'
            );
            if (shouldSave) {
                const saved = await this._saveFile(windowInstance);
                if (!saved) {
                    console.warn("Notepad: Save failed or was cancelled. Closing will continue.");
                }
            }
        }
    }

    async _handleToolbarAction(action, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;

        switch(action) {
            case 'new':
                if (state.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "There are unsaved changes. Discard them and create a new file?",
                        'Unsaved changes',
                        'fa-exclamation-triangle'
                    );
                    if (!shouldDiscard) return;
                }
                this._newFile(windowInstance);
                break;
            case 'open':
                if (state.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "There are unsaved changes. Discard them and open another file?",
                        'Unsaved changes',
                        'fa-exclamation-triangle'
                    );
                    if (!shouldDiscard) return;
                }
                await this._openFilePrompt(windowInstance);
                break;
            case 'save': await this._saveFile(windowInstance); break;
            case 'save-as': await this._saveFileAs(windowInstance); break;
        }
    }

    _updateWindowTitle(windowInstance) {
        const state = this._state(windowInstance);
        if (!windowInstance || !state) return;
        const baseTitle = "Notepad";
        let fileName = "Untitled";
        if (state.currentFilePath) {
            fileName = state.currentFilePath.substring(state.currentFilePath.lastIndexOf('/') + 1);
        }

        const unsavedMark = state.isDirty ? "*" : "";
        windowInstance.setTitle(`${baseTitle} - ${fileName}${unsavedMark}`);
        if (state.filenameDisplay) {
            state.filenameDisplay.textContent = `${fileName}${unsavedMark}`;
        }
    }

    _newFile(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.textarea.value = '';
        state.originalContent = '';
        state.currentFilePath = null;
        state.isDirty = false;
        this._updateWindowTitle(windowInstance);
        state.textarea.focus();
    }

    _loadFile(path, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        const content = this.webOS.fs.readFile(path);
        if (content !== null) {
            state.textarea.value = content;
            state.originalContent = content;
            state.currentFilePath = path;
            state.isDirty = false;
            this._updateWindowTitle(windowInstance);
        } else {
            this.webOS.modals.showAlert(`Error: Could not open the file "${path}".`, 'Error opening file', 'fa-exclamation-triangle');
            this._newFile(windowInstance);
        }
    }

    async _openFilePrompt(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        const defaultPath = state.currentFilePath ?
            state.currentFilePath.substring(0, state.currentFilePath.lastIndexOf('/') + 1) :
            "/Documents/";

        try {
            const path = await this.webOS.modals.showFileOpenDialog(
                defaultPath,
                ['.txt']
            );

            if (path) {
                this._loadFile(path, windowInstance);
            }
        } catch (error) {
            console.log('File open cancelled');
        }
    }

    async _saveFile(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return false;
        if (!state.currentFilePath) {
            return await this._saveFileAs(windowInstance);
        }

        const success = this.webOS.fs.writeFile(state.currentFilePath, state.textarea.value);
        if (success) {
            state.originalContent = state.textarea.value;
            state.isDirty = false;
            this._updateWindowTitle(windowInstance);
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    async _saveFileAs(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return false;
        let defaultDir = "/Documents/";
        let defaultName = "Untitled.txt";

        if (state.currentFilePath) {
            defaultDir = state.currentFilePath.substring(0, state.currentFilePath.lastIndexOf('/') + 1);
            defaultName = state.currentFilePath.substring(state.currentFilePath.lastIndexOf('/') + 1);
        }

        const newPath = await this.webOS.modals.showFileSaveDialog(
            defaultDir,
            defaultName,
            ['.txt']
        );

        if (!newPath) return false;

        if (this.webOS.fs.pathExists(newPath)) {
            const shouldOverwrite = await this.webOS.modals.showConfirm(
                `The file "${newPath}" already exists. Do you want to overwrite it?`,
                'File exists',
                'fa-exclamation-triangle'
            );
            if (!shouldOverwrite) return false;
        }

        const success = this.webOS.fs.writeFile(newPath, state.textarea.value);
        if (success) {
            state.currentFilePath = newPath;
            state.originalContent = state.textarea.value;
            state.isDirty = false;
            this._updateWindowTitle(windowInstance);
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file as.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    async onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        const state = this._state(windowInstance);
        if (launchOptions && launchOptions.filePathToOpen) {
            if (state && state.isDirty) {
                const shouldDiscard = await this.webOS.modals.showConfirm(
                    "You have unsaved changes in this window's current file. Discard them and open the new file here?",
                    'Unsaved changes',
                    'fa-exclamation-triangle'
                );
                if (!shouldDiscard) {
                    return;
                }
            }
            this._loadFile(launchOptions.filePathToOpen, windowInstance);
        }
    }
}
