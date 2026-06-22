export class AuthScreen {
    constructor(containerElement, userSession) {
        this.container = containerElement;
        this.userSession = userSession;
        this.element = null;
    }

    _createDOM(isRegister = false) {
        const screen = document.createElement('div');
        screen.className = 'auth-screen';
        screen.innerHTML = `
            <h2>${isRegister ? 'Create Account' : 'Sign In to AerionOs'}</h2>
            <div class="form-group">
                <label for="auth-username">Username:</label>
                <input type="text" id="auth-username" name="username" required autocomplete="username">
            </div>
            <button id="auth-button">${isRegister ? 'Register' : 'Sign In'}</button>
            <div class="auth-error" id="auth-error-message"></div>
            <p class="auth-switch">
                ${isRegister
                    ? 'Already have an account? <span data-action="login">Sign in</span>'
                    : "Don't have an account? <span data-action=\"register\">Sign up</span>"}
            </p>
        `;

        screen.querySelector('#auth-button').addEventListener('click', () => this._handleSubmit(isRegister));
        screen.querySelector('#auth-username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleSubmit(isRegister);
        });

        screen.querySelector('.auth-switch span').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.show(action === 'register');
        });
        return screen;
    }

    _handleSubmit(isRegister) {
        const usernameInput = this.element.querySelector('#auth-username');
        const username = usernameInput.value.trim();
        const errorMessageElement = this.element.querySelector('#auth-error-message');

        if (!username) {
            errorMessageElement.textContent = 'Username is required.';
            usernameInput.focus();
            return;
        }
        errorMessageElement.textContent = '';

        let result;
        if (isRegister) {
            result = this.userSession.register(username);
            if (!result.success) {
                 errorMessageElement.textContent = result.message;
                 usernameInput.select();
            }
        } else {
            const success = this.userSession.login(username);
            if (!success) {
                errorMessageElement.textContent = 'User not found or incorrect.';
                usernameInput.select();
            }
        }
    }

    show(isRegister = false) {
        this.container.innerHTML = '';
        this.element = this._createDOM(isRegister);
        this.container.appendChild(this.element);
        this.element.querySelector('#auth-username').focus();
    }

    hide() {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
        this.element = null;
    }
}
