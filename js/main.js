import { UserSession } from './core/UserSession.js';
import { FileSystem } from './core/FileSystem.js';
import { WindowManager } from './core/WindowManager.js';
import { ContextMenu } from './core/ContextMenu.js';
import { ModalSystem } from './core/ModalSystem.js';
import { Window as AerionWindow } from './core/Window.js';

import { AuthScreen } from './ui/AuthScreen.js';
import { Desktop } from './ui/Desktop.js';
import { Taskbar } from './ui/Taskbar.js';
import { StartMenu } from './ui/StartMenu.js';

import { CalculatorApp } from './apps/CalculatorApp.js';
import { NotepadApp } from './apps/NotepadApp.js';
import { FileExplorerApp } from './apps/FileExplorerApp.js';
import { BrowserApp } from './apps/BrowserApp.js';
import { SettingsApp } from './apps/SettingsApp.js';
import { MinesweeperApp } from './apps/MinesweeperApp.js';
import { ChessApp } from './apps/ChessApp.js';
import { TerminalApp } from './apps/TerminalApp.js';
import { CodeEditorApp } from './apps/CodeEditorApp.js';
import { DrawingApp } from './apps/DrawingApp.js';
import { DoomApp } from './apps/DoomApp.js';

window.AerionOs_Window = AerionWindow;


class WebOS {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`AerionOS Error: Container element with ID '${containerId}' not found.`);
            alert("Critical error: AerionOS could not be initialized. Container not found.");
            return;
        }

        this.userSession = new UserSession();
        this.fs = null;
        this.windowManager = new WindowManager(this);
        this.contextMenu = new ContextMenu(this);
        this.modals = new ModalSystem(this);

        this.desktop = null;
        this.taskbar = null;
        this.startMenu = null;
        this.authScreen = new AuthScreen(this.container, this.userSession);

        this.apps = {};

        this._bindSessionEvents();

        if (this.userSession.isAuthenticated()) {
            this._onLogin(this.userSession.currentUser);
        } else {
            this._autoLoginDefaultUser();
        }
    }

    _bindSessionEvents() {
        this.userSession.on('login', (user) => this._onLogin(user));
        this.userSession.on('logout', (oldUser) => this._onLogout(oldUser));
    }

    _onLogin(user) {
        console.log(`AerionOS: User '${user.username}' logged in.`);
        this.authScreen.hide();
        this.container.innerHTML = '';

        this.fs = new FileSystem(user.username);

        this.desktop = new Desktop(this);
        this.taskbar = new Taskbar(this);
        this.startMenu = new StartMenu(this);

        this.container.append(this.desktop.element, this.taskbar.element, this.startMenu.element);

        this._registerApps();
        this._populateDesktop();

        void this.container.offsetWidth;
    }

    _onLogout(oldUser) {
        console.log(`AerionOS: User '${oldUser?.username || 'Unknown'}' logged out.`);
        Object.keys(this.windowManager.openWindows).forEach(winId => {
            const win = this.windowManager.getWindow(winId);
            if(win) win.close();
        });

        this.desktop?.element.remove();
        this.taskbar?.element.remove();
        this.startMenu?.element.remove();
        this.taskbar?.destroy();
        this.startMenu?.destroy();

        this.desktop = null;
        this.taskbar = null;
        this.startMenu = null;
        this.fs = null;
        this.apps = {};

        this.container.innerHTML = '';
        this.authScreen.show();
    }

    _registerApps() {
        this.apps = {
            'calculator': new CalculatorApp(this),
            'notepad': new NotepadApp(this),
            'files': new FileExplorerApp(this),
            'browser': new BrowserApp(this),
            'settings': new SettingsApp(this),
            'minesweeper': new MinesweeperApp(this),
            'chess': new ChessApp(this),
            'terminal': new TerminalApp(this),
            'codeeditor': new CodeEditorApp(this),
            'drawing': new DrawingApp(this),
            'doom': new DoomApp(this)
        };
        console.log("AerionOS: Apps registered:", Object.keys(this.apps));
    }

    _populateDesktop() {
        if (!this.desktop) return;
        this.desktop.element.querySelectorAll('.desktop-icon').forEach(icon => icon.remove());

        const defaultIcons = ['files', 'notepad', 'calculator', 'browser', 'settings', 'minesweeper', 'chess', 'terminal', 'codeeditor', 'drawing', 'doom'];
        defaultIcons.forEach(appId => {
            const app = this.apps[appId];
            if (app) {
                this.desktop.addIcon(app.id, app.name, app.iconClass);
            }
        });
    }

    launchApp(appId, launchOptions = {}) {
        const app = this.apps[appId];
        if (app) {
            console.log(`AerionOS: Launching app '${appId}' with options:`, launchOptions);
            return app.launch(launchOptions);
        } else {
            console.error(`AerionOS Error: Application '${appId}' not found.`);
            alert(`Error: Application "${appId}" not found.`);
            return null;
        }
    }

    _autoLoginDefaultUser() {
        const defaultUsername = 'AerionOsUser';

        const users = JSON.parse(localStorage.getItem('aerionOS_users') || '{}');
        if (!users[defaultUsername]) {
            const result = this.userSession.register(defaultUsername);
            if (result.success) {
                console.log('Default user created and automatically logged in');
            } else {
                console.error('Error creating default user:', result.message);
            }
        } else {
            const success = this.userSession.login(defaultUsername);
            if (success) {
                console.log('Automatic login with default user successful');
            } else {
                console.error('Error during automatic login');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('contextmenu', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
            e.preventDefault();
        }
    });

    window.AerionOS = new WebOS('aura-os-container');
    console.log("AerionOS Initialized.");

    console.log('Service Worker functionality disabled to avoid errors');
});
