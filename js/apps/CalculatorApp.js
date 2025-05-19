// Clase CalculatorApp: Implementa una calculadora básica
import { App } from '../core/App.js';

export class CalculatorApp extends App {
    constructor(webOS) {
        super('calculator', 'Calculadora', 'fas fa-calculator', webOS, {
            window: { width: 300, height: 450, minWidth: 280, minHeight: 380 }
        });
    }

    renderContent(contentElement) {
        // Crea la interfaz de la calculadora
        // Usar el CSS de :root para colores
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
        const MAX_DISPLAY_LENGTH = 12; // Para evitar desbordamiento visual

        // Configura los event handlers para los botones
        calcElement.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const value = button.dataset.val;

                // Lógica para botones de operación y dígitos
                if (value === 'C') {
                    // Reinicia la calculadora
                    currentInput = '0';
                    operator = null;
                    previousInput = null;
                    shouldResetDisplay = false;
                } else if (value === 'BS') {
                    // Borra el último dígito
                    if (shouldResetDisplay) { // Si BS después de =, limpia
                        currentInput = '0';
                        shouldResetDisplay = false;
                    } else if (currentInput.length > 1) {
                        currentInput = currentInput.slice(0, -1);
                    } else {
                        currentInput = '0';
                    }
                } else if (button.classList.contains('operator')) {
                    // Maneja botones de operación (+, -, *, /, %)
                    // Si ya había una operación pendiente, calcular primero
                    if (previousInput !== null && operator && !shouldResetDisplay) {
                        currentInput = this._calculate(previousInput, currentInput, operator);
                        previousInput = currentInput; // El resultado es el nuevo previousInput
                    } else {
                        previousInput = currentInput;
                    }
                    operator = value;
                    shouldResetDisplay = true;
                } else if (value === '=') {
                    // Ejecuta la operación actual
                    if (operator && previousInput !== null) {
                        currentInput = this._calculate(previousInput, currentInput, operator);
                        operator = null;
                        previousInput = null; // Después de =, la cadena de operaciones termina
                        shouldResetDisplay = true;
                    }
                } else {
                    // Dígitos y punto decimal
                    if (shouldResetDisplay) {
                        currentInput = value;
                        shouldResetDisplay = false;
                    } else {
                        if (currentInput === '0' && value !== '.') {
                            currentInput = value;
                        } else if (value === '.' && currentInput.includes('.')) {
                            // Do nothing, already has a decimal
                        } else if (currentInput.length < MAX_DISPLAY_LENGTH) {
                             currentInput += value;
                        }
                    }
                }

                // Actualización del display con formato adecuado
                if (currentInput.length > MAX_DISPLAY_LENGTH) {
                    if (currentInput.includes('e') || parseFloat(currentInput) > Math.pow(10, MAX_DISPLAY_LENGTH -1)) { // Already scientific or very large
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

    // Realiza el cálculo en base a los operandos y operador
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
            case '%': // Comportamiento: num1 % de num2 (ej: 50 % 10 = 5) o (num1/100)*num2
                      // O más comúnmente num2 es el porcentaje de num1: num1 * (num2/100)
                result = num1 * (num2 / 100);
                break;
            default: return num2Str;
        }
        // Formatear resultado para evitar problemas de precisión y longitud
        let resultStr = String(Number(result.toPrecision(12))); // toPrecision para controlar dígitos significativos
        if (resultStr.includes('e')) { // Si es notación científica, mantenerla
            return resultStr;
        }
        // Si no es científico, y es muy largo, truncar o convertir a científico
        if (resultStr.length > 12 && Math.abs(result) > 1) {
            return parseFloat(resultStr).toExponential(6);
        }
        return resultStr;
    }
}

// --- js/apps/NotepadApp.js ---
// (Similar a la versión anterior, pero asegúrate de que los métodos `_openFile` y `_saveFile`
// usen `this.webOS.fs` y manejen correctamente los paths. Usa `this.window.setTitle`.)
// ... (El código de NotepadApp es extenso, puedes adaptar