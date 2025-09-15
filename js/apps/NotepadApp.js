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

        contentElement.querySelector('.notepad-toolbar').addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) await this._handleToolbarAction(button.dataset.action);
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

    async _handleBeforeClose(windowInstance) {
        if (this.isDirty) {
            const shouldSave = await this.webOS.modals.showConfirm(
                "Tienes cambios sin guardar. ¿Quieres guardar antes de cerrar?", 
                'Cambios sin guardar', 
                'fa-exclamation-triangle'
            );
            if (shouldSave) {
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

    async _handleToolbarAction(action) {
        const currentWindow = this.webOS.windowManager.getWindow(this.instances[this.instances.length -1]?.id); // Asumimos que la última instancia es la relevante
        if (!currentWindow) {
            console.error("Notepad: No se pudo obtener la instancia de la ventana actual.");
            return;
        }

        switch(action) {
            case 'new':
                if (this.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "Hay cambios sin guardar. ¿Descartarlos y crear un nuevo archivo?", 
                        'Cambios sin guardar', 
                        'fa-exclamation-triangle'
                    );
                    if (!shouldDiscard) return;
                }
                this._newFile(currentWindow);
                break;
            case 'open':
                if (this.isDirty) {
                    const shouldDiscard = await this.webOS.modals.showConfirm(
                        "Hay cambios sin guardar. ¿Descartarlos y abrir otro archivo?", 
                        'Cambios sin guardar', 
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
            this.webOS.modals.showAlert(`Error: No se pudo abrir el archivo "${path}".`, 'Error al abrir archivo', 'fa-exclamation-triangle');
            this._newFile(windowInstance); // Volver a un estado limpio
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
            console.log('Apertura de archivo cancelada');
        }
    }

    async _saveFile(windowInstance) { // Devuelve true si se guardó, false si se canceló o falló
        if (!this.currentFilePath) {
            return await this._saveFileAs(windowInstance);
        }

        const success = this.webOS.fs.writeFile(this.currentFilePath, this.textarea.value);
        if (success) {
            this.originalContent = this.textarea.value;
            this.isDirty = false;
            this._updateWindowTitle(windowInstance);
            // Podríamos tener una notificación "Archivo guardado"
            return true;
        } else {
            this.webOS.modals.showAlert("Error al guardar el archivo.", 'Error de guardado', 'fa-exclamation-triangle');
            return false;
        }
    }

    async _saveFileAs(windowInstance) { // Devuelve true si se guardó, false si se canceló o falló
        let defaultDir = "/Documents/";
        let defaultName = "Sin título.txt";

        if (this.currentFilePath) {
            defaultDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/') + 1);
            defaultName = this.currentFilePath.substring(this.currentFilePath.lastIndexOf('/') + 1);
        }

        // Usar el modal del explorador de archivos
        const newPath = await this.webOS.modals.showFileSaveDialog(
            defaultDir, 
            defaultName, 
            ['.txt']
        );

        if (!newPath) return false; // Usuario canceló

        // Comprobar si el archivo ya existe y pedir confirmación
        if (this.webOS.fs.pathExists(newPath)) {
            const shouldOverwrite = await this.webOS.modals.showConfirm(
                `El archivo "${newPath}" ya existe. ¿Deseas sobrescribirlo?`, 
                'Archivo existe', 
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
            this.webOS.modals.showAlert("Error al guardar el archivo como.", 'Error de guardado', 'fa-exclamation-triangle');
            return false;
        }
    }

    // Sobrescribimos onRelaunch para manejar la apertura de un archivo en una instancia existente
    // o crear una nueva si el modo es allowMultipleInstances y se pide un archivo específico.
    async onRelaunch(windowInstance, launchOptions) {
        super.onRelaunch(windowInstance, launchOptions);
        if (launchOptions && launchOptions.filePathToOpen) {
            // Si ya hay una instancia y se pide abrir un archivo,
            // preguntamos si se quieren descartar cambios en la instancia actual (si los hay)
            if (this.isDirty) {
                const shouldDiscard = await this.webOS.modals.showConfirm(
                    "Tienes cambios sin guardar en el archivo actual de esta ventana. ¿Descartar y abrir el nuevo archivo aquí?", 
                    'Cambios sin guardar', 
                    'fa-exclamation-triangle'
                );
                if (!shouldDiscard) {
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