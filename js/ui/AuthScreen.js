export class AuthScreen {
    constructor(containerElement, userSession, defaultUsername) {
        this.container = containerElement;
        this.userSession = userSession;
        this.defaultUsername = defaultUsername;
        this.element = null;
    }

    _createDOM() {
        const screen = document.createElement('div');
        screen.className = 'auth-screen';
        screen.innerHTML = `
            <div class="auth-card">
                <div class="auth-avatar"><i class="fas fa-user-circle"></i></div>
                <h2 class="auth-username">${this.defaultUsername}</h2>
                <p class="auth-hint">No password required</p>
                <button id="auth-login-button"><i class="fas fa-arrow-right"></i> Log In</button>
            </div>
        `;
        screen.querySelector('#auth-login-button').addEventListener('click', () => this._login());
        return screen;
    }

    _login() {
        this.userSession.login(this.defaultUsername);
    }

    show() {
        this.container.innerHTML = '';
        this.element = this._createDOM();
        this.container.appendChild(this.element);
        const button = this.element.querySelector('#auth-login-button');
        if (button) button.focus();
    }

    hide() {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
        this.element = null;
    }
}
