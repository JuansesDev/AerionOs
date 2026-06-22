import { App } from '../core/App.js';

export class CalculatorApp extends App {
    constructor(webOS) {
        super('calculator', 'Calculator', 'fas fa-calculator', webOS, {
            window: { width: 300, height: 450, minWidth: 280, minHeight: 380 }
        });
    }

    renderContent(contentElement) {
        contentElement.innerHTML = `
            <div class="calculator">
                <div class="calculator-display">0</div>
                <button data-val="C" class="clear">C</button>
                <button data-val="BS" class="backspace"><i class="fas fa-backspace"></i></button>
                <button data-val="%" class="operator">%</button>
                <button data-val="/" class="operator">÷</button>

                <button data-val="7">7</button>
                <button data-val="8">8</button>
                <button data-val="9">9</button>
                <button data-val="*" class="operator">×</button>

                <button data-val="4">4</button>
                <button data-val="5">5</button>
                <button data-val="6">6</button>
                <button data-val="-" class="operator">−</button>

                <button data-val="1">1</button>
                <button data-val="2">2</button>
                <button data-val="3">3</button>
                <button data-val="+" class="operator">+</button>

                <button data-val="0" class="zero">0</button>
                <button data-val=".">.</button>
                <button data-val="=" class="equals">=</button>
            </div>
        `;
        this._initCalculatorLogic(contentElement.querySelector('.calculator'));
    }

    _initCalculatorLogic(calcElement) {
        const display = calcElement.querySelector('.calculator-display');
        let currentInput = '0';
        let operator = null;
        let previousInput = null;
        let shouldResetDisplay = false;
        const MAX_DISPLAY_LENGTH = 12;

        calcElement.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const value = button.dataset.val;

                if (value === 'C') {
                    currentInput = '0';
                    operator = null;
                    previousInput = null;
                    shouldResetDisplay = false;
                } else if (value === 'BS') {
                    if (shouldResetDisplay) {
                        currentInput = '0';
                        shouldResetDisplay = false;
                    } else if (currentInput.length > 1) {
                        currentInput = currentInput.slice(0, -1);
                    } else {
                        currentInput = '0';
                    }
                } else if (button.classList.contains('operator')) {
                    if (previousInput !== null && operator && !shouldResetDisplay) {
                        currentInput = this._calculate(previousInput, currentInput, operator);
                        previousInput = currentInput;
                    } else {
                        previousInput = currentInput;
                    }
                    operator = value;
                    shouldResetDisplay = true;
                } else if (value === '=') {
                    if (operator && previousInput !== null) {
                        currentInput = this._calculate(previousInput, currentInput, operator);
                        operator = null;
                        previousInput = null;
                        shouldResetDisplay = true;
                    }
                } else {
                    if (shouldResetDisplay) {
                        currentInput = value;
                        shouldResetDisplay = false;
                    } else {
                        if (currentInput === '0' && value !== '.') {
                            currentInput = value;
                        } else if (value === '.' && currentInput.includes('.')) {
                        } else if (currentInput.length < MAX_DISPLAY_LENGTH) {
                             currentInput += value;
                        }
                    }
                }

                if (currentInput.length > MAX_DISPLAY_LENGTH) {
                    if (currentInput.includes('e') || parseFloat(currentInput) > Math.pow(10, MAX_DISPLAY_LENGTH -1)) {
                         display.textContent = parseFloat(currentInput).toExponential(6);
                    } else {
                         display.textContent = currentInput.substring(0, MAX_DISPLAY_LENGTH) + '…';
                    }
                } else {
                    display.textContent = currentInput;
                }
            });
        });
    }

    _calculate(num1Str, num2Str, op) {
        const num1 = parseFloat(num1Str);
        const num2 = parseFloat(num2Str);
        if (isNaN(num1) || isNaN(num2)) return "Error";
        let result;
        switch (op) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '*': result = num1 * num2; break;
            case '/':
                if (num2 === 0) return 'Error Div0';
                result = num1 / num2;
                break;
            case '%':
                result = num1 * (num2 / 100);
                break;
            default: return num2Str;
        }
        let resultStr = String(Number(result.toPrecision(12)));
        if (resultStr.includes('e')) {
            return resultStr;
        }
        if (resultStr.length > 12 && Math.abs(result) > 1) {
            return parseFloat(resultStr).toExponential(6);
        }
        return resultStr;
    }
}
