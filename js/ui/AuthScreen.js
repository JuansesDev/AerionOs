// Clase AuthScreen: Gestiona la pantalla de autenticación del sistema
export class AuthScreen {
    constructor(containerElement, userSession) {
        this.container = containerElement;
        this.userSession = userSession;
        this.element = null; // Contendrá el DOM de la pantalla de autenticación
    }

    // Crea el DOM de la pantalla de autenticación
    _createDOM(isRegister = false) {
        const screen = document.createElement('div');
        screen.className = 'auth-screen';
        screen.innerHTML = `
            <h2>${isRegister ? 'Crear Cuenta' : 'Iniciar Sesión en AuraOS'}</h2>
            <div class="form-group">
                <label for="auth-username">Nombre de Usuario:</label>
                <input type="text" id="auth-username" name="username" required autocomplete="username">
            </div>
            <button id="auth-button">${isRegister ? 'Registrarse' : 'Ingresar'}</button>
            <div class="auth-error" id="auth-error-message"></div>
            <p class="auth-switch">
                ${isRegister
                    ? '¿Ya tienes cuenta? <span data-action="login">Inicia sesión</span>'
                    : '¿No tienes cuenta? <span data-action="register">Regístrate</span>'}
            </p>
        `;

        screen.querySelector('#auth-button').addEventListener('click', () => this._handleSubmit(isRegister));
        screen.querySelector('#auth-username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleSubmit(isRegister);
        });

        screen.querySelector('.auth-switch span').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.show(action === 'register'); // Re-render with the new mode
        });
        return screen;
    }

    // Maneja el envío del formulario de autenticación
    _handleSubmit(isRegister) {
        const usernameInput = this.element.querySelector('#auth-username');
        const username = usernameInput.value.trim();
        const errorMessageElement = this.element.querySelector('#auth-error-message');

        if (!username) {
            errorMessageElement.textContent = 'El nombre de usuario es requerido.';
            usernameInput.focus();
            return;
        }
        errorMessageElement.textContent = ''; // Clear previous error

        let result;
        if (isRegister) {
            result = this.userSession.register(username);
            if (!result.success) {
                 errorMessageElement.textContent = result.message;
                 usernameInput.select();
            }
            // Login event will be emitted by UserSession, WebOS will handle it
        } else {
            const success = this.userSession.login(username);
            if (!success) {
                errorMessageElement.textContent = 'Usuario no encontrado o incorrecto.';
                usernameInput.select();
            }
            // Login event will be emitted by UserSession
        }
    }

    // Muestra la pantalla de autenticación
    show(isRegister = false) {
        this.container.innerHTML = ''; // Clear container
        this.element = this._createDOM(isRegister);
        this.container.appendChild(this.element);
        this.element.querySelector('#auth-username').focus();
    }

    // Oculta la pantalla de autenticación
    hide() {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
        this.element = null;
    }
}