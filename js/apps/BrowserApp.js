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
        this.proxyButton = null; // Añadido para referencia
        this.iframeHistory = [];
        this.iframeHistoryIndex = -1;
        this.window = null;
        this.iframeMessage = null;
        this.errorDetails = null; // Añadido para referencia

        this.proxyEnabled = true; // Por defecto usamos proxy
        this.proxyServices = [
            // Proxy personalizado más efectivo (ajustar según tus necesidades)
            (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            // Proxy alternativo que modifica los headers para evitar restricciones
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            // Otro servicio que puede funcionar para sitios más restrictivos
            (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
            // Servicio que elimina los headers de seguridad
            (url) => `https://cors-anywhere-production-d465.up.railway.app/${url}`,
            // Servicio de respaldo
            // (url) => `https://cors-anywhere.herokuapp.com/${url}` // A menudo sobrecargado o requiere demo
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` // Otro proxy alternativo
        ];
        this.currentOriginalUrl = null; // URL que el usuario quiere ver
        this.currentProxyAttemptIndex = 0; // Índice del proxy que se está intentando
        this.retryTimeout = null; // Para manejar reintentos automáticos

        this.safeUrlList = [ // Dominios que generalmente no necesitan proxy
            'html5test.com',
            'playground.tensorflow.org',
            'codepen.io',
            'jsbin.com',
            'jsfiddle.net',
            'codesandbox.io',
            'stackblitz.com',
            'httpbin.org',
            'wikipedia.org',
            'wikimedia.org',
            'github.io',
            'w3.org',
            'developer.mozilla.org'
        ];
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
                    <button class="try-other-proxy" style="display:none;">Probar con otro proxy</button>
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
        this.tryOtherProxyButton = this.iframeMessage.querySelector('.try-other-proxy');

        this.updateProxyButtonState();

        contentElement.querySelector('.browser-toolbar').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.action) this._handleToolbarAction(button.dataset.action);
        });

        this.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._loadUrl(this.addressBar.value);
        });

        contentElement.querySelector('.try-alternative').addEventListener('click', (e) => {
            e.preventDefault();
            this._loadAlternativeSite();
        });

        this.tryOtherProxyButton.addEventListener('click', (e) => {
            e.preventDefault();
            this._tryNextProxyStrategy(true); // Forzar intento manual
        });

        // Escuchar 'load' es crucial, pero también propenso a falsos positivos si se carga 'about:blank'
        this.iframe.addEventListener('load', () => this._onIframeLoadAttempt());
        // El evento 'error' en iframes es menos común para bloqueos XFO, más para errores de red/DNS
        this.iframe.addEventListener('error', (e) => this._handleIframeError("Error de red o DNS al cargar el iframe.", e));

        this.window = windowInstance;
        const initialUrl = launchOptions?.url || 'https://html5test.com';
        this._loadUrl(initialUrl);
    }

    _handleToolbarAction(action) {
        switch(action) {
            case 'back': this._historyBack(); break;
            case 'forward': this._historyForward(); break;
            case 'reload':
                if(this.currentOriginalUrl && this.currentOriginalUrl !== 'about:blank') {
                    // Recargar resetea el intento de proxy
                    this._loadUrl(this.currentOriginalUrl, true /* forceReload */);
                }
                break;
            case 'go': this._loadUrl(this.addressBar.value); break;
            case 'proxy':
                this.proxyEnabled = !this.proxyEnabled;
                this.updateProxyButtonState();
                if (this.currentOriginalUrl) {
                    // Si hay una URL activa, recargar con/sin proxy, reseteando intentos de proxy
                    this._loadUrl(this.currentOriginalUrl, true /* forceReload */);
                }
                break;
        }
    }

    updateProxyButtonState() {
        if (this.proxyEnabled) {
            this.proxyButton.classList.add('active');
            this.proxyButton.setAttribute('title', 'Proxy activado (para eludir restricciones)');
        } else {
            this.proxyButton.classList.remove('active');
            this.proxyButton.setAttribute('title', 'Proxy desactivado (modo directo, puede fallar)');
        }
    }

    _getProxiedUrl(targetUrl, proxyIndex) {
        if (proxyIndex >= this.proxyServices.length) {
            return null; // No más proxies para intentar
        }
        const proxyFn = this.proxyServices[proxyIndex];
        return proxyFn(targetUrl);
    }

    _loadUrl(url, forceReload = false) {
        clearTimeout(this.retryTimeout); // Limpiar reintentos automáticos pendientes
        if (!url || !url.trim()) return;

        let fullUrl = url.trim();
        if (!fullUrl.match(/^[a-zA-Z]+:\/\//) && !fullUrl.startsWith('about:')) {
            fullUrl = 'https://' + fullUrl;
        }

        // Actualizar la URL original que estamos intentando cargar
        // y resetear el índice de intento de proxy
        if (this.currentOriginalUrl !== fullUrl || forceReload) {
            this.currentOriginalUrl = fullUrl;
            this.currentProxyAttemptIndex = 0; // Empezar con el primer proxy para una nueva URL o recarga
        }

        this.addressBar.value = this.currentOriginalUrl; // Siempre mostrar URL original

        let urlToLoad = this.currentOriginalUrl;
        if (this.proxyEnabled && !this._isSafeUrl(this.currentOriginalUrl)) {
            urlToLoad = this._getProxiedUrl(this.currentOriginalUrl, this.currentProxyAttemptIndex);
            if (!urlToLoad) { // Se acabaron los proxies
                this._showIframeError("Todos los proxies fallaron", `No se pudo cargar ${this.currentOriginalUrl} después de intentar con ${this.proxyServices.length} proxies.`);
                this.tryOtherProxyButton.style.display = 'none'; // No hay más que probar
                return;
            }
            console.log(`Intentando cargar ${this.currentOriginalUrl} via proxy ${this.currentProxyAttemptIndex + 1}: ${urlToLoad}`);
        } else {
            console.log(`Cargando ${this.currentOriginalUrl} directamente (proxy desactivado o URL segura)`);
        }

        this._showIframeLoadingScreen("Cargando...", `Accediendo a ${this.currentOriginalUrl.substring(0, 100)}...`);
        this.iframe.src = 'about:blank'; // Importante para forzar un 'load' event

        // Pequeño delay para asegurar que 'about:blank' se procese y el 'loading' se muestre
        setTimeout(() => {
            this.iframe.src = urlToLoad;
        }, 50);


        // Gestión del historial (solo URLs originales)
        if (!forceReload && (this.iframeHistoryIndex < 0 || this.iframeHistory[this.iframeHistoryIndex] !== this.currentOriginalUrl)) {
            if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
                this.iframeHistory = this.iframeHistory.slice(0, this.iframeHistoryIndex + 1);
            }
            this.iframeHistory.push(this.currentOriginalUrl);
            this.iframeHistoryIndex = this.iframeHistory.length - 1;
        }
        this._updateNavButtons();
        this.window.setTitle(`Navegador Web - Cargando ${this.currentOriginalUrl.substring(0,30)}...`);
    }

    _isSafeUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();
            return this.safeUrlList.some(safeDomain =>
                domain === safeDomain || domain.endsWith('.' + safeDomain)
            );
        } catch (e) {
            return false; // URL inválida no es segura
        }
    }

    _tryNextProxyStrategy(manualTrigger = false) {
        clearTimeout(this.retryTimeout);
        if (!this.proxyEnabled || this._isSafeUrl(this.currentOriginalUrl)) {
            if (!manualTrigger) { // Si es manual, el usuario espera algo. Si es auto, y no hay proxy, no reintentar.
                 this._showIframeError("Carga Fallida", `El sitio no se pudo cargar directamente. Intenta activar el proxy.`);
                 this.tryOtherProxyButton.style.display = 'none';
            } else {
                // Si es manual y el proxy está desactivado, sugerir activarlo.
                this._showIframeError("Proxy Desactivado", `El proxy está desactivado. Actívalo para intentar eludir restricciones.`);
                this.tryOtherProxyButton.style.display = this.proxyEnabled && (this.currentProxyAttemptIndex + 1 < this.proxyServices.length) ? 'block' : 'none';
            }
            return;
        }

        this.currentProxyAttemptIndex++;
        if (this.currentProxyAttemptIndex < this.proxyServices.length) {
            const nextProxyMsg = `Intento ${this.currentProxyAttemptIndex + 1}/${this.proxyServices.length} con otro proxy...`;
            this._showIframeLoadingScreen("Reintentando...", nextProxyMsg);
            this.errorDetails.textContent = nextProxyMsg; // Actualizar detalles en el mensaje de error si ya está visible

            // Damos un pequeño respiro antes de reintentar para que el usuario vea el mensaje
            this.retryTimeout = setTimeout(() => {
                this._loadUrl(this.currentOriginalUrl, true /* forceReload para usar nuevo proxy */);
            }, manualTrigger ? 200 : 1500); // Más rápido si es manual
        } else {
            const errorMsg = `No se pudo cargar "${this.currentOriginalUrl.substring(0,50)}..." después de ${this.proxyServices.length} intentos con proxy.`;
            this._showIframeError("Todos los proxies fallaron", errorMsg);
            this.tryOtherProxyButton.style.display = 'none'; // No más proxies
        }
    }

    _historyBack() {
        if (this.iframeHistoryIndex > 0) {
            this.iframeHistoryIndex--;
            // Al ir atrás/adelante, siempre resetear al primer proxy para esa URL del historial
            this.currentProxyAttemptIndex = 0;
            this._loadUrl(this.iframeHistory[this.iframeHistoryIndex]);
        }
    }

    _historyForward() {
        if (this.iframeHistoryIndex < this.iframeHistory.length - 1) {
            this.iframeHistoryIndex++;
            this.currentProxyAttemptIndex = 0;
            this._loadUrl(this.iframeHistory[this.iframeHistoryIndex]);
        }
    }

    _onIframeLoadAttempt() {
        clearTimeout(this.retryTimeout); // Cancelar cualquier reintento automático pendiente
        const iframeSrc = this.iframe.src;

        // Si es about:blank, es probable que sea el estado intermedio antes de cargar la URL real.
        // O podría ser un frame-buster que redirige a about:blank.
        if (iframeSrc === 'about:blank' || !iframeSrc) {
            // Si estábamos esperando una URL real, y obtenemos about:blank, es un problema.
            if (this.currentOriginalUrl && this.currentOriginalUrl !== 'about:blank') {
                // Podría ser un frame buster o que el proxy devolvió una página vacía.
                // Esperar un poco para ver si se redirige.
                this.retryTimeout = setTimeout(() => {
                    // Si después de un tiempo sigue en about:blank, considerar un fallo.
                    if (this.iframe.src === 'about:blank') {
                        console.warn(`_onIframeLoadAttempt: Iframe cargó 'about:blank' inesperadamente para ${this.currentOriginalUrl}.`);
                        this._handleIframeError("La página está en blanco o fue bloqueada.", "El contenido no pudo ser mostrado. Podría estar bloqueado o el proxy falló.");
                        this._tryNextProxyStrategy();
                    }
                }, 750); // Tiempo de espera para ver si es una redirección genuina
            } else {
                // Es un about:blank intencional (limpieza) o inicial.
                this._showIframeContent(); // Simplemente mostrarlo (estará vacío)
            }
            return;
        }

        // Intentar acceder a contentWindow.location.href puede lanzar SecurityError
        // si el contenido es de un origen diferente Y el sitio tiene X-Frame-Options.
        // ¡Esta es la detección principal del bloqueo!
        try {
            if (this.iframe.contentWindow && this.iframe.contentWindow.document.readyState === 'complete' && this.iframe.contentWindow.location.href !== 'about:blank') {
                 // ¡Éxito! La página cargó y es accesible (al menos superficialmente).
                this._showIframeContent();
                this.addressBar.value = this.currentOriginalUrl; // Asegurar que la URL original está en la barra
                this.window.setTitle(`Navegador Web - ${this.currentOriginalUrl.length > 30 ? this.currentOriginalUrl.substring(0,27)+'...' : this.currentOriginalUrl}`);
                // Resetear el contador de intentos de proxy para esta URL si carga bien
                // this.currentProxyAttemptIndex = 0; // No, porque si el usuario navega dentro del iframe, no queremos resetear. Se resetea al cargar nueva URL.
            } else {
                // contentWindow existe pero location.href es about:blank o readyState no es complete.
                // Esto puede pasar si el proxy devuelve una página vacía o un error sin cabeceras XFO.
                console.warn(`_onIframeLoadAttempt: Iframe cargó pero contentWindow.location es 'about:blank' o no está 'complete' para ${iframeSrc}`);
                this._handleIframeError("Contenido no disponible", `El proxy pudo haber devuelto una página vacía o con errores para ${this.currentOriginalUrl}.`);
                this._tryNextProxyStrategy();
            }
        } catch (e) {
            if (e.name === 'SecurityError') {
                // ¡Este es el caso más común de bloqueo por X-Frame-Options o CSP frame-ancestors!
                console.warn(`SecurityError al acceder a iframe para ${this.currentOriginalUrl} (proxy: ${this.currentProxyAttemptIndex}). Probablemente X-Frame-Options.`, e);
                this._handleIframeError(
                    "Sitio bloqueado en iframe",
                    `El sitio "${this.currentOriginalUrl.substring(0,50)}..." previene ser mostrado en iframes. Proxy actual: ${this.currentProxyAttemptIndex + 1}/${this.proxyServices.length}.`
                );
                this._tryNextProxyStrategy(); // Intentar con el siguiente proxy
            } else {
                // Otro tipo de error
                console.error("Error inesperado al verificar carga de iframe:", e);
                this._handleIframeError("Error al verificar contenido", e.message);
                this._tryNextProxyStrategy(); // Intentar con el siguiente proxy como último recurso
            }
        }
        this._updateNavButtons();
    }

    _handleIframeError(message, details = "") {
        console.error("Error en iframe:", message, details);
        this._showIframeError(message, details);
        this.window.setTitle(`Navegador Web - Error`);
    }

    _showIframeContent() {
        this.iframe.style.display = 'block';
        this.iframeMessage.style.display = 'none';
    }

    _showIframeError(title, details = "") {
        this.iframe.style.display = 'none';
        this.messageTitle.textContent = title;
        this.errorDetails.textContent = details;
        this.iframeMessage.style.display = 'flex';

        // Mostrar botón de reintento de proxy si hay más proxies y el proxy está habilitado
        const canRetryProxy = this.proxyEnabled &&
                              !this._isSafeUrl(this.currentOriginalUrl) &&
                              this.currentProxyAttemptIndex < this.proxyServices.length -1; // OJO: -1 porque el actual ya falló

        this.tryOtherProxyButton.style.display = canRetryProxy ? 'block' : 'none';
        this.iframeMessage.querySelector('.try-alternative').style.display = 'block';
    }

    _showIframeLoadingScreen(title, details = "") {
        this.iframe.style.display = 'none'; // Ocultar iframe mientras carga
        this.messageTitle.textContent = title;
        this.errorDetails.textContent = details;
        this.iframeMessage.style.display = 'flex';
        this.tryOtherProxyButton.style.display = 'none';
        this.iframeMessage.querySelector('.try-alternative').style.display = 'none'; // Ocultar alternativas durante la carga
    }

    _updateNavButtons() {
        this.backButton.disabled = this.iframeHistoryIndex <= 0;
        this.forwardButton.disabled = this.iframeHistoryIndex >= this.iframeHistory.length - 1;
    }

    _loadAlternativeSite() {
        const alternativeSites = [
            'https://html5test.com/', // Funciona bien
            'https://www.wikipedia.org/', // Funciona bien
            'https://httpbin.org/html', // Para probar HTML simple
            'https://developer.mozilla.org/en-US/docs/Web/HTML', // MDN suele permitir iframes
            // Añadir otros sitios que sepas que funcionan bien
        ];
        const randomIndex = Math.floor(Math.random() * alternativeSites.length);
        this._loadUrl(alternativeSites[randomIndex]);
    }
}