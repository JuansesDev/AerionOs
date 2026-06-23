import { App } from '../core/App.js';

export class TerminalApp extends App {
    constructor(webOS) {
        super('terminal', 'Terminal', 'fas fa-terminal', webOS, {
            window: { width: 640, height: 420, minWidth: 420, minHeight: 300, customClass: 'terminal-app' }
        });
        this.currentPath = '/';
        this.history = [];
        this.historyIndex = -1;

        this.outputElement = null;
        this.inputElement = null;
        this.promptElement = null;

        this.COMMANDS = [
            'help', 'clear', 'echo', 'date', 'pwd', 'whoami', 'ls', 'cd', 'cat',
            'mkdir', 'touch', 'rm', 'cp', 'mv', 'tree', 'open', 'neofetch', 'history'
        ];
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
        windowInstance.on('close', () => this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath));
        windowInstance.setTitle(`Terminal - ${this.currentPath}`);
    }

    _updatePrompt() {
        const username = this.webOS.userSession.getCurrentUsername() || 'user';
        this.promptElement.textContent = `${username}@aerionos:${this.currentPath}$ `;
    }

    _printWelcomeMessage() {
        this._appendOutput("AerionOS Terminal", 'accent');
        this._appendOutput("Type 'help' for the list of commands.", 'muted');
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
                this._setCaretEnd();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputElement.value = this.history[this.historyIndex];
            } else if (this.historyIndex === this.history.length - 1) {
                this.historyIndex++;
                this.inputElement.value = "";
            }
            this._setCaretEnd();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this._handleTabCompletion();
        }
    }

    _setCaretEnd() {
        const len = this.inputElement.value.length;
        this.inputElement.setSelectionRange(len, len);
    }

    _handleTabCompletion() {
        const text = this.inputElement.value;

        if (!text.includes(' ')) {
            const matches = this.COMMANDS.filter(c => c.startsWith(text.toLowerCase()));
            if (matches.length === 1) {
                this.inputElement.value = matches[0] + ' ';
                this._setCaretEnd();
            } else if (matches.length > 1) {
                this._appendOutput(this.promptElement.textContent + text);
                this._appendOutput(matches.join('  '));
            }
            return;
        }

        const parts = text.split(' ');
        const toComplete = parts.pop();
        if (!toComplete) return;

        const slashIndex = toComplete.lastIndexOf('/');
        const dirFragment = slashIndex >= 0 ? toComplete.substring(0, slashIndex + 1) : '';
        const nameFragment = slashIndex >= 0 ? toComplete.substring(slashIndex + 1) : toComplete;
        const lookupDir = dirFragment ? this._resolveRelativePath(dirFragment) : this.currentPath;

        const items = this.webOS.fs.listDirectory(lookupDir);
        if (!items) return;

        const matches = items.filter(item => item.name.toLowerCase().startsWith(nameFragment.toLowerCase()));
        if (matches.length === 1) {
            const suffix = matches[0].type === 'folder' ? '/' : ' ';
            const completed = parts.join(' ') + (parts.length ? ' ' : '') + dirFragment + matches[0].name + suffix;
            this.inputElement.value = completed;
            this._setCaretEnd();
        } else if (matches.length > 1) {
            this._appendOutput(this.promptElement.textContent + text);
            matches.forEach(m => this._appendOutput(m.name + (m.type === 'folder' ? '/' : ''), m.type === 'folder' ? 'dir' : ''));
        }
    }

    _appendOutput(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`.trim();
        line.textContent = text;
        this.outputElement.appendChild(line);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    _basename(path) {
        return path.split('/').filter(p => p).pop() || '/';
    }

    _parentPath(path) {
        const parts = path.split('/').filter(p => p);
        parts.pop();
        return parts.length ? '/' + parts.join('/') : '/';
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

    _appForFile(path) {
        const ext = path.split('.').pop().toLowerCase();
        if (['html', 'htm', 'css', 'js', 'json', 'md'].includes(ext)) return 'codeeditor';
        return 'notepad';
    }

    _processCommand(commandLine) {
        const [command, ...args] = commandLine.split(/\s+/).filter(s => s);
        if (!command) return;

        switch (command.toLowerCase()) {
            case 'help':
                this._appendOutput("Available commands:", 'accent');
                this._appendOutput("  help              Show this help");
                this._appendOutput("  clear             Clear the screen");
                this._appendOutput("  echo [text]       Print text (supports > and >> to a file)");
                this._appendOutput("  date              Show the current date and time");
                this._appendOutput("  pwd               Print the working directory");
                this._appendOutput("  whoami            Print the current user");
                this._appendOutput("  ls [path]         List a directory");
                this._appendOutput("  cd [dir]          Change directory");
                this._appendOutput("  cat [file]        Print a file's contents");
                this._appendOutput("  mkdir [name]      Create a directory");
                this._appendOutput("  touch [file]      Create an empty file");
                this._appendOutput("  rm [-r] [path]    Remove a file or directory");
                this._appendOutput("  cp [src] [dest]   Copy a file");
                this._appendOutput("  mv [src] [dest]   Move or rename");
                this._appendOutput("  tree [path]       Print a directory tree");
                this._appendOutput("  open [app|file]   Launch an app or open a file");
                this._appendOutput("  neofetch          Show system info");
                this._appendOutput("  history           Show command history");
                break;
            case 'clear':
                this.outputElement.innerHTML = '';
                this._printWelcomeMessage();
                break;
            case 'echo':
                this._cmdEcho(args);
                break;
            case 'date':
                this._appendOutput(new Date().toLocaleString());
                break;
            case 'pwd':
                this._appendOutput(this.currentPath);
                break;
            case 'whoami':
                this._appendOutput(this.webOS.userSession.getCurrentUsername() || 'user');
                break;
            case 'ls':
                this._cmdLs(args);
                break;
            case 'cd':
                this._cmdCd(args);
                break;
            case 'cat':
                this._cmdCat(args);
                break;
            case 'mkdir':
                this._cmdMkdir(args);
                break;
            case 'touch':
                this._cmdTouch(args);
                break;
            case 'rm':
                this._cmdRm(args);
                break;
            case 'cp':
                this._cmdCp(args);
                break;
            case 'mv':
                this._cmdMv(args);
                break;
            case 'tree':
                this._cmdTree(args);
                break;
            case 'open':
                this._cmdOpen(args);
                break;
            case 'neofetch':
                this._cmdNeofetch();
                break;
            case 'history':
                this.history.forEach((h, i) => this._appendOutput(`  ${String(i + 1).padStart(3)}  ${h}`));
                break;
            default:
                this._appendOutput(`${command}: command not found. Type 'help'.`, 'error');
                break;
        }
    }

    _cmdEcho(args) {
        const redirIdx = args.findIndex(a => a === '>' || a === '>>');
        if (redirIdx === -1) {
            this._appendOutput(args.join(' '));
            return;
        }
        const text = args.slice(0, redirIdx).join(' ');
        const target = args[redirIdx + 1];
        if (!target) {
            this._appendOutput('echo: missing redirect target.', 'error');
            return;
        }
        const path = this._resolveRelativePath(target);
        const append = args[redirIdx] === '>>';
        const existing = append ? (this.webOS.fs.readFile(path) || '') : '';
        const content = append && existing ? `${existing}\n${text}` : text;
        if (!this.webOS.fs.writeFile(path, content)) {
            this._appendOutput(`echo: cannot write to '${target}'.`, 'error');
        }
    }

    _cmdLs(args) {
        const path = args[0] ? this._resolveRelativePath(args[0]) : this.currentPath;
        const items = this.webOS.fs.listDirectory(path);
        if (!items) {
            this._appendOutput(`ls: cannot access '${args[0] || path}': Not a directory or does not exist.`, 'error');
            return;
        }
        if (items.length === 0) {
            this._appendOutput("(empty)", 'muted');
            return;
        }
        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        }).forEach(item => {
            const marker = item.type === 'folder' ? 'd' : '-';
            const name = item.type === 'folder' ? item.name + '/' : item.name;
            this._appendOutput(`${marker}  ${name}`, item.type === 'folder' ? 'dir' : '');
        });
    }

    _cmdCd(args) {
        if (args.length === 0) {
            this.currentPath = '/';
        } else {
            const newPath = this._resolveRelativePath(args[0]);
            if (this.webOS.fs.isDirectory(newPath)) {
                this.currentPath = newPath;
            } else {
                this._appendOutput(`cd: ${args[0]}: Not a directory or does not exist.`, 'error');
                return;
            }
        }
        this.activeWindowInstance.setTitle(`Terminal - ${this.currentPath}`);
        this.webOS.userSession.setUserSetting('terminalLastPath', this.currentPath);
    }

    _cmdCat(args) {
        if (args.length === 0) {
            this._appendOutput("cat: missing file operand.", 'error');
            return;
        }
        const path = this._resolveRelativePath(args[0]);
        const content = this.webOS.fs.readFile(path);
        if (content === null) {
            this._appendOutput(`cat: ${args[0]}: Not a file or does not exist.`, 'error');
            return;
        }
        if (content.startsWith('data:')) {
            this._appendOutput(`[binary file, ${content.length} bytes - use 'open ${args[0]}']`, 'muted');
            return;
        }
        content.split('\n').forEach(line => this._appendOutput(line));
    }

    _cmdMkdir(args) {
        if (args.length === 0) {
            this._appendOutput("mkdir: missing operand.", 'error');
            return;
        }
        if (args[0].includes('/')) {
            this._appendOutput("mkdir: invalid directory name (do not use '/').", 'error');
            return;
        }
        const path = this._resolveRelativePath(args[0]);
        if (!this.webOS.fs.createDirectory(path)) {
            this._appendOutput(`mkdir: cannot create directory '${args[0]}': Already exists or invalid path.`, 'error');
        }
    }

    _cmdTouch(args) {
        if (args.length === 0) {
            this._appendOutput("touch: missing file operand.", 'error');
            return;
        }
        const path = this._resolveRelativePath(args[0]);
        if (this.webOS.fs.pathExists(path)) return;
        if (!this.webOS.fs.writeFile(path, '')) {
            this._appendOutput(`touch: cannot create '${args[0]}'.`, 'error');
        }
    }

    _cmdRm(args) {
        let recursive = false;
        let target = args[0];
        if (args[0] === '-r' || args[0] === '-rf') {
            recursive = true;
            target = args[1];
        }
        if (!target) {
            this._appendOutput("rm: missing operand.", 'error');
            return;
        }
        const path = this._resolveRelativePath(target);
        if (path === '/') {
            this._appendOutput("rm: refusing to remove the root directory.", 'error');
            return;
        }
        if (!this.webOS.fs.pathExists(path)) {
            this._appendOutput(`rm: ${target}: No such file or directory.`, 'error');
            return;
        }
        if (this.webOS.fs.isDirectory(path) && !recursive) {
            this._appendOutput(`rm: ${target}: is a directory (use 'rm -r').`, 'error');
            return;
        }
        if (!this.webOS.fs.delete(path)) {
            this._appendOutput(`rm: cannot remove '${target}'.`, 'error');
        }
    }

    _cmdCp(args) {
        if (args.length < 2) {
            this._appendOutput("cp: missing operand (usage: cp [src] [dest]).", 'error');
            return;
        }
        const src = this._resolveRelativePath(args[0]);
        if (!this.webOS.fs.isFile(src)) {
            this._appendOutput(`cp: ${args[0]}: not a file (only files are supported).`, 'error');
            return;
        }
        let dest = this._resolveRelativePath(args[1]);
        if (this.webOS.fs.isDirectory(dest)) {
            dest = this.webOS.fs._normalizePath(`${dest}/${this._basename(src)}`);
        }
        const content = this.webOS.fs.readFile(src);
        if (!this.webOS.fs.writeFile(dest, content)) {
            this._appendOutput(`cp: cannot copy to '${args[1]}'.`, 'error');
        }
    }

    _cmdMv(args) {
        if (args.length < 2) {
            this._appendOutput("mv: missing operand (usage: mv [src] [dest]).", 'error');
            return;
        }
        const src = this._resolveRelativePath(args[0]);
        if (!this.webOS.fs.pathExists(src)) {
            this._appendOutput(`mv: ${args[0]}: No such file or directory.`, 'error');
            return;
        }
        let dest = this._resolveRelativePath(args[1]);
        if (this.webOS.fs.isDirectory(dest)) {
            dest = this.webOS.fs._normalizePath(`${dest}/${this._basename(src)}`);
        }

        if (this._parentPath(src) === this._parentPath(dest)) {
            if (!this.webOS.fs.rename(src, this._basename(dest))) {
                this._appendOutput(`mv: cannot rename to '${args[1]}'.`, 'error');
            }
            return;
        }

        if (!this.webOS.fs.isFile(src)) {
            this._appendOutput("mv: moving folders across directories is not supported.", 'error');
            return;
        }
        const content = this.webOS.fs.readFile(src);
        if (this.webOS.fs.writeFile(dest, content)) {
            this.webOS.fs.delete(src);
        } else {
            this._appendOutput(`mv: cannot move to '${args[1]}'.`, 'error');
        }
    }

    _cmdTree(args) {
        const root = args[0] ? this._resolveRelativePath(args[0]) : this.currentPath;
        if (!this.webOS.fs.isDirectory(root)) {
            this._appendOutput(`tree: ${args[0] || root}: Not a directory.`, 'error');
            return;
        }
        this._appendOutput(root, 'dir');
        this._printTree(root, '');
    }

    _printTree(path, prefix) {
        const items = (this.webOS.fs.listDirectory(path) || []).sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        items.forEach((item, i) => {
            const last = i === items.length - 1;
            this._appendOutput(`${prefix}${last ? '└── ' : '├── '}${item.name}`, item.type === 'folder' ? 'dir' : '');
            if (item.type === 'folder') {
                this._printTree(this.webOS.fs._normalizePath(`${path}/${item.name}`), prefix + (last ? '    ' : '│   '));
            }
        });
    }

    _cmdOpen(args) {
        if (!args[0]) {
            this._appendOutput("open: missing operand (app id or file path).", 'error');
            return;
        }
        const arg = args[0];
        if (this.webOS.apps && this.webOS.apps[arg]) {
            this.webOS.launchApp(arg);
            this._appendOutput(`Opening ${arg}...`, 'muted');
            return;
        }
        const path = this._resolveRelativePath(arg);
        if (this.webOS.fs.isFile(path)) {
            const appId = this._appForFile(path);
            this.webOS.launchApp(appId, { filePathToOpen: path });
            this._appendOutput(`Opening ${path} in ${appId}...`, 'muted');
        } else {
            this._appendOutput(`open: '${arg}' is not an app or a file.`, 'error');
        }
    }

    _cmdNeofetch() {
        const user = this.webOS.userSession.getCurrentUsername() || 'user';
        const appCount = Object.keys(this.webOS.apps || {}).length;
        const resolution = `${window.innerWidth}x${window.innerHeight}`;
        const ua = navigator.userAgent;
        const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chromium-based' : ua.includes('Safari') ? 'Safari' : 'Web';

        const logo = [
            '     /\\     ',
            '    /  \\    ',
            '   / /\\ \\   ',
            '  / ____ \\  ',
            ' /_/    \\_\\ '
        ];
        const info = [
            `${user}@aerionos`,
            '-----------------',
            `OS:         AerionOS (Beta)`,
            `Shell:      aerion-sh`,
            `Apps:       ${appCount}`,
            `Resolution: ${resolution}`,
            `Browser:    ${browser}`
        ];
        const rows = Math.max(logo.length, info.length);
        for (let i = 0; i < rows; i++) {
            const left = (logo[i] || '           ');
            const right = info[i] || '';
            this._appendOutput(`${left}  ${right}`, 'accent');
        }
    }
}
