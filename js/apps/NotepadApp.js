// js/apps/NotepadApp.js
import { App } from '../core/App.js';

export class NotepadApp extends App {
    constructor(webOS) {
        super('notepad', 'Bloc de Notas', 'fas fa-file-alt', webOS, {
            window: { width: 650, height: 500, minWidth: 400, minHeight: 300, customClass: 'notepad-app' },
            allowMultipleInstances: true // Permitir abrir varios bloks de notas
        });
        // Las propiedades de instancia se inicializarán en renderContent o cuando se abra/cree un archivo
        this.currentFilePath = null;
        this.textarea = null;
        this.filenameInput = null;
        this.originalContent = "";
        this.isDirty = false; // Flag para cambios sin guardar
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="notepad-toolbar">
                <button data-action="new" title="Nuevo (Ctrl+N)"><i class="fas fa-file"></i> Nuevo</button>
                <button data-action="open" title="Abrir (Ctrl+O)"><i class="fas fa-folder-open"></i> Abrir</button>
                <button data-action="save" title="Guardar (Ctrl+S)"><i class="fas fa-save"></i> Guardar</button>
                <button data-action="save-as" title="Guardar Como... (Ctrl+Shift+S)"><i class="fas fa-file-export"></i> Guardar Como</button>
                <span class="notepad-filename-display"></span> <!-- Para mostrar nombre y * si hay cambios -->
            </div>
            <textarea class="notepad-textarea" spellcheck="false"></textarea>
        `;
        this.textarea = contentElement.querySelector('.notepad-textarea');
        this.filenameDisplay = contentElement.querySelector('.notepad-filename-display'); // No es un input

        contentElement.querySelector('.notepad-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) this._handleToolbarAction(button.dataset.action);
        });

        this.textarea.addEventListener('input', () => {
            this.isDirty = this.textarea.value !== this.originalContent;
            this._updateWindowTitle(windowInstance);
        });

        // Atajos de teclado (básico)
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
                    if (e.shiftKey) { // Ctrl+Shift+S
                        this._handleToolbarAction('save-as');
                    } else { // Ctrl+S
                        this._handleToolbarAction('save');
                    }
                    break;
            }
        }
    }

    _handleBeforeClose(windowInstance) {
        if (this.isDirty) {
            const confirmation = confirm("Tienes cambios sin guardar. ¿Quieres guardar antes de cerrar?");
            if (confirmation) {
                const saved = this._saveFile(windowInstance); // saveFile ahora devuelve true/false
                if (!saved) {
                    // Si el guardado falla (ej. el usuario cancela "Guardar Como"),
                    // podríamos querer cancelar el cierre.
                    // Esto requiere que el evento 'beforeClose' pueda ser "cancelado".
                    // Por ahora, asumimos que si el guardado falla, el cierre continúa.
                    console.warn("Notepad: El guardado falló o fue cancelado. El cierre continuará.");
                }
            }
            // Si el usuario elige "No" o "Cancelar" en el confirm, el cierre continúa.
        }
    }

    _handleToolbarAction(action) {
        const currentWindow = this.webOS.windowManager.getWindow(this.instances[this.instances.length -1]?.id); // Asumimos que la última instancia es la relevante
        if (!currentWindow) {
            console.error("Notepad: No se pudo obtener la instancia de la ventana actual.");
            return;
        }

        switch(action) {
            case 'new':
                if (this.isDirty) {
                    if (!confirm("Hay cambios sin guardar. ¿Descartarlos y crear un nuevo archivo?")) return;
                }
                this._newFile(currentWindow);
                break;
            case 'open':
                if (this.isDirty) {
                    if (!confirm("Hay cambios sin guardar. ¿Descartarlos y abrir otro archivo?")) return;
                }
                this._openFilePrompt(currentWindow);
                break;
            case 'save': this._saveFile(currentWindow); break;
            case 'save-as': this._saveFileAs(currentWindow); break;
        }
    }

    _updateWindowTitle(windowInstance) {
        if (!windowInstance) return;
        const baseTitle = "Bloc de Notas";
        let fileName = "Sin título";
        if (this.currentFilePath) {
            fileName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
        }

        const unsavedMark = this.isDirty ? "*" : "";
        windowInstance.setTitle(`${baseTitle} - ${fileName}${unsavedMark}`);
        if (this.filenameDisplay) { // Actualizar también el span en la toolbar si existe
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
            alert(`Error: No se pudo abrir el archivo "${path}".`);
            this._newFile(windowInstance); // Volver a un estado limpio
        }
    }

    _openFilePrompt(windowInstance) {
        const defaultPath = this.currentFilePath ?
            this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1) :
            "/Documents/";
        const path = prompt("Ingresa la ruta completa del archivo a abrir:", defaultPath);

        if (path && path.trim()) {
            this._loadFile(path.trim(), windowInstance);
        }
    }

    _saveFile(windowInstance) { // Devuelve true si se guardó, false si se canceló o falló
        if (!this.currentFilePath) {
            return this._saveFileAs(windowInstance);
        }

        const success = this.webOS.fs.writeFile(this.currentFilePath, this.textarea.value);
        if (success) {
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
            // Podríamos tener una notificación "Archivo guardado"
            return true;
        } else {
            alert("Error al guardar el archivo.");
            return false;
        }
    }

    _saveFileAs(windowInstance) { // Devuelve true si se guardó, false si se canceló o falló
        let defaultDir = "/Documents/";
        let defaultName = "Sin título.txt";

        if (this.currentFilePath) {
            defaultDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1);
            defaultName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
        }

        const newPath = prompt("Guardar como (ruta completa y nombre de archivo):", defaultDir + defaultName);

        if (!newPath || !newPath.trim()) return false; // Usuario canceló

        const trimmedPath = newPath.trim();
        if (!trimmedPath.endsWith('.txt')) {
            alert("El nombre del archivo debe terminar en .txt");
            return false;
        }

        // Comprobar si el archivo ya existe y pedir confirmación
        if (this.webOS.fs.pathExists(trimmedPath)) {
            if (!confirm(`El archivo "${trimmedPath}" ya existe. ¿Deseas sobrescribirlo?`)) {
                return false; // Usuario canceló la sobrescritura
            }
        }

        const success = this.webOS.fs.writeFile(trimmedPath, this.textarea.value);
        if (success) {
            this.currentFilePath = trimmedPath;
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
            return true;
        } else {
            alert("Error al guardar el archivo como.");
            return false;
        }
    }

    // Sobrescribimos onRelaunch para manejar la apertura de un archivo en una instancia existente
    // o crear una nueva si el modo es allowMultipleInstances y se pide un archivo específico.
    onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        if (launchOptions && launchOptions.filePathToOpen) {
            // Si ya hay una instancia y se pide abrir un archivo,
            // preguntamos si se quieren descartar cambios en la instancia actual (si los hay)
            if (this.isDirty) {
                if (!confirm("Tienes cambios sin guardar en el archivo actual de esta ventana. ¿Descartar y abrir el nuevo archivo aquí?")) {
                    // Si el usuario cancela, podríamos optar por abrir en una nueva instancia si está permitido.
                    // Esto complica la lógica de cuál instancia es `this`.
                    // Por ahora, si cancela, no hacemos nada con esta instancia.
                    // El sistema podría haber abierto ya una nueva si `allowMultipleInstances` es true.
                    return;
                }
            }
            this._loadFile(launchOptions.filePathToOpen, windowInstance);
        }
    }

    // Cuando una instancia de ventana se cierra, limpiamos sus referencias.
    // App.js ya maneja la eliminación de `closedWindow` de `this.instances`.
    // Aquí no necesitamos hacer mucho más a menos que haya estado específico de la instancia
    // que no esté en `this` (que es compartido entre instancias si no se maneja con cuidado).
    // Como this.textarea, etc., se actualizan en renderContent, cada instancia nueva
    // tendrá sus propias referencias DOM. El estado como currentFilePath es más complicado
    // si realmente queremos múltiples documentos editándose independientemente en la misma *clase* App.
    // La solución actual asume que `this` se refiere al estado del *último* `renderContent` llamado.
    // Para un verdadero MDI (Multiple Document Interface) dentro de una sola clase App,
    // el estado (filePath, content, dirty) debería estar asociado a cada `windowInstance`.
}