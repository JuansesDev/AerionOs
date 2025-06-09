// js/main.js
import { UserSession } from './core/UserSession.js';
import { FileSystem } from './core/FileSystem.js';
import { WindowManager } from './core/WindowManager.js';
import { ContextMenu } from './core/ContextMenu.js';
import { Window as AuraWindow } from './core/Window.js'; // Renombrar para evitar conflicto con window global

import { AuthScreen } from './ui/AuthScreen.js';
import { Desktop } from './ui/Desktop.js';
import { Taskbar } from './ui/Taskbar.js';
import { StartMenu } from './ui/StartMenu.js';

// Importar Aplicaciones
import { CalculatorApp } from './apps/CalculatorApp.js';
import { NotepadApp } from './apps/NotepadApp.js'; // Asegúrate de crear este archivo
import { FileExplorerApp } from './apps/FileExplorerApp.js'; // Asegúrate de crear este archivo
import { BrowserApp } from './apps/BrowserApp.js'; // Asegúrate de crear este archivo
import { SettingsApp } from './apps/SettingsApp.js'; // Asegúrate de crear este archivo
import { MinesweeperApp } from './apps/MinesweeperApp.js';
import { ChessApp } from './apps/ChessApp.js';
import { TerminalApp } from './apps/TerminalApp.js'; // Importar Terminal
import { CodeEditorApp } from './apps/CodeEditorApp.js'; // Importar Editor de Código
import { DrawingApp } from './apps/DrawingApp.js'; // Importar Aplicación de Dibujo

// Hacer Window accesible globalmente para que WindowManager pueda instanciarla
// Esta es una solución temporal para la estructura actual. En un sistema más complejo
// se podría usar inyección de dependencias o un service locator.
window.AuraOS_Window = AuraWindow;


class WebOS {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`AuraOS Error: Container element with ID '${containerId}' not found.`);
            alert("Error crítico: No se pudo inicializar AuraOS. Contenedor no encontrado.");
            return;
        }

        this.userSession = new UserSession();
        this.fs = null;
        this.windowManager = new WindowManager(this);
        this.contextMenu = new ContextMenu(this);

        this.desktop = null;
        this.taskbar = null;
        this.startMenu = null;
        this.authScreen = new AuthScreen(this.container, this.userSession);

        this.apps = {};

        this._bindSessionEvents();

        if (this.userSession.isAuthenticated()) {
            this._onLogin(this.userSession.currentUser);
        } else {
            this.authScreen.show();
        }
    }

    _bindSessionEvents() {
        this.userSession.on('login', (user) => this._onLogin(user));
        this.userSession.on('logout', (oldUser) => this._onLogout(oldUser));
    }

    _onLogin(user) {
        console.log(`AuraOS: User '${user.username}' logged in.`);
        this.authScreen.hide();
        this.container.innerHTML = ''; // Limpiar completamente por si acaso

        this.fs = new FileSystem(user.username);

        this.desktop = new Desktop(this);
        this.taskbar = new Taskbar(this);
        this.startMenu = new StartMenu(this);

        this.container.append(this.desktop.element, this.taskbar.element, this.startMenu.element);

        this._registerApps();
        this._populateDesktop(); // Poblar después de registrar apps

        // Forzar un reflujo/repintado para asegurar que los estilos se apliquen
        // a los nuevos elementos del DOM antes de que las apps intenten usarlos.
        void this.container.offsetWidth;
    }

    _onLogout(oldUser) {
        console.log(`AuraOS: User '${oldUser?.username || 'Unknown'}' logged out.`);
        // Cerrar todas las ventanas
        Object.keys(this.windowManager.openWindows).forEach(winId => {
            const win = this.windowManager.getWindow(winId);
            // win.close() podría tener lógica asíncrona o de confirmación,
            // para un logout forzado, podríamos querer una forma más directa.
            // Por ahora, confiamos en el close normal.
            if(win) win.close();
        });

        // Limpiar componentes de UI
        this.desktop?.element.remove();
        this.taskbar?.element.remove();
        this.startMenu?.element.remove();
        this.taskbar?.destroy(); // Limpiar intervalos, etc.
        this.startMenu?.destroy();

        this.desktop = null;
        this.taskbar = null;
        this.startMenu = null;
        this.fs = null;
        this.apps = {}; // Limpiar apps registradas

        this.container.innerHTML = ''; // Limpiar completamente
        this.authScreen.show();
    }

    _registerApps() {
        this.apps = {
            'calculator': new CalculatorApp(this),
            'notepad': new NotepadApp(this), // Asume que NotepadApp.js existe y exporta la clase
            'files': new FileExplorerApp(this), // Asume que FileExplorerApp.js existe
            'browser': new BrowserApp(this), // Asume que BrowserApp.js existe
            'settings': new SettingsApp(this), // Asume que SettingsApp.js existe
            'minesweeper': new MinesweeperApp(this), // Registrar Buscaminas
            'chess': new ChessApp(this), // Registrar Ajedrez
            'terminal': new TerminalApp(this), // Registrar Terminal
            'codeeditor': new CodeEditorApp(this), // Registrar Editor de Código
            'drawing': new DrawingApp(this) // Registrar Aplicación de Dibujo
        };
        console.log("AuraOS: Apps registered:", Object.keys(this.apps));
    }

    _populateDesktop() {
        if (!this.desktop) return;
        // Limpiar iconos existentes por si se llama múltiples veces (ej. refresh)
        this.desktop.element.querySelectorAll('.desktop-icon').forEach(icon => icon.remove());

        const defaultIcons = ['files', 'notepad', 'calculator', 'browser', 'settings', 'minesweeper', 'chess', 'terminal', 'codeeditor', 'drawing'];
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
            console.log(`AuraOS: Launching app '${appId}' with options:`, launchOptions);
            return app.launch(launchOptions);
        } else {
            console.error(`AuraOS Error: Application '${appId}' not found.`);
            alert(`Error: Aplicación "${appId}" no encontrada.`);
            return null;
        }
    }
}

// ---------- Inicialización Global ----------
document.addEventListener('DOMContentLoaded', () => {
    // Deshabilitar menú contextual nativo en todo el body, excepto en inputs/textareas
    document.body.addEventListener('contextmenu', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
            e.preventDefault();
        }
    });

    // Adjuntar la instancia principal de WebOS al objeto window para depuración y acceso global si es necesario
    window.AuraOS = new WebOS('aura-os-container');
    console.log("AuraOS Initialized.");

    // Reemplazar el código de registro del Service Worker con este bloque más seguro
    // que evita intentar registrar el service worker completamente
    /*
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        // Intentar registrar el Service Worker solo en entornos seguros
        try {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado correctamente:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar el Service Worker:', error);
                });
        } catch (e) {
            console.log('Error al acceder al Service Worker:', e);
        }
    }
    */

    // En lugar de registrar un Service Worker, mostramos un mensaje en la consola
    console.log('Funcionalidad de Service Worker deshabilitada para evitar errores');
});