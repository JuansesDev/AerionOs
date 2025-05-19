// Clase BrowserApp: Implementa un navegador web básico con vista previa en iframe
import { App } from '../core/App.js';

export class BrowserApp extends App {
    constructor(webOS) {
        super('browser', 'Navegador Web', 'fas fa-globe-americas', webOS, {
            window: { width: 800, height: 600, customClass: 'browser-app' }
        });
        this.iframe = null;
        this.addressBar = null;
        this.backButton = null;
        this.forwardButton = null;
        this.iframeHistory = [];
        this.iframeHistoryIndex = -1;
        this.window = null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        // Configuración de la interfaz del navegador
        // Componentes:
        // - Barra de navegación con botones y campo de dirección
        // - Contenedor del iframe para visualizar páginas web
        // - Panel de mensajes para errores de carga

        contentElement.innerHTML = `
            <div class="browser-toolbar">
                <!-- Botones de navegación y barra de direcciones -->
            </div>
            <div class="browser-iframe-container">
                <iframe sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-scripts"
                        allow="encrypted-media; geolocation; microphone; camera"></iframe>
                <div class="iframe-message" style="display:none;">
                    <!-- Mensajes de error -->
                </div>
            </div>
        `;

        this.iframe = contentElement.querySelector('iframe');
        this.addressBar = contentElement.querySelector('.browser-address-bar');
        this.iframeMessage = contentElement.querySelector('.iframe-message');

        this.backButton = contentElement.querySelector('[data-action="back"]');
        this.forwardButton = contentElement.querySelector('[data-action="forward"]');

        contentElement.querySelector('.browser-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.action) this._handleToolbarAction(button.dataset.action);
        });
        this.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._loadUrl(this.addressBar.value);
        });

        // Agregar evento al enlace de sitios alternativos
        contentElement.querySelector('.try-alternative').addEventListener('click', (e) => {
            e.preventDefault();
            this._loadAlternativeSite();
        });

        this.iframe.addEventListener('load', () => this._onIframeLoadAttempt());

        // Cargar una página inicial que funcione en iframe
        const initialUrl = launchOptions?.url || 'https://html5test.com';
        this._loadUrl(initialUrl);
        this.window.setTitle(`Navegador Web - Cargando...`);
    }

    _handleToolbarAction(action) {
        switch(action) {
            case 'back': this._historyBack(); break;
            case 'forward': this._historyForward(); break;
            case 'reload':
                if(this.iframe.src && this.iframe.src !== 'about:blank') {
                    this._showIframeLoading();
                    this.iframe.src = this.iframe.src;
                }
                break;
            case 'go': this._loadUrl(this.addressBar.value); break;
        }
    }

    _loadUrl(url) {
        if (!url.trim()) return;
        let fullUrl = url.trim();
        if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://') && !fullUrl.startsWith('about:')) {
            fullUrl = 'https://' + fullUrl;
        }
        this.addressBar.value = fullUrl;
        this.iframe.src = 'about:blank'; // Clear previous content to show loading state
        this._showIframeLoading();

        // Use a small delay before setting the actual src to allow "loading" state to render
        setTimeout(() => {
            this.iframe.src = fullUrl;
        }, 50);

        // Add to history only if it's a new navigation, not back/forward and not same as current
        if (this.iframeHistoryIndex < 0 || this.iframeHistory[this.iframeHistoryIndex] !== fullUrl) {
            if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
                this.iframeHistory = this.iframeHistory.slice(0, this.iframeHistoryIndex + 1);
            }
            this.iframeHistory.push(fullUrl);
            this.iframeHistoryIndex = this.iframeHistory.length - 1;
        }
        this._updateNavButtons();

        if (this.window) {
            this.window.setTitle(`Navegador Web - ${fullUrl.length > 30 ? fullUrl.substring(0,27)+'...' : fullUrl}`);
        }
    }

    _historyBack() {
        if (this.iframeHistoryIndex > 0) {
            this.iframeHistoryIndex--;
            const url = this.iframeHistory[this.iframeHistoryIndex];
            this.addressBar.value = url;
            this.iframe.src = 'about:blank';
            this._showIframeLoading();
            setTimeout(() => { this.iframe.src = url; }, 50);
            this._updateNavButtons();

            if (this.window) {
                this.window.setTitle(`Navegador Web - ${url.length > 30 ? url.substring(0,27)+'...' : url}`);
            }
        }
    }

    _historyForward() {
        if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
            this.iframeHistoryIndex++;
            const url = this.iframeHistory[this.iframeHistoryIndex];
            this.addressBar.value = url;
            this.iframe.src = 'about:blank';
            this._showIframeLoading();
            setTimeout(() => { this.iframe.src = url; }, 50);
            this._updateNavButtons();

            if (this.window) {
                this.window.setTitle(`Navegador Web - ${url.length > 30 ? url.substring(0,27)+'...' : url}`);
            }
        }
    }

    _onIframeLoadAttempt() {
        const currentSrc = this.iframe.src;
        if (currentSrc === 'about:blank') {
            this._showIframeLoading(false);
            return;
        }

        try {
            // Verificamos si podemos acceder básicamente al iframe
            // NOTA: No intentamos acceder a serviceWorker u otras propiedades protegidas
            if (this.iframe.contentWindow) {
                // No intentamos acceder a document.domain directamente para evitar errores de seguridad
                this._showIframeContent();
                this.addressBar.value = currentSrc;
                if (this.window) {
                    // Usamos solo la URL como título para evitar errores al intentar acceder al título del documento
                    const displayUrl = currentSrc.length > 30 ? currentSrc.substring(0,27)+'...' : currentSrc;
                    this.window.setTitle(`Navegador Web - ${displayUrl}`);
                }
            } else {
                this._showIframeError("No se pudo cargar la página.");
                if (this.window) {
                    this.window.setTitle(`Navegador Web - Error`);
                }
            }
        } catch (e) {
            console.log("Error al acceder al iframe:", e);
            this._showIframeError("El sitio no permite ser mostrado en un iframe (X-Frame-Options)");
            if (this.window) {
                this.window.setTitle(`Navegador Web - Contenido Bloqueado`);
            }
        }
        this._updateNavButtons();
    }

    _showIframeContent() {
        this.iframe.style.display = 'block';
        this.iframeMessage.style.display = 'none';
    }

    _showIframeError(message) {
        this.iframe.style.display = 'none';
        this.iframeMessage.querySelector('span').textContent = message;
        this.iframeMessage.style.display = 'flex';
        this.iframeMessage.querySelector('.try-alternative').style.display = 'block';
    }

    _showIframeLoading(showErrorIfBlank = true) {
        if (this.iframe.src === 'about:blank' && !showErrorIfBlank) {
            this.iframe.style.display = 'block';
            this.iframeMessage.style.display = 'none';
        } else if (this.iframe.src === 'about:blank' && showErrorIfBlank) {
            this._showIframeError("Cargando...");
        } else {
            this.iframe.style.display = 'block';
            this.iframeMessage.style.display = 'none';
        }
    }

    _updateNavButtons() {
        this.backButton.disabled = this.iframeHistoryIndex <= 0;
        this.forwardButton.disabled = this.iframeHistoryIndex >= this.iframeHistory.length - 1;
    }

    _loadAlternativeSite() {
        // Lista de sitios que generalmente funcionan bien en iframes
        const alternativeSites = [
            'https://html5test.com',
            'https://httpbin.org/html',
            'https://playground.tensorflow.org',
            'https://codepen.io/pen/',
            'https://jsbin.com/'
        ];

        // Elegir un sitio aleatorio de la lista
        const randomIndex = Math.floor(Math.random() * alternativeSites.length);
        this._loadUrl(alternativeSites[randomIndex]);
    }
}