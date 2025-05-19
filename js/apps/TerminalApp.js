// js/apps/TerminalApp.js
import { App } from '../core/App.js';

export class TerminalApp extends App {
    constructor(webOS) {
        super('terminal', 'Terminal', 'fas fa-terminal', webOS, {
            window: { width: 600, height: 400, minWidth: 400, minHeight: 300, customClass: 'terminal-app' }
        });
        this.currentPath = '/'; // Iniciar en la raíz del FS del usuario
        this.history = [];
        this.historyIndex = -1;

        this.outputElement = null;
        this.inputElement = null;
        this.promptElement = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.activeWindowInstance = windowInstance;
        this.currentPath = launchOptions?.startPath || this.webOS.userSession.getUserSetting('terminalLastPath') || '/';


        contentElement.innerHTML = `
            <div class="terminal-output"></div>
            <div class="terminal-input-line">
                <span class="terminal-prompt"></span>
                <input type="text" class="terminal-input" spellcheck="false" autofocus>
            </div>
        `;

        this.outputElement = contentElement.querySelector('.terminal-output');
        this.inputElement = contentElement.querySelector('.terminal-input');
        this.promptElement = contentElement.querySelector('.terminal-prompt');

        this._updatePrompt();
        this._printWelcomeMessage();

        this.inputElement.addEventListener('keydown', (e) => this._handleInput(e));

        // Hacer clic en cualquier parte del terminal enfoca el input
        contentElement.addEventListener('click', () => this.inputElement.focus());

        windowInstance.on('focus', () => this.inputElement.focus()); // Enfocar al activar ventana
        windowInstance.setTitle(`Terminal - ${this.currentPath}`);
    }

    _updatePrompt() {
        const username = this.webOS.userSession.getCurrentUsername() || 'user';
        this.promptElement.textContent = `${username}@auraos:${this.currentPath}$ `;
    }

    _printWelcomeMessage() {
        this._appendOutput("Bienvenido a la Terminal de AuraOS (Versión Muy Básica)");
        this._appendOutput("Escribe 'help' para ver los comandos disponibles.");
        this._appendOutput(""); // Línea vacía
    }

