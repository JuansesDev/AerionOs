export class StartMenu {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.isOpen = false;
        this.activeCategory = 'Home';

        this.updateContent();
        this._attachEventListeners();

        this.boundClickHandler = (event) => this._handleGlobalClick(event);
    }

    _createDOM() {
        const menuEl = document.createElement('div');
        menuEl.id = 'start-menu';
        menuEl.classList.add('hidden');

        menuEl.innerHTML = `
            <div class="start-menu-content">
                <div class="start-menu-categories">
                </div>
                <div class="start-menu-apps">
                </div>
            </div>
            <div class="start-menu-footer">
                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" placeholder="Search applications..." class="search-input" spellcheck="false">
                </div>
                <div class="menu-actions">
                    <button class="user-button" title="User (Coming soon)">
                        <i class="fas fa-user"></i>
                    </button>
                    <button class="settings-button" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="power-button" title="Sign Out">
                        <i class="fas fa-power-off"></i>
                    </button>
                </div>
            </div>
        `;
        this.element = menuEl;
        return menuEl;
    }

    _attachEventListeners() {
        if (!this.element) return;

        const searchInput = this.element.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => {
            this._filterAppsByName(e.target.value.toLowerCase());
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this._filterAppsByName('');
            }
        });


        this.element.querySelector('.power-button').addEventListener('click', async () => {
            try {
                const shouldLogout = await this.webOS.modals.showConfirm("Are you sure you want to sign out?", "Sign Out");
                if (shouldLogout) {
                    this.webOS.userSession.logout();
                    this.hide();
                }
            } catch (error) {
                console.log('Sign out cancelled');
            }
        });

        this.element.querySelector('.settings-button').addEventListener('click', () => {
            this.webOS.launchApp('settings');
            this.hide();
        });

        const userButton = this.element.querySelector('.user-button');
        if (userButton) {
            userButton.addEventListener('click', async () => {
                await this.webOS.modals.showAlert(`User: ${this.webOS.userSession.getCurrentUsername()}\n(User profile functionality coming soon)`, "User Information");
                this.hide();
            });
        }


        this.element.querySelector('.start-menu-apps').addEventListener('click', (e) => {
            const appItem = e.target.closest('.app-item');
            if (appItem) {
                const appId = appItem.dataset.appId;
                const actionType = appItem.dataset.actionType;
                const path = appItem.dataset.path;

                if (actionType === 'open-path' && path) {
                    console.log(`StartMenu: open-path action for: ${path}`);
                    this.webOS.launchApp('files', { path: path });
                    this.hide();
                } else if (appId) {
                    console.log(`StartMenu: Launching app: ${appId}`);
                    this.webOS.launchApp(appId);
                    this.hide();
                }
            }
        });

        this.element.querySelector('.start-menu-categories').addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item[data-category]');
            if (!categoryItem) return;

            const category = categoryItem.dataset.category;
            this.activeCategory = category;

            this.element.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            categoryItem.classList.add('active');

            this.element.querySelector('.search-input').value = '';
            this._filterAppsByCategory(category);
        });
    }

    updateContent() {
        if (!this.element) {
            console.error("StartMenu.updateContent: this.element is not defined.");
            return;
        }

        this.appCategories = this._organizeAppsByCategory();
        this.allRegisteredApps = Object.values(this.webOS.apps);

        let categoriesHTML = '';
        const mainCategories = {
            'Home': 'fas fa-home',
            'Games': 'fas fa-gamepad',
            'Internet': 'fas fa-globe',
            'Office': 'fas fa-file-alt',
            'System Tools': 'fas fa-tools',
            'Utilities': 'fas fa-wrench'
        };

        for (const [category, icon] of Object.entries(mainCategories)) {
            const appCount = this.appCategories[category]?.length || 0;
            if (category === 'Home' || category === 'System Tools' || appCount > 0) {
                categoriesHTML += `
                    <div class="category-item ${category === this.activeCategory ? 'active' : ''}" data-category="${category}">
                        <i class="${icon}"></i>
                        <span>${category}</span>
                    </div>
                `;
            }
        }
        this.element.querySelector('.start-menu-categories').innerHTML = categoriesHTML;
        this._filterAppsByCategory(this.activeCategory || 'Home');
    }

    _filterAppsByCategory(category) {
        if (!this.element) return;
        const appsContainer = this.element.querySelector('.start-menu-apps');
        let appsHTML = '';

        if (category === 'Home') {
            const systemItems = [
                { id: 'desktop-folder', icon: 'fas fa-desktop', name: 'Desktop', actionType: 'open-path', path: '/Desktop' },
                { id: 'documents-folder', icon: 'fas fa-folder-open', name: 'Documents', actionType: 'open-path', path: '/Documents' },
                { id: 'downloads-folder', icon: 'fas fa-download', name: 'Downloads', actionType: 'open-path', path: '/Downloads' },
                { id: 'music-folder', icon: 'fas fa-music', name: 'Music', actionType: 'open-path', path: '/Music' },
                { id: 'pictures-folder', icon: 'fas fa-image', name: 'Pictures', actionType: 'open-path', path: '/Pictures' },
                { id: 'videos-folder', icon: 'fas fa-video', name: 'Videos', actionType: 'open-path', path: '/Videos' },
                { id: 'settings-app', icon: 'fas fa-cog', name: 'Settings', appIdToLaunch: 'settings' }
            ];

            for (const item of systemItems) {
                if (item.actionType === 'open-path') {
                    appsHTML += `
                        <div class="app-item" data-action-type="open-path" data-path="${item.path}">
                            <i class="${item.icon}"></i>
                            <span class="app-name">${item.name}</span>
                        </div>
                    `;
                } else if (item.appIdToLaunch) {
                    appsHTML += `
                        <div class="app-item" data-app-id="${item.appIdToLaunch}">
                            <i class="${item.icon}"></i>
                            <span class="app-name">${item.name}</span>
                        </div>
                    `;
                }
            }
        } else {
            const apps = (this.appCategories[category] || []).sort((a,b) => a.name.localeCompare(b.name));
            if (apps.length === 0) {
                appsHTML = '<div class="no-apps">No applications in this category.</div>';
            } else {
                for (const app of apps) {
                    appsHTML += `
                        <div class="app-item" data-app-id="${app.id}">
                            <i class="${app.iconClass || 'fas fa-rocket'}"></i>
                            <span class="app-name">${app.name}</span>
                        </div>
                    `;
                }
            }
        }
        appsContainer.innerHTML = appsHTML;
    }

    _filterAppsByName(searchTerm) {
        if (!this.element) return;
        const appsContainer = this.element.querySelector('.start-menu-apps');

        if (!searchTerm) {
            this._filterAppsByCategory(this.activeCategory || 'Home');
            return;
        }

        const matchingApps = this.allRegisteredApps.filter(app =>
            app.name.toLowerCase().includes(searchTerm)
        ).sort((a,b) => a.name.localeCompare(b.name));

        let appsHTML = '';
        if (matchingApps.length === 0) {
            appsHTML = '<div class="no-apps">No applications found.</div>';
        } else {
            for (const app of matchingApps) {
                appsHTML += `
                    <div class="app-item" data-app-id="${app.id}">
                        <i class="${app.iconClass || 'fas fa-rocket'}"></i>
                        <span class="app-name">${app.name}</span>
                    </div>
                `;
            }
        }
        appsContainer.innerHTML = appsHTML;

        this.element.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

    }

    _organizeAppsByCategory() {
        const categories = {
            'Home': [],
            'Games': [],
            'Internet': [],
            'Office': [],
            'System Tools': [],
            'Utilities': []
        };

        for (const app of Object.values(this.webOS.apps)) {
            if (['minesweeper', 'chess', 'doom'].includes(app.id)) {
                categories['Games'].push(app);
            } else if (['browser'].includes(app.id)) {
                categories['Internet'].push(app);
            } else if (['notepad', 'files', 'codeeditor'].includes(app.id)) {
                categories['Office'].push(app);
            } else if (['settings'].includes(app.id)) {
                categories['System Tools'].push(app);
            } else if (['calculator', 'terminal'].includes(app.id)) {
                categories['Utilities'].push(app);
            } else {
                if (!categories['Utilities']) categories['Utilities'] = [];
                categories['Utilities'].push(app);
            }
        }
        return categories;
    }

    _handleGlobalClick(event) {
        if (this.isOpen &&
            this.element &&
            !this.element.contains(event.target) &&
            event.target.id !== 'start-button' &&
            !event.target.closest('#start-button')) {
            this.hide();
        }
    }

    toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    show() {
        if (this.isOpen || !this.element) return;
        this.activeCategory = 'Home';
        this.updateContent();
         this.element.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === 'Home');
        });

        this.element.classList.remove('hidden');
        this.webOS.taskbar.element.querySelector('#start-button').classList.add('active');
        this.isOpen = true;
        document.addEventListener('click', this.boundClickHandler, true);
    }

    hide() {
        if (!this.isOpen || !this.element) return;
        this.element.classList.add('hidden');
        this.webOS.taskbar.element.querySelector('#start-button').classList.remove('active');
        this.isOpen = false;
        document.removeEventListener('click', this.boundClickHandler, true);
        this.element.querySelector('.search-input').value = '';
    }

    destroy() {
        document.removeEventListener('click', this.boundClickHandler, true);
    }
}
