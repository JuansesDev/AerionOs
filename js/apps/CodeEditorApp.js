// js/apps/CodeEditorApp.js
import { App } from '../core/App.js';

export class CodeEditorApp extends App {
    constructor(webOS) {
        super('codeeditor', 'Editor de Código', 'fas fa-code', webOS, {
            window: { width: 700, height: 550, minWidth: 500, minHeight: 400, customClass: 'codeeditor-app' },
            allowMultipleInstances: true // Permitir múltiples editores
        });
        this.textarea = null;
        this.currentFilePath = null;
        this.originalContent = "";
        this.isDirty = false;
        this.previewWindow = null; // Para la vista previa de HTML
        this.codeEditor = null; // Elemento para el editor con resaltado
        this.currentLanguage = 'plaintext'; // Lenguaje actualmente usado
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.activeWindowInstance = windowInstance;

        contentElement.innerHTML = `
            <div class="codeeditor-toolbar">
                <button data-action="new" title="Nuevo (Ctrl+N)"><i class="fas fa-file"></i> Nuevo</button>
                <button data-action="open" title="Abrir (Ctrl+O)"><i class="fas fa-folder-open"></i> Abrir</button>
                <button data-action="save" title="Guardar (Ctrl+S)"><i class="fas fa-save"></i> Guardar</button>
                <button data-action="save-as" title="Guardar Como..."><i class="fas fa-file-export"></i> Guardar Como</button>
                <span class="codeeditor-filename-display"></span>
                <button data-action="run-html" title="Ejecutar HTML (en nueva ventana)" style="margin-left: auto;"><i class="fab fa-html5"></i> Ejecutar HTML</button>
            </div>
            <div class="code-editor-container">
                <pre class="code-mirror-wrapper"><code class="code-mirror language-plaintext"></code></pre>
                <textarea class="codeeditor-textarea" spellcheck="false" placeholder="Escribe tu código aquí..."></textarea>
            </div>
            <div class="codeeditor-statusbar">
                <span>Línea: 1, Col: 1</span>
                <span class="file-type-indicator">Texto Plano</span>
            </div>
        `;

        this.textarea = contentElement.querySelector('.codeeditor-textarea');
        this.codeEditor = contentElement.querySelector('.code-mirror');
        const codeContainer = contentElement.querySelector('.code-mirror-wrapper');
        this.filenameDisplay = contentElement.querySelector('.codeeditor-filename-display');
        this.statusBarInfo = contentElement.querySelector('.codeeditor-statusbar > span:first-child');
        this.fileTypeIndicator = contentElement.querySelector('.file-type-indicator');

        // Estilos para los elementos de edición de código
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
            z-index: 1;
            caret-color: #fff;
        `;

        codeContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            overflow: auto;
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
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            tab-size: 2;
        `;

        contentElement.querySelector('.codeeditor-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) this._handleToolbarAction(button.dataset.action);
        });

        // Manejar eventos del textarea
        this.textarea.addEventListener('input', () => {
            this.isDirty = this.textarea.value !== this.originalContent;
            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            this._updateCursorPosition();
        });
        this.textarea.addEventListener('scroll', () => {
            // Sincronizar scroll entre el textarea y el elemento pre/code
            this.codeEditor.parentElement.scrollTop = this.textarea.scrollTop;
            this.codeEditor.parentElement.scrollLeft = this.textarea.scrollLeft;
        });
        this.textarea.addEventListener('click', () => this._updateCursorPosition());
        this.textarea.addEventListener('keyup', () => this._updateCursorPosition());

        // Agregar padding para que coincida con el textarea
        this.textarea.style.padding = '10px';

        windowInstance.on('beforeClose', () => this._handleBeforeClose());
        windowInstance.on('focus', () => this.textarea.focus());