    _handleInput(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const commandLine = this.inputElement.value.trim();
            this.inputElement.value = '';

            if (commandLine) {
                this._appendOutput(`${this.promptElement.textContent}${commandLine}`);
                this.history.push(commandLine);
                this.historyIndex = this.history.length; // Apuntar al final para nuevo comando
                this._processCommand(commandLine);
            } else {
                // Si solo se presiona Enter sin comando, solo añadir nueva línea de prompt
                this._appendOutput(this.promptElement.textContent);
            }
            this._updatePrompt(); // Actualizar prompt para la siguiente línea (podría haber cambiado el path)
            this.outputElement.scrollTop = this.outputElement.scrollHeight; // Scroll al final
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.history.length > 0 && this.historyIndex > 0) {
                this.historyIndex--;
                this.inputElement.value = this.history[this.historyIndex];
                this.inputElement.setSelectionRange(this.inputElement.value.length, this.inputElement.value.length); // Mover cursor al final
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length -1) {
                this.historyIndex++;
                this.inputElement.value = this.history[this.historyIndex];
            } else if (this.historyIndex === this.history.length -1) {
                this.historyIndex++;
                this.inputElement.value = ""; // Limpiar si está al final del historial
            }
             this.inputElement.setSelectionRange(this.inputElement.value.length, this.inputElement.value.length);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            // Autocompletado básico (muy simple)
            const currentText = this.inputElement.value;
            const parts = currentText.split(' ');
            const toComplete = parts.pop();
            if (toComplete) {
                const parentDir = parts.length > 0 && (parts[0] === 'cd' || parts[0] === 'ls' || parts[0] === 'cat') ?
                                (parts[1] && parts[1].includes('/') ? this._resolveRelativePath(parts[1].substring(0, parts[1].lastIndexOf('/')+1)) : this.currentPath) :
                                this.currentPath;

                const items = this.webOS.fs.listDirectory(parentDir);
                if (items) {
                    const matches = items.filter(item => item.name.toLowerCase().startsWith(toComplete.toLowerCase()));
                    if (matches.length === 1) {
                        const completion = parts.join(' ') + (parts.length > 0 ? ' ' : '') + matches[0].name + (matches[0].type === 'folder' ? '/' : ' ');
                        this.inputElement.value = completion;
                        this.inputElement.setSelectionRange(completion.length, completion.length);
                    } else if (matches.length > 1) {
                        this._appendOutput(this.promptElement.textContent + currentText);
                        matches.forEach(m => this._appendOutput(m.name + (m.type === 'folder' ? '/' : '')));
                        // No actualizar prompt aquí, solo mostrar opciones
                    }
                }
            }
        }
    }

    _appendOutput(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        // Escapar HTML para evitar XSS si el texto viene de una fuente no confiable (ej. contenido de archivo)
        // Para comandos y salida del sistema, podemos confiar en él o usar textContent.
        // Si 'text' puede contener '<' o '>', textContent es más seguro.
        // Por ahora, para simplicidad, asumimos que la salida del sistema es segura.
        line.innerHTML = text.replace(/ /g, ' '); // Para preservar espacios múltiples
        this.outputElement.appendChild(line);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    _resolveRelativePath(path) {
        if (!path || typeof path !== 'string') return this.currentPath;
        if (path.startsWith('/')) return this.webOS.fs._normalizePath(path); // Ya es absoluto

        let newPathParts = this.currentPath === '/' ? [] : this.currentPath.split('/').filter(p => p);
        const relativeParts = path.split('/').filter(p => p);

        for (const part of relativeParts) {
            if (part === '.') continue;
            if (part === '..') {
                if (newPathParts.length > 0) newPathParts.pop();
            } else {
                newPathParts.push(part);
            }
        }
        return this.webOS.fs._normalizePath('/' + newPathParts.join('/'));
    }

    _processCommand(commandLine) {
        const [command, ...args] = commandLine.split(/\s+/).filter(s => s); // Dividir por espacios y quitar vacíos

        if (!command) return;

        switch (command.toLowerCase()) {
            case 'help':
                this._appendOutput("Comandos disponibles:");
                this._appendOutput("  help              - Muestra esta ayuda.");
                this._appendOutput("  echo [texto]      - Repite el texto ingresado.");
                this._appendOutput("  date              - Muestra la fecha y hora actual.");
                this._appendOutput("  clear             - Limpia la pantalla de la terminal.");
                this._appendOutput("  ls [ruta]         - Lista el contenido de un directorio (por defecto el actual).");
                this._appendOutput("  cat [archivo]     - Muestra el contenido de un archivo de texto.");
                this._appendOutput("  cd [directorio]   - Cambia al directorio especificado.");
                this._appendOutput("  mkdir [nombre]    - Crea un nuevo directorio.");
                this._appendOutput("  pwd               - Muestra la ruta del directorio actual.");
                this._appendOutput("  whoami            - Muestra el nombre de usuario actual.");
                break;
            case 'echo':
                this._appendOutput(args.join(' '));
                break;
            case 'date':
                this._appendOutput(new Date().toLocaleString());
                break;
            case 'clear':
                this.outputElement.innerHTML = '';
                this._printWelcomeMessage(); // Re-imprimir bienvenida para no dejarla totalmente vacía
                break;
            case 'ls':
                const lsPathArg = args[0] ? this._resolveRelativePath(args[0]) : this.currentPath;
                const items = this.webOS.fs.listDirectory(lsPathArg);
                if (items) {
                    if (items.length === 0) {
                        this._appendOutput("Directorio vacío.");
                    } else {
                        items.sort((a, b) => { // Ordenar: carpetas primero, luego por nombre
                            if (a.type === 'folder' && b.type !== 'folder') return -1;
                            if (a.type !== 'folder' && b.type === 'folder') return 1;
                            return a.name.localeCompare(b.name);
                        }).forEach(item => {
                            this._appendOutput(`${item.type === 'folder' ? 'd' : '-'}  ${item.name}`);
                        });
                    }
                } else {
                    this._appendOutput(`ls: no se puede acceder a '${lsPathArg}': No es un directorio o no existe.`);
                }
                break;
            case 'cat':
                if (args.length === 0) {
                    this._appendOutput("cat: falta operando de archivo.");
                    break;
                }
                const catPath = this._resolveRelativePath(args[0]);
                const content = this.webOS.fs.readFile(catPath);
                if (content !== null) {
                    // Dividir por líneas para evitar problemas con líneas muy largas y scroll del div
                    content.split('\n').forEach(line => this._appendOutput(line));
                } else {
                    this._appendOutput(`cat: ${args[0]}: No es un archivo o no existe.`);
                }
                break;
            case 'cd':
                if (args.length === 0) {
                    // 'cd' sin argumentos podría ir al home del usuario, que es '/' aquí
                    this.currentPath = '/';
                } else {
                    const newPath = this._resolveRelativePath(args[0]);
                    if (this.webOS.fs.isDirectory(newPath)) {
                        this.currentPath = newPath;
                    } else {
                        this._appendOutput(`cd: ${args[0]}: No es un directorio o no existe.`);
                    }
                }
                this.activeWindowInstance.setTitle(`Terminal - ${this.currentPath}`);
                this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath); // Guardar último path
                break;
            case 'mkdir':
                if (args.length === 0) {
                    this._appendOutput("mkdir: falta operando.");
                    break;
                }
                const dirName = args[0];
                // Evitar nombres con /
                if (dirName.includes('/')) {
                     this._appendOutput("mkdir: nombre de directorio inválido (no usar '/').");
                     break;
                }
                const newDirPath = this._resolveRelativePath(dirName);
                if (this.webOS.fs.createDirectory(newDirPath)) {
                    // this._appendOutput(`Directorio '${dirName}' creado.`); // Opcional
                } else {
                    this._appendOutput(`mkdir: no se puede crear el directorio '${dirName}': Ya existe o ruta inválida.`);
                }
                break;
            case 'pwd':
                this._appendOutput(this.currentPath);
                break;
            case 'whoami':
                this._appendOutput(this.webOS.userSession.getCurrentUsername() || 'user');
                break;
            default:
                this._appendOutput(`${command}: comando no encontrado. Escribe 'help'.`);
                break;
        }
    }

    onClose() {
        // Guardar el último path al cerrar, por si no se hizo en 'cd'
        this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath);
        super.onClose();
    }
}