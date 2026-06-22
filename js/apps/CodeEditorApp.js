import { App } from '../core/App.js';

export class CodeEditorApp extends App {
    constructor(webOS) {
        super('codeeditor', 'Code Editor', 'fas fa-code', webOS, {
            window: { width: 700, height: 550, minWidth: 500, minHeight: 400, customClass: 'codeeditor-app' },
            allowMultipleInstances: true
        });
        this.textarea = null;
        this.currentFilePath = null;
        this.originalContent = "";
        this.isDirty = false;
        this.previewWindow = null;
        this.codeEditor = null;
        this.currentLanguage = 'plaintext';
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.activeWindowInstance = windowInstance;

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

        this.textarea = contentElement.querySelector('.codeeditor-textarea');
        this.codeEditor = contentElement.querySelector('.code-mirror');
        const codeContainer = contentElement.querySelector('.code-mirror-wrapper');
        this.filenameDisplay = contentElement.querySelector('.codeeditor-filename-display');
        this.statusBarInfo = contentElement.querySelector('.codeeditor-statusbar > span:first-child');
        this.fileTypeIndicator = contentElement.querySelector('.file-type-indicator');

                this.textarea.style.cssText = `
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

        this.codeEditor.style.cssText = `
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
            if (button) await this._handleToolbarAction(button.dataset.action);
        });

        this.textarea.addEventListener('input', () => {
            this.isDirty = this.textarea.value !== this.originalContent;
            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            this._updateCursorPosition();
        });
        this.textarea.addEventListener('scroll', () => {
            const container = this.codeEditor.parentElement;
            container.scrollTop = this.textarea.scrollTop;
            container.scrollLeft = this.textarea.scrollLeft;

            this.codeEditor.style.transform = `translate(-${this.textarea.scrollLeft}px, -${this.textarea.scrollTop}px)`;
        });
        this.textarea.addEventListener('click', () => this._updateCursorPosition());
        this.textarea.addEventListener('keyup', () => this._updateCursorPosition());

        windowInstance.on('beforeClose', () => this._handleBeforeClose());
        windowInstance.on('focus', () => this.textarea.focus());

        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e));

        if (launchOptions && launchOptions.filePathToOpen) {
            this._loadFile(launchOptions.filePathToOpen);
        } else {
            this._newFile();
        }
        this.textarea.focus();
    }

    _updateCodeHighlighting() {
        if (!this.codeEditor) return;

        this.codeEditor.innerHTML = '';

        if (this.codeEditor.className !== `code-mirror language-${this.currentLanguage}`) {
            this.codeEditor.className = `code-mirror language-${this.currentLanguage}`;
        }

        this.codeEditor.textContent = this.textarea.value;

        if (window.Prism) {
            Prism.highlightElement(this.codeEditor);
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

    _handleKeyDown(e) {
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 'n': e.preventDefault(); this._handleToolbarAction('new'); break;
                case 'o': e.preventDefault(); this._handleToolbarAction('open'); break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) this._handleToolbarAction('save-as');
                    else this._handleToolbarAction('save');
                    break;
            }
        }
        if (e.key === 'Tab' && e.target === this.textarea) {
            e.preventDefault();
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            this.textarea.value = this.textarea.value.substring(0, start) + "  " + this.textarea.value.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        }
    }

    async _handleToolbarAction(action) {
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
                this._newFile();
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
                await this._openFilePrompt();
                break;
            case 'save': this._saveFile(); break;
            case 'save-as': await this._saveFileAs(); break;
            case 'run-html': this._runHtmlPreview(); break;
        }
    }    async _handleBeforeClose() {
        if (this.isDirty) {
            const shouldSave = await this.webOS.modals.showConfirm(
                "You have unsaved changes. Save them before closing?",
                'Unsaved changes',
                'fa-exclamation-triangle'
            );
            if (shouldSave) {
                const saved = this._saveFile();
            }
        }
        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close();
        }
    }

    _updateWindowTitleAndStatus() {
        if (!this.activeWindowInstance) return;
        const baseTitle = "Code Editor";
        let fileName = "Untitled";
        let fileType = "Plain Text";

        if (this.currentFilePath) {
            fileName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
            const ext = fileName.split('.').pop().toLowerCase();
            if (ext === 'html' || ext === 'htm') fileType = 'HTML';
            else if (ext === 'css') fileType = 'CSS';
            else if (ext === 'js') fileType = 'JavaScript';
            else if (ext === 'json') fileType = 'JSON';
            else if (ext === 'md') fileType = 'Markdown';
        }

        const unsavedMark = this.isDirty ? "*" : "";
        this.activeWindowInstance.setTitle(`${baseTitle} - ${fileName}${unsavedMark}`);
        if (this.filenameDisplay) this.filenameDisplay.textContent = `${fileName}${unsavedMark}`;
        if (this.fileTypeIndicator) this.fileTypeIndicator.textContent = fileType;
    }

    _updateCursorPosition() {
        if (!this.textarea || !this.statusBarInfo) return;
        const textLines = this.textarea.value.substring(0, this.textarea.selectionStart).split("\n");
        const currentLine = textLines.length;
        const currentCol = textLines[textLines.length - 1].length + 1;
        this.statusBarInfo.textContent = `Line: ${currentLine}, Col: ${currentCol}`;
    }

    _newFile() {
        this.textarea.value = '';
        this.originalContent = '';
        this.currentFilePath = null;
        this.isDirty = false;
        this.currentLanguage = 'plaintext';
        this._updateWindowTitleAndStatus();
        this._updateCodeHighlighting();
        this._updateCursorPosition();
        this.textarea.focus();
    }

    _loadFile(path) {
        const content = this.webOS.fs.readFile(path);
        if (content !== null) {
            this.textarea.value = content;
            this.originalContent = content;
            this.currentFilePath = path;
            this.isDirty = false;

            this.currentLanguage = this._detectLanguage(path);

            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            this._updateCursorPosition();
        } else {
            this.webOS.modals.showAlert(`Error: Could not open the file "${path}".`, 'Error opening file', 'fa-exclamation-triangle');
            this._newFile();
        }
    }

    async _openFilePrompt() {
        const defaultPath = this.currentFilePath ?
            this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1) :
            "/Documents/";

        try {
            const path = await this.webOS.modals.showFileOpenDialog(
                defaultPath,
                ['.txt', '.html', '.css', '.js', '.json', '.md', '.xml']
            );

            if (path) {
                this._loadFile(path);
            }
        } catch (error) {
            console.log('File opening cancelled');
        }
    }

    _saveFile() {
        if (!this.currentFilePath) {
            return this._saveFileAs();
        }

        const success = this.webOS.fs.writeFile(this.currentFilePath, this.textarea.value);
        if (success) {
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitleAndStatus();
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    async _saveFileAs() {
        let defaultDir = "/Documents/";
        let defaultName = "new_file.txt";

        if (this.currentFilePath) {
            defaultDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1);
            defaultName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
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

        const success = this.webOS.fs.writeFile(newPath, this.textarea.value);
        if (success) {
            this.currentFilePath = newPath;
            this.originalContent = this.textarea.value;
            this.isDirty = false;

            this.currentLanguage = this._detectLanguage(newPath);

            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            return true;
        } else {
            this.webOS.modals.showAlert("Error saving the file as.", 'Save error', 'fa-exclamation-triangle');
            return false;
        }
    }

    _runHtmlPreview() {
        const htmlContent = this.textarea.value;
        if (!htmlContent.trim()) {
            this.webOS.modals.showAlert("There is no HTML content to run.", 'No content', 'fa-info-circle');
            return;
        }

        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close();
        }

        this.previewWindow = this.webOS.windowManager.createWindow(
            'html-preview-' + Date.now(),
            'HTML Preview',
            'fab fa-html5',
            { width: 800, height: 600, customClass: 'html-preview-window' }
        );

        if (this.previewWindow) {
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
            this.previewWindow.setContent(iframeHTML);
        }
    }

    _escapeHtml(html) {
        return html.replace(/"/g, '&quot;');
    }

    async onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        if (launchOptions && launchOptions.filePathToOpen) {
            if (this.isDirty) {
                const shouldDiscard = await this.webOS.modals.showConfirm(
                    "You have unsaved changes. Discard and open the new file in this window?",
                    'Unsaved changes',
                    'fa-exclamation-triangle'
                );
                if (!shouldDiscard) {
                    return;
                }
            }
            this._loadFile(launchOptions.filePathToOpen);
        }
    }

    onClose() {
        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close();
        }
        super.onClose();
    }
}