        // Atajos de teclado
        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e));

        if (launchOptions && launchOptions.filePathToOpen) {
            this._loadFile(launchOptions.filePathToOpen);
        } else {
            this._newFile();
        }
        this.textarea.focus();
    }

    // Método para actualizar el resaltado de sintaxis
    _updateCodeHighlighting() {
        if (!this.codeEditor) return;

        // Actualizar el contenido del editor con el valor del textarea
        this.codeEditor.textContent = this.textarea.value;

        // Actualizar el lenguaje en el elemento si ha cambiado
        if (this.codeEditor.className !== `code-mirror language-${this.currentLanguage}`) {
            this.codeEditor.className = `code-mirror language-${this.currentLanguage}`;
        }

        // Aplicar el resaltado de sintaxis solo si Prism está disponible
        if (window.Prism) {
            Prism.highlightElement(this.codeEditor);
        }
    }

    // Detectar el lenguaje basado en la extensión del archivo
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
        // Permitir Tab para indentar (muy básico)
        if (e.key === 'Tab' && e.target === this.textarea) {
            e.preventDefault();
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            this.textarea.value = this.textarea.value.substring(0, start) + "  " + this.textarea.value.substring(end); // 2 espacios por tab
            this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        }
    }

    _handleToolbarAction(action) {
        switch(action) {
            case 'new':
                if (this.isDirty) { if (!confirm("Hay cambios sin guardar. ¿Descartarlos y crear nuevo?")) return; }
                this._newFile(); break;
            case 'open':
                if (this.isDirty) { if (!confirm("Hay cambios sin guardar. ¿Descartarlos y abrir otro?")) return; }
                this._openFilePrompt(); break;
            case 'save': this._saveFile(); break;
            case 'save-as': this._saveFileAs(); break;
            case 'run-html': this._runHtmlPreview(); break;
        }
    }

    _handleBeforeClose() {
        if (this.isDirty) {
            const confirmation = confirm("Tienes cambios sin guardar. ¿Guardarlos antes de cerrar?");
            if (confirmation) {
                const saved = this._saveFile();
                // Si el guardado falla o es cancelado, idealmente no se cierra.
                // Esto es complicado sin que el evento 'beforeClose' pueda ser cancelado.
            }
        }
        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close(); // Cerrar ventana de vista previa si está abierta
        }
    }

    _updateWindowTitleAndStatus() {
        if (!this.activeWindowInstance) return;
        const baseTitle = "Editor de Código";
        let fileName = "Sin título";
        let fileType = "Texto Plano";

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
        this.statusBarInfo.textContent = `Línea: ${currentLine}, Col: ${currentCol}`;
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

            // Detectar el lenguaje adecuado basado en la extensión
            this.currentLanguage = this._detectLanguage(path);

            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            this._updateCursorPosition();
        } else {
            alert(`Error: No se pudo abrir el archivo "${path}".`);
            this._newFile();
        }
    }

    _openFilePrompt() {
        const defaultPath = this.currentFilePath ?
            this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1) :
            "/Documents/"; // O quizás "/" para más flexibilidad
        const path = prompt("Ingresa la ruta completa del archivo a abrir:", defaultPath);

        if (path && path.trim()) {
            this._loadFile(path.trim());
        }
    }

    _saveFile() { // Devuelve true si se guardó, false si se canceló o falló
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
            alert("Error al guardar el archivo.");
            return false;
        }
    }

    _saveFileAs() { // Devuelve true si se guardó, false si se canceló o falló
        let defaultDir = "/Documents/";
        let defaultName = "nuevo_archivo.txt"; // Extensión por defecto

        if (this.currentFilePath) {
            defaultDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1);
            defaultName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
        }

        const newPath = prompt("Guardar como (ruta completa y nombre de archivo):", defaultDir + defaultName);

        if (!newPath || !newPath.trim()) return false;

        const trimmedPath = this.webOS.fs._normalizePath(newPath.trim()); // Normalizar la ruta

        if (this.webOS.fs.pathExists(trimmedPath)) {
            if (!confirm(`El archivo "${trimmedPath}" ya existe. ¿Deseas sobrescribirlo?`)) {
                return false;
            }
        }

        const success = this.webOS.fs.writeFile(trimmedPath, this.textarea.value);
        if (success) {
            this.currentFilePath = trimmedPath;
            this.originalContent = this.textarea.value;
            this.isDirty = false;

            // Actualizar el lenguaje al guardar con una nueva extensión
            this.currentLanguage = this._detectLanguage(trimmedPath);

            this._updateWindowTitleAndStatus();
            this._updateCodeHighlighting();
            return true;
        } else {
            alert("Error al guardar el archivo como.");
            return false;
        }
    }

    _runHtmlPreview() {
        const htmlContent = this.textarea.value;
        if (!htmlContent.trim()) {
            alert("No hay contenido HTML para ejecutar.");
            return;
        }

        // Cerrar ventana de vista previa anterior si existe
        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close();
        }

        this.previewWindow = this.webOS.windowManager.createWindow(
            'html-preview-' + Date.now(), // ID único
            'Vista Previa HTML',
            'fab fa-html5',
            { width: 800, height: 600, customClass: 'html-preview-window' }
        );

        if (this.previewWindow) {
            // Usar un iframe para aislar el contenido y manejar scripts/estilos
            // Es importante definir correctamente el sandbox para seguridad
            // Eliminamos allow-same-origin para evitar escapar del sandbox
            const iframeHTML = `
                <div class="html-preview-container" style="width:100%; height:100%; overflow:auto;">
                    <iframe
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                        style="width:100%; height:100%; border:none;"
                        srcdoc="${this._escapeHtml(htmlContent)}">
                    </iframe>
                    <div class="preview-notice" style="position:absolute; bottom:10px; right:10px; background:#ff8c00; color:white; padding:5px 10px; border-radius:4px; font-size:12px; opacity:0.8;">
                        Vista previa segura (sin acceso al origen principal)
                    </div>
                </div>`;
            this.previewWindow.setContent(iframeHTML);
        }
    }

    // Método de ayuda para escapar HTML de manera segura
    _escapeHtml(html) {
        // Escapamos " para evitar problemas con el atributo srcdoc
        return html.replace(/"/g, '&quot;');
    }

    onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        if (launchOptions && launchOptions.filePathToOpen) {
            if (this.isDirty) {
                if (!confirm("Tienes cambios sin guardar. ¿Descartar y abrir el nuevo archivo en esta ventana?")) {
                    return;
                }
            }
            this._loadFile(launchOptions.filePathToOpen);
        }
    }

    onClose() {
        if (this.previewWindow && this.webOS.windowManager.getWindow(this.previewWindow.id)) {
            this.previewWindow.close(); // Asegurarse de cerrar la vista previa
        }
        super.onClose();
    }
}