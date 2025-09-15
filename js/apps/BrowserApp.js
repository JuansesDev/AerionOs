import { App } from '../core/App.js';

/**
 * BrowserApp v2.0 (El Interceptor Paranoico EXPERIMENTAL)
 * * Implementa un navegador web básico dentro de una ventana de la aplicación.
 * * Novedades:
 * - El script interceptor ahora también captura el evento 'keydown' (tecla Enter)
 * para evitar bypass de navegación en sitios complejos como Google.
 * - Lógica de intercepción unificada y más robusta.
 */
export class BrowserApp extends App {
    constructor(webOS) {
        super('browser', 'Navegador Web', 'fas fa-globe-americas', webOS, {
            window: { width: 800, height: 600, customClass: 'browser-app' }
        });

        this.iframe = null;
        this.addressBar = null;
        this.backButton = null;
        this.forwardButton = null;
        this.proxyButton = null;
        this.iframeMessage = null;
        this.errorDetails = null;
        this.messageTitle = null;
        this.window = null;
        this.iframeHistory = [];
        this.iframeHistoryIndex = -1;
        this.proxyEnabled = true;
        this.currentOriginalUrl = null;
        this.proxyServices = [
            (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];
        this.messageHandler = this._handleIframeMessage.bind(this);
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        contentElement.innerHTML = `
            <div class="browser-toolbar">
                <button data-action="back" title="Atrás" disabled><i class="fas fa-arrow-left"></i></button>
                <button data-action="forward" title="Adelante" disabled><i class="fas fa-arrow-right"></i></button>
                <button data-action="reload" title="Recargar"><i class="fas fa-sync-alt"></i></button>
                <input type="text" class="browser-address-bar" placeholder="Escribe una URL">
                <button data-action="go" title="Ir"><i class="fas fa-arrow-right"></i></button>
                <button data-action="proxy" title="Alternar Proxy" class="active"><i class="fas fa-shield-alt"></i></button>
            </div>
            <div class="browser-iframe-container">
                <iframe sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-same-origin"
                        allow="encrypted-media; geolocation; microphone; camera; fullscreen"
                        referrerpolicy="no-referrer"></iframe>
                <div class="iframe-message" style="display:none;">
                    <i class="fas fa-exclamation-circle"></i>
                    <span class="message-title">Error al cargar la página</span>
                    <p class="error-details"></p>
                    <a href="#" class="try-alternative">Probar un sitio alternativo compatible</a>
                </div>
            </div>
        `;
        
        this.iframe = contentElement.querySelector('iframe');
        this.addressBar = contentElement.querySelector('.browser-address-bar');
        this.iframeMessage = contentElement.querySelector('.iframe-message');
        this.errorDetails = this.iframeMessage.querySelector('.error-details');
        this.messageTitle = this.iframeMessage.querySelector('.message-title');
        this.backButton = contentElement.querySelector('[data-action="back"]');
        this.forwardButton = contentElement.querySelector('[data-action="forward"]');
        this.proxyButton = contentElement.querySelector('[data-action="proxy"]');
        this.updateProxyButtonState();
        this.window = windowInstance;

        contentElement.querySelector('.browser-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.action) this._handleToolbarAction(button.dataset.action);
        });
        this.addressBar.addEventListener('keypress', (e) => { if (e.key === 'Enter') this._loadUrl(this.addressBar.value); });
        contentElement.querySelector('.try-alternative').addEventListener('click', (e) => { e.preventDefault(); this._loadAlternativeSite(); });
        this.iframe.addEventListener('load', () => this._onIframeContentLoaded());
        window.addEventListener('message', this.messageHandler);

        const initialUrl = launchOptions?.url || 'https://www.google.com';
        this._loadUrl(initialUrl);
    }
    
    _handleIframeMessage(event) {
        if (event.source !== this.iframe.contentWindow) return;
        const data = event.data;
        if (data.type === 'navigate') {
            console.log('Navegación interceptada desde el iframe a:', data.url);
            this._loadUrl(data.url);
        }
    }

    _processHtml(html, baseUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(tag => tag.remove());
        
        const existingBase = doc.querySelector('base');
        if (existingBase) existingBase.remove();
        const base = doc.createElement('base');
        base.href = baseUrl;
        doc.head.prepend(base);

        const interceptorScript = doc.createElement('script');
        interceptorScript.textContent = `
            try {
                console.log('Interceptor script v5.0 loaded.');

                const navigate = (url) => {
                    if (url && !url.startsWith('javascript:')) {
                        console.log('Interceptor: Navigating to', url);
                        window.parent.postMessage({ type: 'navigate', url }, '*');
                    }
                };

                const handleSubmit = (form) => {
                    if (!form) return;
                    console.log('Interceptor: Handling form submission.');
                    const formData = new URLSearchParams(new FormData(form));
                    const targetUrl = new URL(form.action);
                    if (form.method.toLowerCase() === 'get') {
                        targetUrl.search = formData.toString();
                        navigate(targetUrl.href);
                    } else {
                        console.warn('POST forms not supported.');
                    }
                };

                // Interceptor para clics
                document.addEventListener('click', (e) => {
                    const anchor = e.target.closest('a');
                    if (anchor && anchor.href) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        navigate(anchor.href);
                    }
                }, true);

                // Interceptor para envíos de formulario
                document.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    handleSubmit(e.target);
                }, true);
                
                // Interceptor para la tecla "Enter"
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const form = e.target.closest('form');
                        if (form) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            handleSubmit(form);
                        }
                    }
                }, true);

            } catch (err) {
                console.error("Interceptor script failed:", err);
            }
        `;
        doc.body.appendChild(interceptorScript);
        return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    }

