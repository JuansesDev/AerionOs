import { App } from '../core/App.js';

export class TerminalApp extends App {
    constructor(webOS) {
        super('terminal', 'Terminal', 'fas fa-terminal', webOS, {
            window: { width: 600, height: 400, minWidth: 400, minHeight: 300, customClass: 'terminal-app' }
        });
        this.currentPath = '/';
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

        contentElement.addEventListener('click', () => this.inputElement.focus());

        windowInstance.on('focus', () => this.inputElement.focus());
        windowInstance.setTitle(`Terminal - ${this.currentPath}`);
    }

    _updatePrompt() {
        const username = this.webOS.userSession.getCurrentUsername() || 'user';
        this.promptElement.textContent = `${username}@aerionos:${this.currentPath}$ `;
    }

    _printWelcomeMessage() {
        this._appendOutput("Welcome to the AerionOS Terminal (Very Basic Version)");
        this._appendOutput("Type 'help' to see the available commands.");
        this._appendOutput("");
    }

    _handleInput(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const commandLine = this.inputElement.value.trim();
            this.inputElement.value = '';

            if (commandLine) {
                this._appendOutput(`${this.promptElement.textContent}${commandLine}`);
                this.history.push(commandLine);
                this.historyIndex = this.history.length;
                this._processCommand(commandLine);
            } else {
                this._appendOutput(this.promptElement.textContent);
            }
            this._updatePrompt();
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.history.length > 0 && this.historyIndex > 0) {
                this.historyIndex--;
                this.inputElement.value = this.history[this.historyIndex];
                this.inputElement.setSelectionRange(this.inputElement.value.length, this.inputElement.value.length);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length -1) {
                this.historyIndex++;
                this.inputElement.value = this.history[this.historyIndex];
            } else if (this.historyIndex === this.history.length -1) {
                this.historyIndex++;
                this.inputElement.value = "";
            }
             this.inputElement.setSelectionRange(this.inputElement.value.length, this.inputElement.value.length);
        } else if (e.key === 'Tab') {
            e.preventDefault();
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
                    }
                }
            }
        }
    }

    _appendOutput(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.innerHTML = text.replace(/ /g, ' ');
        this.outputElement.appendChild(line);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    _resolveRelativePath(path) {
        if (!path || typeof path !== 'string') return this.currentPath;
        if (path.startsWith('/')) return this.webOS.fs._normalizePath(path);

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
        const [command, ...args] = commandLine.split(/\s+/).filter(s => s);

        if (!command) return;

        switch (command.toLowerCase()) {
            case 'help':
                this._appendOutput("Available commands:");
                this._appendOutput("  help              - Shows this help.");
                this._appendOutput("  echo [text]       - Repeats the entered text.");
                this._appendOutput("  date              - Shows the current date and time.");
                this._appendOutput("  clear             - Clears the terminal screen.");
                this._appendOutput("  ls [path]         - Lists the contents of a directory (current by default).");
                this._appendOutput("  cat [file]        - Shows the contents of a text file.");
                this._appendOutput("  cd [directory]    - Changes to the specified directory.");
                this._appendOutput("  mkdir [name]      - Creates a new directory.");
                this._appendOutput("  pwd               - Shows the current directory path.");
                this._appendOutput("  whoami            - Shows the current username.");
                break;
            case 'echo':
                this._appendOutput(args.join(' '));
                break;
            case 'date':
                this._appendOutput(new Date().toLocaleString());
                break;
            case 'clear':
                this.outputElement.innerHTML = '';
                this._printWelcomeMessage();
                break;
            case 'ls':
                const lsPathArg = args[0] ? this._resolveRelativePath(args[0]) : this.currentPath;
                const items = this.webOS.fs.listDirectory(lsPathArg);
                if (items) {
                    if (items.length === 0) {
                        this._appendOutput("Empty directory.");
                    } else {
                        items.sort((a, b) => {
                            if (a.type === 'folder' && b.type !== 'folder') return -1;
                            if (a.type !== 'folder' && b.type === 'folder') return 1;
                            return a.name.localeCompare(b.name);
                        }).forEach(item => {
                            this._appendOutput(`${item.type === 'folder' ? 'd' : '-'}  ${item.name}`);
                        });
                    }
                } else {
                    this._appendOutput(`ls: cannot access '${lsPathArg}': Not a directory or does not exist.`);
                }
                break;
            case 'cat':
                if (args.length === 0) {
                    this._appendOutput("cat: missing file operand.");
                    break;
                }
                const catPath = this._resolveRelativePath(args[0]);
                const content = this.webOS.fs.readFile(catPath);
                if (content !== null) {
                    content.split('\n').forEach(line => this._appendOutput(line));
                } else {
                    this._appendOutput(`cat: ${args[0]}: Not a file or does not exist.`);
                }
                break;
            case 'cd':
                if (args.length === 0) {
                    this.currentPath = '/';
                } else {
                    const newPath = this._resolveRelativePath(args[0]);
                    if (this.webOS.fs.isDirectory(newPath)) {
                        this.currentPath = newPath;
                    } else {
                        this._appendOutput(`cd: ${args[0]}: Not a directory or does not exist.`);
                    }
                }
                this.activeWindowInstance.setTitle(`Terminal - ${this.currentPath}`);
                this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath);
                break;
            case 'mkdir':
                if (args.length === 0) {
                    this._appendOutput("mkdir: missing operand.");
                    break;
                }
                const dirName = args[0];
                if (dirName.includes('/')) {
                     this._appendOutput("mkdir: invalid directory name (do not use '/').");
                     break;
                }
                const newDirPath = this._resolveRelativePath(dirName);
                if (this.webOS.fs.createDirectory(newDirPath)) {
                } else {
                    this._appendOutput(`mkdir: cannot create directory '${dirName}': Already exists or invalid path.`);
                }
                break;
            case 'pwd':
                this._appendOutput(this.currentPath);
                break;
            case 'whoami':
                this._appendOutput(this.webOS.userSession.getCurrentUsername() || 'user');
                break;
            default:
                this._appendOutput(`${command}: command not found. Type 'help'.`);
                break;
        }
    }

    onClose() {
        this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath);
        super.onClose();
    }
}