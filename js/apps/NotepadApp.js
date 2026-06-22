import { App } from '../core/App.js';

export class NotepadApp extends App {
    constructor(webOS) {
        super('notepad', 'Notepad', 'fas fa-file-alt', webOS, {
            window: { width: 650, height: 500, minWidth: 400, minHeight: 300, customClass: 'notepad-app' },
            allowMultipleInstances: true
        });
        this.currentFilePath = null;
        this.textarea = null;
        this.filenameInput = null;
        this.originalContent = "";
        this.isDirty = false;
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
        this.textarea = contentElement.querySelector('.notepad-textarea');
        this.filenameDisplay = contentElement.querySelector('.notepad-filename-display');

        contentElement.querySelector('.notepad-toolbar').addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) await this._handleToolbarAction(button.dataset.action);
        });

        this.textarea.addEventListener('input', () => {
            this.isDirty = this.textarea.value !== this.originalContent;
            this._updateWindowTitle(windowInstance);
        });

        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e));


        windowInstance.on('beforeClose', () => this._handleBeforeClose(windowInstance));

        if (launchOptions && launchOptions.filePathToOpen) {
            this._loadFile(launchOptions.filePathToOpen, windowInstance);
        } else {
            this._newFile(windowInstance);
        }
        this.textarea.focus();
    }

    _handleKeyDown(e) {
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    this._handleToolbarAction('new');
                    break;
                case 'o':
                    e.preventDefault();
                    this._handleToolbarAction('open');
                    break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this._handleToolbarAction('save-as');
                    } else {
                        this._handleToolbarAction('save');
                    }
                    break;
            }
        }
    }

    async _handleBeforeClose(windowInstance) {
        if (this.isDirty) {
            const shouldSave = await this.webOS.modals.showConfirm(
                "You have unsaved changes. Do you want to save before closing?",
                'Unsaved changes',
                'fa-exclamation-triangle'
            );
            if (shouldSave) {
                const saved = this._saveFile(windowInstance);
                if (!saved) {
                    console.warn("Notepad: Save failed or was cancelled. Closing will continue.");
                }
            }
        }
    }

    async _handleToolbarAction(action) {
        const currentWindow = this.webOS.windowManager.getWindow(this.instances[this.instances.length -1]?.id);
        if (!currentWindow) {
            console.error("Notepad: Could not get the current window instance.");
            return;
        }

        switch(action) {
            case 'new':
                if (this.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "There are unsaved changes. Discard them and create a new file?",
                        'Unsaved changes',
                        'fa-exclamation-triangle'
                    );
                    if (!shouldDiscard) return;
                }
                this._newFile(currentWindow);
                break;
            case 'open':
                if (this.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "There are unsaved changes. Discard them and open another file?",
                        'Unsaved changes',
                        'fa-exclamation-triangle'
                    );
                    if (!shouldDiscard) return;
                }
                await this._openFilePrompt(currentWindow);
                break;
            case 'save': await this._saveFile(currentWindow); break;
            case 'save-as': await this._saveFileAs(currentWindow); break;
        }
    }

    _updateWindowTitle(windowInstance) {
        if (!windowInstance) return;
        const baseTitle = "Notepad";
        let fileName = "Untitled";
        if (this.currentFilePath) {
            fileName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
        }

        const unsavedMark = this.isDirty ? "*" : "";
        windowInstance.setTitle(`${baseTitle} - ${fileName}${unsavedMark}`);
        if (this.filenameDisplay) {
            this.filenameDisplay.textContent = `${fileName}${unsavedMark}`;
        }
    }

    _newFile(windowInstance) {
        this.textarea.value = '';
        this.originalContent = '';
        this.currentFilePath = null;
        this.isDirty = false;
        this._updateWindowTitle(windowInstance);
        this.textarea.focus();
    }

    _loadFile(path, windowInstance) {
        const content = this.webOS.fs.readFile(path);
        if (content !== null) {
            this.textarea.value = content;
            this.originalContent = content;
            this.currentFilePath = path;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
        } else {
            this.webOS.modals.showAlert(`Error: Could not open the file "${path}".`, 'Error opening file', 'fa-exclamation-triangle');
            this._newFile(windowInstance);
        }
    }

    async _openFilePrompt(windowInstance) {
        const defaultPath = this.currentFilePath ?
            this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1) :
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
        if (!this.currentFilePath) {
            return await this._saveFileAs(windowInstance);
        }

        const success = this.webOS.fs.writeFile(this.currentFilePath, this.textarea.value);
        if (success) {
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    async _saveFileAs(windowInstance) {
        let defaultDir = "/Documents/";
        let defaultName = "Untitled.txt";

        if (this.currentFilePath) {
            defaultDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1);
            defaultName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
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

        const success = this.webOS.fs.writeFile(newPath, this.textarea.value);
        if (success) {
            this.currentFilePath = newPath;
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file as.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    async onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        if (launchOptions && launchOptions.filePathToOpen) {
            if (this.isDirty) {
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