    async _loadUrl(url, fromHistory = false) {
        if (!url || !url.trim()) return;
        let fullUrl = url.trim();
        if (!fullUrl.match(/^[a-zA-Z]+:\/\//) && !fullUrl.startsWith('about:')) { fullUrl = 'https://' + fullUrl; }

        this.currentOriginalUrl = fullUrl;
        this.addressBar.value = this.currentOriginalUrl;
        this.window.setTitle(`Navegador Web - Cargando...`);

        if (!fromHistory) { this._updateHistory(fullUrl); }
        if (!this.proxyEnabled) { this.iframe.src = this.currentOriginalUrl; return; }
        
        const errors = [];
        const FETCH_TIMEOUT = 10000; // 10 segundos de timeout por proxy

        for (let i = 0; i < this.proxyServices.length; i++) {
            const proxyFn = this.proxyServices[i];
            const proxiedUrl = proxyFn(this.currentOriginalUrl);
            this._showIframeLoadingScreen(`Cargando vía Proxy ${i + 1}/${this.proxyServices.length}...`, this.currentOriginalUrl);

            try {
                // Controlador de timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

                const response = await fetch(proxiedUrl, { signal: controller.signal });
                
                // Limpiar el timeout si la petición finaliza a tiempo
                clearTimeout(timeoutId);

                if (!response.ok) { throw new Error(`Proxy error: ${response.status} ${response.statusText}`); }
                const html = await response.text();
                if (!html) { throw new Error("Proxy returned empty response."); }
                const processedHtml = this._processHtml(html, this.currentOriginalUrl);
                this.iframe.srcdoc = processedHtml;
                return;
            } catch (error) {
                const errorMessage = error.name === 'AbortError' ? 'Timeout (10s)' : error.message;
                console.warn(`Proxy attempt ${i + 1} failed:`, errorMessage);
                errors.push(errorMessage);
            }
        }

        console.error("All proxies failed.", errors);
        const finalErrorDetails = errors.some(e => e.includes('Failed to fetch'))
            ? "El sitio no parece existir o hay un problema de red. Verifica la URL y tu conexión."
            : "El sitio podría estar caído, no responder a tiempo o bloquear activamente los proxies.";
        this._showIframeError("No se pudo cargar la página", finalErrorDetails);
    }
    
    _onIframeContentLoaded() { 
        if (this.iframe.style.display === 'none') {
            this._showIframeContent();
            this.window.setTitle(`Navegador Web - ${this.currentOriginalUrl}`);
        }
    }

    _handleToolbarAction(action) { 
        switch(action) {
            case 'back': this._historyBack(); break;
            case 'forward': this._historyForward(); break;
            case 'reload': if(this.currentOriginalUrl) this._loadUrl(this.currentOriginalUrl, true); break;
            case 'go': this._loadUrl(this.addressBar.value); break;
            case 'proxy':
                this.proxyEnabled = !this.proxyEnabled;
                this.updateProxyButtonState();
                if (this.currentOriginalUrl) this._loadUrl(this.currentOriginalUrl, true);
                break;
        }
    }
    
    _updateHistory(url) {
        if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
            this.iframeHistory = this.iframeHistory.slice(0, this.iframeHistoryIndex + 1);
        }
        this.iframeHistory.push(url);
        this.iframeHistoryIndex = this.iframeHistory.length - 1;
        this._updateNavButtons();
    }

    _historyBack() { 
        if (this.iframeHistoryIndex > 0) {
            this.iframeHistoryIndex--;
            this._loadUrl(this.iframeHistory[this.iframeHistoryIndex], true);
        }
    }

    _historyForward() {
        if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
            this.iframeHistoryIndex++;
            this._loadUrl(this.iframeHistory[this.iframeHistoryIndex], true);
        }
    }

    updateProxyButtonState() {
        this.proxyButton.classList.toggle('active', this.proxyEnabled);
        this.proxyButton.title = this.proxyEnabled ? 'Proxy activado (recomendado)' : 'Proxy desactivado (puede fallar)';
    }

    _showIframeContent() {
        this.iframe.style.display = 'block';
        this.iframeMessage.style.display = 'none';
    }

    _showIframeError(title, details = "") {
        this.iframe.style.display = 'none';
        this.iframe.srcdoc = '';
        this.messageTitle.textContent = title;
        this.errorDetails.textContent = details;
        this.iframeMessage.style.display = 'flex';
        this.iframeMessage.querySelector('.try-alternative').style.display = 'block';
    }

    _showIframeLoadingScreen(title, details = "") {
        this.iframe.style.display = 'none';
        this.messageTitle.textContent = title;
        this.errorDetails.textContent = details;
        this.iframeMessage.style.display = 'flex';
        this.iframeMessage.querySelector('.try-alternative').style.display = 'none';
    }

    _updateNavButtons() {
        this.backButton.disabled = this.iframeHistoryIndex <= 0;
        this.forwardButton.disabled = this.iframeHistoryIndex >= this.iframeHistory.length - 1;
    }

    _loadAlternativeSite() {
        const sites = ['https://www.wikipedia.org/', 'https://httpbin.org/html', 'https://html5test.com/'];
        this._loadUrl(sites[Math.floor(Math.random() * sites.length)]);
    }

    destroy() {
        window.removeEventListener('message', this.messageHandler);
    }
}