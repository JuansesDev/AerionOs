import { EventEmittable } from './EventEmittable.js';

export class UserSession extends EventEmittable {
    constructor() {
        super();
        this.currentUser = null;
        this.loadUser();
    }

    loadUser() {
        const userData = localStorage.getItem('aerionOS_currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    login(username) {
        const users = JSON.parse(localStorage.getItem('aerionOS_users') || '{}');
        if (users[username]) {
            this.currentUser = { username, data: users[username] };
            localStorage.setItem('aerionOS_currentUser', JSON.stringify(this.currentUser));
            this.emit('login', this.currentUser);
            return true;
        }
        return false;
    }

    register(username) {
        let users = JSON.parse(localStorage.getItem('aerionOS_users') || '{}');
        if (users[username]) {
            return { success: false, message: 'The username already exists.' };
        }
        users[username] = {
            createdAt: new Date().toISOString(),
            settings: {
                wallpaper: 'public/AerionOs.png'
            }
        };
        localStorage.setItem('aerionOS_users', JSON.stringify(users));

        this.currentUser = { username, data: users[username] };
        localStorage.setItem('aerionOS_currentUser', JSON.stringify(this.currentUser));
        this.emit('login', this.currentUser);
        return { success: true };
    }

    logout() {
        const oldUser = this.currentUser;
        this.emit('logout', oldUser);
        this.currentUser = null;
        localStorage.removeItem('aerionOS_currentUser');
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUsername() {
        return this.currentUser ? this.currentUser.username : null;
    }

    getUserData(key) {
        if (this.currentUser && this.currentUser.data) {
            return key ? this.currentUser.data[key] : this.currentUser.data;
        }
        return null;
    }

    updateUserData(key, value) {
        if (this.currentUser && this.currentUser.data) {
            this.currentUser.data[key] = value;
            let users = JSON.parse(localStorage.getItem('aerionOS_users') || '{}');
            if (users[this.currentUser.username]) {
                users[this.currentUser.username][key] = value;
                localStorage.setItem('aerionOS_users', JSON.stringify(users));
            }
            localStorage.setItem('aerionOS_currentUser', JSON.stringify(this.currentUser));
            this.emit('userDataChanged', { key, value });
        }
    }

    setUserSetting(settingKey, value) {
        if (this.currentUser && this.currentUser.data) {
            if (!this.currentUser.data.settings) {
                this.currentUser.data.settings = {};
            }
            this.currentUser.data.settings[settingKey] = value;

            let users = JSON.parse(localStorage.getItem('aerionOS_users') || '{}');
            if (users[this.currentUser.username]) {
                if(!users[this.currentUser.username].settings) {
                    users[this.currentUser.username].settings = {};
                }
                users[this.currentUser.username].settings[settingKey] = value;
                localStorage.setItem('aerionOS_users', JSON.stringify(users));

                localStorage.setItem('aerionOS_currentUser', JSON.stringify(this.currentUser));
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

    getUserSetting(settingKey) {
        const settings = this.getUserData('settings');
        const value = settings ? settings[settingKey] : undefined;
        console.log(`Getting user setting: ${settingKey} = ${value}`);
        return value;
    }
}