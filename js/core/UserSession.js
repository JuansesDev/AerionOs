// Clase UserSession: Gestiona la sesión del usuario, autenticación y datos persistentes
import { EventEmittable } from './EventEmittable.js';

export class UserSession extends EventEmittable {
    constructor() {
        super();
        this.currentUser = null;
        this.loadUser();
    }

    // Carga los datos del usuario desde localStorage
    loadUser() {
        const userData = localStorage.getItem('auraOS_currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Inicia sesión con un nombre de usuario existente
    login(username) {
        const users = JSON.parse(localStorage.getItem('auraOS_users') || '{}');
        if (users[username]) {
            this.currentUser = { username, data: users[username] }; // Cargar datos del usuario
            localStorage.setItem('auraOS_currentUser', JSON.stringify(this.currentUser));
            this.emit('login', this.currentUser);
            return true;
        }
        return false;
    }

    // Registra un nuevo usuario
    register(username) {
        let users = JSON.parse(localStorage.getItem('auraOS_users') || '{}');
        if (users[username]) {
            return { success: false, message: 'El nombre de usuario ya existe.' };
        }
        users[username] = {
            createdAt: new Date().toISOString(),
            settings: { // Default settings for new user
                wallpaper: 'https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png' // Fondo predeterminado actualizado
            }
        };
        localStorage.setItem('auraOS_users', JSON.stringify(users));

        this.currentUser = { username, data: users[username] };
        localStorage.setItem('auraOS_currentUser', JSON.stringify(this.currentUser));
        this.emit('login', this.currentUser);
        return { success: true };
    }

    // Cierra la sesión actual
    logout() {
        const oldUser = this.currentUser;
        // Emitir el evento 'logout' antes de eliminar los datos del usuario
        this.emit('logout', oldUser);
        // Después limpiar los datos del usuario
        this.currentUser = null;
        localStorage.removeItem('auraOS_currentUser');
    }

    // Verifica si hay un usuario autenticado
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Obtiene el nombre de usuario actual
    getCurrentUsername() {
        return this.currentUser ? this.currentUser.username : null;
    }

    // Obtiene datos específicos del usuario
    getUserData(key) {
        if (this.currentUser && this.currentUser.data) {
            return key ? this.currentUser.data[key] : this.currentUser.data;
        }
        return null;
    }

    // Actualiza los datos del usuario
    updateUserData(key, value) {
        if (this.currentUser && this.currentUser.data) {
            this.currentUser.data[key] = value;
            // Persist change to all users list
            let users = JSON.parse(localStorage.getItem('auraOS_users') || '{}');
            if (users[this.currentUser.username]) {
                users[this.currentUser.username][key] = value;
                localStorage.setItem('auraOS_users', JSON.stringify(users));
            }
            // Persist change to current user session
            localStorage.setItem('auraOS_currentUser', JSON.stringify(this.currentUser));
            this.emit('userDataChanged', { key, value });
        }
    }

    // Establece una configuración específica del usuario
    setUserSetting(settingKey, value) {
        if (this.currentUser && this.currentUser.data) {
            if (!this.currentUser.data.settings) {
                this.currentUser.data.settings = {};
            }
            this.currentUser.data.settings[settingKey] = value;

            // Persist change to all users list
            let users = JSON.parse(localStorage.getItem('auraOS_users') || '{}');
            if (users[this.currentUser.username]) {
                if(!users[this.currentUser.username].settings) {
                    users[this.currentUser.username].settings = {};
                }
                users[this.currentUser.username].settings[settingKey] = value;
                localStorage.setItem('auraOS_users', JSON.stringify(users));

                // Actualizar también el objeto currentUser en localStorage
                localStorage.setItem('auraOS_currentUser', JSON.stringify(this.currentUser));
                console.log(`User setting updated: ${settingKey} = ${value}`);

                this.emit('userSettingChanged', { key: settingKey, value });
                return true;
            } else {
                console.error('Failed to update user settings: user not found in storage');
            }
        } else {
            console.error('Failed to update user settings: no current user');
        }
        return false;
    }

    // Obtiene una configuración específica del usuario
    getUserSetting(settingKey) {
        const settings = this.getUserData('settings');
        const value = settings ? settings[settingKey] : undefined;
        console.log(`Getting user setting: ${settingKey} = ${value}`);
        return value;
    }
}