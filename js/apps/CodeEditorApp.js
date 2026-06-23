import { App } from '../core/App.js';

export class CodeEditorApp extends App {
    constructor(webOS) {
        super('codeeditor', 'Code Editor', 'fas fa-code', webOS, {
            window: { width: 700, height: 550, minWidth: 500, minHeight: 400, customClass: 'codeeditor-app' },
            allowMultipleInstances: true
        });
        this.windows = new Map();
    }

    _state(windowInstance) {
        return windowInstance ? this.windows.get(windowInstance.id) : null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="codeeditor-toolbar">
                <button data-action="new" title="New (Ctrl+N)"><i class="fas fa-file"></i> New</button>
                <button data-action="open" title="Open (Ctrl+O)"><i class="fas fa-folder-open"></i> Open</button>
                <button data-action="save" title="Save (Ctrl+S)"><i class="fas fa-save"></i> Save</button>
                <button data-action="save-as" title="Save As..."><i class="fas fa-file-export"></i> Save As</button>
                <span class="codeeditor-filename-display"></span>
                <button data-action="run-html" title="Run HTML (in new window)" style="margin-left: auto;"><i class="fab fa-html5"></i> Run HTML</button>
            </div>
            <div class="code-editor-container">
                <pre class="code-mirror-wrapper"><code class="code-mirror language-plaintext"></code></pre>
                <textarea class="codeeditor-textarea" spellcheck="false" placeholder="Write your code here..."></textarea>
            </div>
            <div class="codeeditor-statusbar">
                <span>Line: 1, Col: 1</span>
                <span class="file-type-indicator">Plain Text</span>
            </div>
        `;

        const state = {
            textarea: contentElement.querySelector('.codeeditor-textarea'),
            codeEditor: contentElement.querySelector('.code-mirror'),
            filenameDisplay: contentElement.querySelector('.codeeditor-filename-display'),
            statusBarInfo: contentElement.querySelector('.codeeditor-statusbar > span:first-child'),
            fileTypeIndicator: contentElement.querySelector('.file-type-indicator'),
            currentFilePath: null,
            originalContent: "",
            isDirty: false,
            previewWindow: null,
            currentLanguage: 'plaintext'
        };
        this.windows.set(windowInstance.id, state);

        const codeContainer = contentElement.querySelector('.code-mirror-wrapper');

                state.textarea.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            color: rgba(255,255,255,0.8);
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            border: none;
            outline: none;
            white-space: pre;
            overflow: auto;
            z-index: 1;
            caret-color: #fff;
            padding: 10px;
            box-sizing: border-box;
        `;

        codeContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            margin: 0;
            background: var(--secondary-bg, #21252b);
        `;

        state.codeEditor.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 10px;
            margin: 0;
            pointer-events: none;
            white-space: pre;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            tab-size: 2;
            overflow: hidden;
            z-index: 0;
        `;

        contentElement.querySelector('.codeeditor-toolbar').addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) await this._handleToolbarAction(button.dataset.action, windowInstance);
        });

        state.textarea.addEventListener('input', () => {
            state.isDirty = state.textarea.value !== state.originalContent;
            this._updateWindowTitleAndStatus(windowInstance);
            this._updateCodeHighlighting(windowInstance);
            this._updateCursorPosition(windowInstance);
        });
        state.textarea.addEventListener('scroll', () => {
            const container = state.codeEditor.parentElement;
            container.scrollTop = state.textarea.scrollTop;
            container.scrollLeft = state.textarea.scrollLeft;

            state.codeEditor.style.transform = `translate(-${state.textarea.scrollLeft}px, -${state.textarea.scrollTop}px)`;
        });
        state.textarea.addEventListener('click', () => this._updateCursorPosition(windowInstance));
        state.textarea.addEventListener('keyup', () => this._updateCursorPosition(windowInstance));

        windowInstance.on('beforeClose', () => this._handleBeforeClose(windowInstance));
        windowInstance.on('close', () => this.windows.delete(windowInstance.id));
        windowInstance.on('focus', () => state.textarea.focus());

        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e, windowInstance));

        if (launchOptions && launchOptions.filePathToOpen) {
            this._loadFile(launchOptions.filePathToOpen, windowInstance);
        } else {
            this._newFile(windowInstance);
        }
        state.textarea.focus();
    }

    _updateCodeHighlighting(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!state.codeEditor) return;

        state.codeEditor.innerHTML = '';

        if (state.codeEditor.className !== `code-mirror language-${state.currentLanguage}`) {
            state.codeEditor.className = `code-mirror language-${state.currentLanguage}`;
        }

        state.codeEditor.textContent = state.textarea.value;

        if (window.Prism) {
            Prism.highlightElement(state.codeEditor);
        }
    }

    _detectLanguage(filePath) {
        if (!filePath) return 'plaintext';

        const extension = filePath.split('.').pop().toLowerCase();
        switch (extension) {
            case 'html':
            case 'htm':
                return 'html';
            case 'css':
                return 'css';
            case 'js':
                return 'javascript';
            case 'json':
                return 'json';
            case 'md':
                return 'markdown';
            default:
                return 'plaintext';
        }
    }

    _handleKeyDown(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 'n': e.preventDefault(); this._handleToolbarAction('new', windowInstance); break;
                case 'o': e.preventDefault(); this._handleToolbarAction('open', windowInstance); break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) this._handleToolbarAction('save-as', windowInstance);
                    else this._handleToolbarAction('save', windowInstance);
                    break;
            }
        }
        if (e.key === 'Tab' && e.target === state.textarea) {
            e.preventDefault();
            const start = state.textarea.selectionStart;
            const end = state.textarea.selectionEnd;
            state.textarea.value = state.textarea.value.substring(0, start) + "  " + state.textarea.value.substring(end);
            state.textarea.selectionStart = state.textarea.selectionEnd = start + 2;
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
            case 'save': this._saveFile(windowInstance); break;
            case 'save-as': await this._saveFileAs(windowInstance); break;
            case 'run-html': this._runHtmlPreview(windowInstance); break;
        }
    }

    async _handleBeforeClose(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (state.isDirty) {
            const shouldSave = await this.webOS.modals.showConfirm(
                "You have unsaved changes. Save them before closing?",
                'Unsaved changes',
                'fa-exclamation-triangle'
            );
            if (shouldSave) {
                const saved = this._saveFile(windowInstance);
            }
        }
        if (state.previewWindow && this.webOS.windowManager.getWindow(state.previewWindow.id)) {
            state.previewWindow.close();
        }
    }

    _updateWindowTitleAndStatus(windowInstance) {
        const state = this._state(windowInstance);
        if (!windowInstance || !state) return;
        const baseTitle = "Code Editor";
        let fileName = "Untitled";
        let fileType = "Plain Text";

        if (state.currentFilePath) {
            fileName = state.currentFilePath.substring(state.currentFilePath.lastIndexOf('/') + 1);
            const ext = fileName.split('.').pop().toLowerCase();
            if (ext === 'html' || ext === 'htm') fileType = 'HTML';
            else if (ext === 'css') fileType = 'CSS';
            else if (ext === 'js') fileType = 'JavaScript';
            else if (ext === 'json') fileType = 'JSON';
            else if (ext === 'md') fileType = 'Markdown';
        }

        const unsavedMark = state.isDirty ? "*" : "";
        windowInstance.setTitle(`${baseTitle} - ${fileName}${unsavedMark}`);
        if (state.filenameDisplay) state.filenameDisplay.textContent = `${fileName}${unsavedMark}`;
        if (state.fileTypeIndicator) state.fileTypeIndicator.textContent = fileType;
    }

    _updateCursorPosition(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!state.textarea || !state.statusBarInfo) return;
        const textLines = state.textarea.value.substring(0, state.textarea.selectionStart).split("\n");
        const currentLine = textLines.length;
        const currentCol = textLines[textLines.length - 1].length + 1;
        state.statusBarInfo.textContent = `Line: ${currentLine}, Col: ${currentCol}`;
    }

    _newFile(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.textarea.value = '';
        state.originalContent = '';
        state.currentFilePath = null;
        state.isDirty = false;
        state.currentLanguage = 'plaintext';
        this._updateWindowTitleAndStatus(windowInstance);
        this._updateCodeHighlighting(windowInstance);
        this._updateCursorPosition(windowInstance);
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

            state.currentLanguage = this._detectLanguage(path);

            this._updateWindowTitleAndStatus(windowInstance);
            this._updateCodeHighlighting(windowInstance);
            this._updateCursorPosition(windowInstance);
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
                ['.txt', '.html', '.css', '.js', '.json', '.md', '.xml']
            );

            if (path) {
                this._loadFile(path, windowInstance);
            }
        } catch (error) {
            console.log('File opening cancelled');
        }
    }

    _saveFile(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return false;
        if (!state.currentFilePath) {
            return this._saveFileAs(windowInstance);
        }

        const success = this.webOS.fs.writeFile(state.currentFilePath, state.textarea.value);
        if (success) {
            state.originalContent = state.textarea.value;
            state.isDirty = false;
            this._updateWindowTitleAndStatus(windowInstance);
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
        let defaultName = "new_file.txt";

        if (state.currentFilePath) {
            defaultDir = state.currentFilePath.substring(0, state.currentFilePath.lastIndexOf('/') + 1);
            defaultName = state.currentFilePath.substring(state.currentFilePath.lastIndexOf('/') + 1);
        }

        const newPath = await this.webOS.modals.showFileSaveDialog(
            defaultDir,
            defaultName,
            ['.txt', '.html', '.css', '.js', '.json', '.md', '.xml', '.csv']
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

            state.currentLanguage = this._detectLanguage(newPath);

            this._updateWindowTitleAndStatus(windowInstance);
            this._updateCodeHighlighting(windowInstance);
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file as.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    _runHtmlPreview(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        const htmlContent = state.textarea.value;
        if (!htmlContent.trim()) {
            this.webOS.modals.showAlert("There is no HTML content to run.", 'No content', 'fa-info-circle');
            return;
        }

        if (state.previewWindow && this.webOS.windowManager.getWindow(state.previewWindow.id)) {
            state.previewWindow.close();
        }

        state.previewWindow = this.webOS.windowManager.createWindow(
            'html-preview-' + Date.now(),
            'HTML Preview',
            'fab fa-html5',
            { width: 800, height: 600, customClass: 'html-preview-window' }
        );

        if (state.previewWindow) {
            const iframeHTML = `
                <div class="html-preview-container" style="width:100%; height:100%; overflow:auto;">
                    <iframe
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                        style="width:100%; height:100%; border:none;"
                        srcdoc="${this._escapeHtml(htmlContent)}">
                    </iframe>
                    <div class="preview-notice" style="position:absolute; bottom:10px; right:10px; background:#ff8c00; color:white; padding:5px 10px; border-radius:4px; font-size:12px; opacity:0.8;">
                        Safe preview (no access to the main origin)
                    </div>
                </div>`;
            state.previewWindow.setContent(iframeHTML);
        }
    }

    _escapeHtml(html) {
        return html.replace(/"/g, '&quot;');
    }

    async onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        const state = this._state(windowInstance);
        if (launchOptions && launchOptions.filePathToOpen) {
            if (state && state.isDirty) {
                const shouldDiscard = await this.webOS.modals.showConfirm(
                    "You have unsaved changes. Discard and open the new file in this window?",
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
