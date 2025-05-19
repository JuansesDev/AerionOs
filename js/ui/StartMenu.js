// Clase StartMenu: Implementa el menú de inicio del sistema operativo
export class StartMenu {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.isOpen = false;
        this.activeCategory = 'Home'; // Categoría inicial activa

        this.updateContent();
        this._attachEventListeners();

        this.boundClickHandler = (event) => this._handleGlobalClick(event);
    }

    // Crea el DOM del menú de inicio
    _createDOM() {
        const menuEl = document.createElement('div');
        menuEl.id = 'start-menu';
        menuEl.classList.add('hidden');

        // Estructura base del menú
        menuEl.innerHTML = `
            <div class="start-menu-content">
                <div class="start-menu-categories">
                    <!-- Categorías se llenarán con updateContent -->
                </div>
                <div class="start-menu-apps">
                    <!-- Apps se llenarán con updateContent/_filterAppsByCategory -->
                </div>
            </div>
            <div class="start-menu-footer">
                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" placeholder="Buscar aplicaciones..." class="search-input" spellcheck="false">
                </div>
                <div class="menu-actions">
                    <button class="user-button" title="Usuario (Próximamente)">
                        <i class="fas fa-user"></i>
                    </button>
                    <button class="settings-button" title="Configuración">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="power-button" title="Cerrar Sesión">
                        <i class="fas fa-power-off"></i>
                    </button>
                </div>
            </div>
        `;
        this.element = menuEl; // Asignar this.element aquí
        return menuEl;
    }

    // Adjunta los eventos necesarios para la interacción con el menú
    _attachEventListeners() {
        if (!this.element) return;

        const searchInput = this.element.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => {
            this._filterAppsByName(e.target.value.toLowerCase());
        });
        // Permitir limpiar búsqueda con Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this._filterAppsByName(''); // Esto debería volver a la categoría activa
            }
        });


        this.element.querySelector('.power-button').addEventListener('click', () => {
            if (confirm("¿Seguro que quieres cerrar sesión?")) {
                this.webOS.userSession.logout();
                this.hide();
            }
        });

        this.element.querySelector('.settings-button').addEventListener('click', () => {
            this.webOS.launchApp('settings'); // 'settings' es un appId válido
            this.hide();
        });

        const userButton = this.element.querySelector('.user-button');
        if (userButton) {
            userButton.addEventListener('click', () => {
                alert(`Usuario: ${this.webOS.userSession.getCurrentUsername()}\n(Funcionalidad de perfil de usuario próximamente)`);
                this.hide();
            });
        }


        this.element.querySelector('.start-menu-apps').addEventListener('click', (e) => {
            const appItem = e.target.closest('.app-item'); // Buscar el .app-item más cercano
            if (appItem) {
                const appId = appItem.dataset.appId;
                const actionType = appItem.dataset.actionType;
                const path = appItem.dataset.path;

                if (actionType === 'open-path' && path) {
                    console.log(`StartMenu: Acción open-path para: ${path}`);
                    this.webOS.launchApp('files', { path: path }); // Lanza 'files' con la opción de path
                    this.hide();
                } else if (appId) {
                    console.log(`StartMenu: Lanzando app: ${appId}`);
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

            this.element.querySelector('.search-input').value = ''; // Limpiar búsqueda al cambiar categoría
            this._filterAppsByCategory(category);
        });
    }

    // Actualiza el contenido del menú de inicio
    updateContent() {
        if (!this.element) {
            console.error("StartMenu.updateContent: this.element no está definido.");
            return;
        }

        this.appCategories = this._organizeAppsByCategory();
        this.allRegisteredApps = Object.values(this.webOS.apps); // Solo las apps registradas

        let categoriesHTML = '';
        const mainCategories = {
            'Home': 'fas fa-home', // Añadir "Home" como una categoría especial
            // 'Processor OS': 'fas fa-microchip', // Podrías quitar esta si no tienes apps específicas
            'Games': 'fas fa-gamepad', // Añadimos la categoría de Juegos
            // 'Graphics': 'fas fa-image',
            'Internet': 'fas fa-globe',
            'Office': 'fas fa-file-alt',
            // 'Sound Video': 'fas fa-volume-up',
            'System Tools': 'fas fa-tools',
            'Utilities': 'fas fa-wrench'
        };

        for (const [category, icon] of Object.entries(mainCategories)) {
            // Mostrar categoría si es "Home", "System Tools" o si tiene apps
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
        this._filterAppsByCategory(this.activeCategory || 'Home'); // Mostrar la categoría activa o Home por defecto
    }

    // Filtra las aplicaciones según la categoría seleccionada
    _filterAppsByCategory(category) {
        if (!this.element) return;
        const appsContainer = this.element.querySelector('.start-menu-apps');
        let appsHTML = '';

        if (category === 'Home') {
            // Estos son accesos directos a rutas o apps específicas
            const systemItems = [
                // { id: 'home', icon: 'fas fa-home', name: 'Home', actionType: 'open-path', path: '/' }, // Redundante si Home es una categoría
                { id: 'desktop-folder', icon: 'fas fa-desktop', name: 'Escritorio', actionType: 'open-path', path: '/Desktop' },
                { id: 'documents-folder', icon: 'fas fa-folder-open', name: 'Documentos', actionType: 'open-path', path: '/Documents' },
                { id: 'downloads-folder', icon: 'fas fa-download', name: 'Descargas', actionType: 'open-path', path: '/Downloads' },
                { id: 'music-folder', icon: 'fas fa-music', name: 'Música', actionType: 'open-path', path: '/Music' },
                { id: 'pictures-folder', icon: 'fas fa-image', name: 'Imágenes', actionType: 'open-path', path: '/Pictures' },
                { id: 'videos-folder', icon: 'fas fa-video', name: 'Videos', actionType: 'open-path', path: '/Videos' },
                // { id: 'software', icon: 'fas fa-cube', name: 'Software', appIdToLaunch: 'app-store' }, // Ejemplo si tuvieras un App Store
                { id: 'settings-app', icon: 'fas fa-cog', name: 'Ajustes', appIdToLaunch: 'settings' } // Esto es una app
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
                appsHTML = '<div class="no-apps">No hay aplicaciones en esta categoría.</div>';
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

    // Filtra las aplicaciones por nombre durante la búsqueda
    _filterAppsByName(searchTerm) { // Renombrado para claridad
        if (!this.element) return;
        const appsContainer = this.element.querySelector('.start-menu-apps');

        if (!searchTerm) {
            this._filterAppsByCategory(this.activeCategory || 'Home');
            return;
        }

        const matchingApps = this.allRegisteredApps.filter(app => // Usar allRegisteredApps
            app.name.toLowerCase().includes(searchTerm)
        ).sort((a,b) => a.name.localeCompare(b.name));

        let appsHTML = '';
        if (matchingApps.length === 0) {
            appsHTML = '<div class="no-apps">No se encontraron aplicaciones.</div>';
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

        // Desactivar categoría activa visualmente cuando se busca
        this.element.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

    }

    // Organiza las aplicaciones en diferentes categorías
    _organizeAppsByCategory() {
        // Definir categorías y qué apps van en ellas
        const categories = {
            'Home': [], // 'Home' se maneja especialmente en _filterAppsByCategory
            'Games': [], // Añadimos la categoría Games/Juegos
            'Internet': [],
            'Office': [],
            'System Tools': [],
            'Utilities': []
            // Añade más categorías según necesites
        };

        for (const app of Object.values(this.webOS.apps)) {
            // Lógica para asignar app a una categoría
            // Esto es un ejemplo, ajústalo a tus necesidades
            if (['minesweeper', 'chess'].includes(app.id)) {
                categories['Games'].push(app);
            } else if (['browser'].includes(app.id)) {
                categories['Internet'].push(app);
            } else if (['notepad', 'files', 'codeeditor'].includes(app.id)) {
                categories['Office'].push(app);
            } else if (['settings'].includes(app.id)) { // 'files' podría ir aquí también si lo consideras herramienta de sistema
                categories['System Tools'].push(app);
            } else if (['calculator', 'terminal'].includes(app.id)) {
                categories['Utilities'].push(app);
            } else {
                // Si no encaja, poner en 'Utilities' o una categoría 'Otros'
                if (!categories['Utilities']) categories['Utilities'] = [];
                categories['Utilities'].push(app);
            }
        }
        return categories;
    }

    // Maneja los clics fuera del menú para cerrarlo
    _handleGlobalClick(event) {
        if (this.isOpen &&
            this.element && // Asegurarse de que el elemento existe
            !this.element.contains(event.target) &&
            event.target.id !== 'start-button' &&
            !event.target.closest('#start-button')) {
            this.hide();
        }
    }

    // Alterna el estado del menú (abierto/cerrado)
    toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    // Muestra el menú de inicio
    show() {
        if (this.isOpen || !this.element) return;
        this.activeCategory = 'Home'; // Siempre mostrar 'Home' al abrir
        this.updateContent(); // Actualizar categorías y mostrar 'Home'
        // Marcar "Home" como activo en el sidebar de categorías
         this.element.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === 'Home');
        });

        this.element.classList.remove('hidden');
        this.webOS.taskbar.element.querySelector('#start-button').classList.add('active');
        this.isOpen = true;
        document.addEventListener('click', this.boundClickHandler, true);
    }

    // Oculta el menú de inicio
    hide() {
        if (!this.isOpen || !this.element) return;
        this.element.classList.add('hidden');
        this.webOS.taskbar.element.querySelector('#start-button').classList.remove('active');
        this.isOpen = false;
        document.removeEventListener('click', this.boundClickHandler, true);
        this.element.querySelector('.search-input').value = ''; // Limpiar búsqueda al cerrar
    }

    // Limpia los recursos al destruir
    destroy() {
        document.removeEventListener('click', this.boundClickHandler, true);
    }
}