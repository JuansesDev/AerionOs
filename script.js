document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    const taskbar = document.getElementById('taskbar');
    const taskbarApps = document.getElementById('taskbar-apps');
    const clockElement = document.getElementById('clock');
    const windowTemplate = document.getElementById('window-template');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    let openWindows = {}; // { appId: { element: windowDOM, taskbarIcon: iconDOM, originalState: {}, isMinimized: false, isMaximized: false, iconClass: 'fa-window-maximize' } }
    let highestZIndex = 100;
    let windowIdCounter = 0;

    const DEFAULT_WALLPAPER_URL = 'https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png';

    // --- Reloj y Calendario ---
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Crear widget del calendario
    const clockCalendarWidget = document.createElement('div');
    clockCalendarWidget.id = 'clock-calendar-widget';
    clockCalendarWidget.classList.add('hidden');
    clockCalendarWidget.innerHTML = `
        <div class="widget-clock-time"></div>
        <div class="widget-clock-date"></div>
        <div class="calendar">
            <div class="calendar-header">
                <button data-action="prev-month" class="calendar-nav-button" title="Mes anterior"><i class="fas fa-chevron-left"></i></button>
                <span class="current-month-year"></span>
                <button data-action="next-month" class="calendar-nav-button" title="Mes siguiente"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="calendar-days-header"></div>
            <div class="calendar-grid"></div>
        </div>
    `;
    document.body.appendChild(clockCalendarWidget);

    // Variables para el widget
    let widgetIsOpen = false;
    let widgetCurrentDate = new Date();
    let widgetClockInterval = null;

    // Funcionalidad del calendario
    clockCalendarWidget.querySelector('[data-action="prev-month"]').addEventListener('click', () => {
        widgetCurrentDate.setMonth(widgetCurrentDate.getMonth() - 1);
        renderCalendar();
    });

    clockCalendarWidget.querySelector('[data-action="next-month"]').addEventListener('click', () => {
        widgetCurrentDate.setMonth(widgetCurrentDate.getMonth() + 1);
        renderCalendar();
    });

    // Prevenir que clicks dentro del widget lo cierren
    clockCalendarWidget.addEventListener('click', (e) => e.stopPropagation());

    // Funciones del widget
    function updateWidgetClock() {
        const now = new Date();
        const timeEl = clockCalendarWidget.querySelector('.widget-clock-time');
        const dateEl = clockCalendarWidget.querySelector('.widget-clock-date');

        if (timeEl) {
            timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    function renderCalendar() {
        const monthYearEl = clockCalendarWidget.querySelector('.current-month-year');
        const gridEl = clockCalendarWidget.querySelector('.calendar-grid');
        const daysHeaderEl = clockCalendarWidget.querySelector('.calendar-days-header');

        if (!monthYearEl || !gridEl || !daysHeaderEl) return;

        monthYearEl.textContent = widgetCurrentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        // Render days of the week header
        if (daysHeaderEl.children.length === 0) {
            const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
            days.forEach(day => {
                const dayEl = document.createElement('div');
                dayEl.textContent = day;
                dayEl.classList.add('calendar-day-label');
                daysHeaderEl.appendChild(dayEl);
            });
        }

        gridEl.innerHTML = '';

        const year = widgetCurrentDate.getFullYear();
        const month = widgetCurrentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const today = new Date();

        let startDay = firstDayOfMonth.getDay();
        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            gridEl.appendChild(emptyCell);
        }

        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            dayCell.textContent = day;
            dayCell.dataset.day = day;

            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayCell.classList.add('today');
            }
            gridEl.appendChild(dayCell);
        }
    }

    function positionWidget() {
        const triggerRect = clockElement.getBoundingClientRect();
        const widgetRect = clockCalendarWidget.getBoundingClientRect();
        const taskbarHeight = taskbar.offsetHeight;

        // Posicionar por encima de la barra de tareas
        let top = window.innerHeight - taskbarHeight - widgetRect.height - 10; // 10px de margen

        // Alinear con el reloj horizontalmente
        let left = triggerRect.right - widgetRect.width;

        // Asegurar que no se salga de los límites de la ventana
        if (left < 5) {
            left = 5;
        }
        if (left + widgetRect.width > window.innerWidth - 5) {
            left = window.innerWidth - widgetRect.width - 5;
        }

        clockCalendarWidget.style.top = `${top}px`;
        clockCalendarWidget.style.left = `${left}px`;
    }

    function toggleWidget() {
        if (widgetIsOpen) {
            hideWidget();
        } else {
            showWidget();
        }
    }

    function showWidget() {
        if (widgetIsOpen) return;
        widgetCurrentDate = new Date();
        updateWidgetClock();
        renderCalendar();
        clockCalendarWidget.classList.remove('hidden');
        widgetIsOpen = true;

        requestAnimationFrame(() => {
            positionWidget();
        });

        if (!widgetClockInterval) {
            widgetClockInterval = setInterval(updateWidgetClock, 1000);
        }
        document.addEventListener('click', handleGlobalClick, true);
    }

    function hideWidget() {
        if (!widgetIsOpen) return;
        clockCalendarWidget.classList.add('hidden');
        widgetIsOpen = false;
        if (widgetClockInterval) {
            clearInterval(widgetClockInterval);
            widgetClockInterval = null;
        }
        document.removeEventListener('click', handleGlobalClick, true);
    }

    function handleGlobalClick(event) {
        if (widgetIsOpen &&
            !clockCalendarWidget.contains(event.target) &&
            !clockElement.contains(event.target)) {
            hideWidget();
        }
    }

    // Configurar evento para el reloj
    clockElement.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWidget();
    });

    // --- Menú de Inicio ---
    startButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Evita que el click se propague al desktop y cierre el menú
        startMenu.classList.toggle('hidden');
        startButton.classList.toggle('active', !startMenu.classList.contains('hidden'));
    });

    document.addEventListener('click', (event) => {
        // Cerrar menú de inicio si se hace clic fuera de él y no está oculto
        if (!startMenu.classList.contains('hidden') && !startMenu.contains(event.target) && event.target !== startButton) {
            startMenu.classList.add('hidden');
            startButton.classList.remove('active');
        }
    });

    startMenu.querySelectorAll('.app-list li').forEach(item => {
        item.addEventListener('click', () => {
            const appId = item.dataset.appId;
            const appTitle = item.dataset.appTitle;
            const appIconClass = item.querySelector('i')?.className || 'fas fa-window-maximize'; // Icono del menú
            launchApp(appId, appTitle, appIconClass);
            startMenu.classList.add('hidden');
            startButton.classList.remove('active');
        });
    });


    // --- Gestión de Ventanas ---
    function createWindow(appId, title, contentHtml = '', appIconClass = 'fas fa-window-maximize', customClass = '') {
        windowIdCounter++;
        const uniqueWindowId = `window-${appId}-${windowIdCounter}`;

        const windowNode = windowTemplate.content.cloneNode(true);
        const windowElement = windowNode.querySelector('.window');
        windowElement.id = uniqueWindowId;
        windowElement.dataset.appId = appId;
        if (customClass) windowElement.classList.add(customClass);

        const windowIconElement = windowElement.querySelector('.window-icon i');
        if(windowIconElement) windowIconElement.className = appIconClass; // Asignar icono específico de app

        const windowTitleElement = windowElement.querySelector('.window-title');
        const windowContentElement = windowElement.querySelector('.window-content');
        const closeButton = windowElement.querySelector('.close-button');
        const minimizeButton = windowElement.querySelector('.minimize-button');
        const maximizeButton = windowElement.querySelector('.maximize-button');

        windowTitleElement.textContent = title;
        windowContentElement.innerHTML = contentHtml;

        // Posicionamiento inicial de la ventana
        const existingWindows = Object.values(openWindows).length;
        const taskbarHeight = taskbar.offsetHeight;
        const desktopHeight = desktop.offsetHeight;
        const desktopWidth = desktop.offsetWidth;

        let top = 50 + (existingWindows % 5) * 30;
        let left = 100 + (existingWindows % 10) * 30;

        // Asegurarse de que la ventana no se genere fuera de la vista inicial
        if (top + 300 > desktopHeight) top = 20; // 300 es un alto aprox.
        if (left + 400 > desktopWidth) left = 20; // 400 es un ancho aprox.

        windowElement.style.top = `${top}px`;
        windowElement.style.left = `${left}px`;

        desktop.appendChild(windowElement);
        bringToFront(windowElement);

        // Event Listeners para controles de ventana
        closeButton.addEventListener('click', () => closeWindow(appId, windowElement));
        minimizeButton.addEventListener('click', () => minimizeWindow(appId, windowElement));
        maximizeButton.addEventListener('click', () => toggleMaximizeWindow(appId, windowElement, maximizeButton));

        makeDraggable(windowElement);

        const taskbarIcon = addTaskbarIcon(appId, title, windowElement, appIconClass);
        openWindows[appId] = {
            element: windowElement,
            taskbarIcon: taskbarIcon,
            isMinimized: false,
            isMaximized: false,
            originalState: {}, // Se guardará al maximizar
            iconClass: appIconClass
        };
        setActiveTaskbarIcon(appId);

        // Inicializar aplicación específica si es necesario
        if (appId === 'calculator') initCalculator(windowElement);
        else if (appId === 'files') initFileExplorer(windowElement);
        else if (appId === 'notepad') initNotepad(windowElement);
        else if (appId === 'browser') initBrowser(windowElement);

        windowElement.addEventListener('mousedown', () => {
            bringToFront(windowElement);
            setActiveTaskbarIcon(appId);
        });

        return windowElement;
    }

    function closeWindow(appId, windowElement) {
        if (windowElement && desktop.contains(windowElement)) {
            windowElement.style.opacity = '0';
            windowElement.style.transform = 'scale(0.9)';
            setTimeout(() => {
                desktop.removeChild(windowElement);
            }, 200); // Coincidir con transición CSS
        }
        if (openWindows[appId]) {
            if (openWindows[appId].taskbarIcon && taskbarApps.contains(openWindows[appId].taskbarIcon)) {
                taskbarApps.removeChild(openWindows[appId].taskbarIcon);
            }
            delete openWindows[appId];
        }
        // Activar la última ventana activa si existe
        const remainingAppIds = Object.keys(openWindows);
        if (remainingAppIds.length > 0) {
            const lastAppId = remainingAppIds[remainingAppIds.length - 1];
            if (openWindows[lastAppId] && !openWindows[lastAppId].isMinimized) {
                 bringToFront(openWindows[lastAppId].element);
                 setActiveTaskbarIcon(lastAppId);
            }
        }
    }

    function minimizeWindow(appId, windowElement) {
        if (!openWindows[appId] || openWindows[appId].isMinimized) return;

        windowElement.classList.add('minimized-state'); // Usa CSS para ocultar visualmente
        openWindows[appId].isMinimized = true;
        openWindows[appId].taskbarIcon.classList.add('minimized');
        openWindows[appId].taskbarIcon.classList.remove('active');

        // Si hay otra ventana no minimizada, activarla
        const otherAppIds = Object.keys(openWindows).filter(id => id !== appId && !openWindows[id].isMinimized);
        if (otherAppIds.length > 0) {
            const nextAppId = otherAppIds.sort((a,b) =>
                parseInt(openWindows[b].element.style.zIndex || 0) - parseInt(openWindows[a].element.style.zIndex || 0)
            )[0]; // La de z-index más alto
            if (nextAppId) {
                 bringToFront(openWindows[nextAppId].element);
                 setActiveTaskbarIcon(nextAppId);
            }
        }
    }

    function restoreWindow(appId, windowElement) {
        if (!openWindows[appId] || !openWindows[appId].isMinimized) return;

        windowElement.classList.remove('minimized-state');
        openWindows[appId].isMinimized = false;
        openWindows[appId].taskbarIcon.classList.remove('minimized');
        bringToFront(windowElement);
        setActiveTaskbarIcon(appId);
    }

    function toggleMaximizeWindow(appId, windowElement, maximizeButton) {
        const app = openWindows[appId];
        if (!app) return;

        const iconElement = maximizeButton.querySelector('i');

        if (app.isMaximized) { // Restaurar
            windowElement.style.top = app.originalState.top;
            windowElement.style.left = app.originalState.left;
            windowElement.style.width = app.originalState.width;
            windowElement.style.height = app.originalState.height;
            windowElement.classList.remove('maximized-state');
            iconElement.classList.remove('fa-window-restore');
            iconElement.classList.add('fa-square'); // Icono de maximizar (cuadrado vacío)
            app.isMaximized = false;
        } else { // Maximizar
            app.originalState = {
                top: windowElement.style.top,
                left: windowElement.style.left,
                width: windowElement.style.width || `${windowElement.offsetWidth}px`,
                height: windowElement.style.height || `${windowElement.offsetHeight}px`,
            };
            windowElement.style.top = '0px';
            windowElement.style.left = '0px';
            windowElement.style.width = '100%';
            windowElement.style.height = `calc(100% - ${taskbar.offsetHeight}px)`;
            windowElement.classList.add('maximized-state');
            iconElement.classList.remove('fa-square');
            iconElement.classList.add('fa-window-restore'); // Icono de restaurar
            app.isMaximized = true;
        }
        bringToFront(windowElement);
        setActiveTaskbarIcon(appId);
    }


    function bringToFront(windowElement) {
        highestZIndex++;
        windowElement.style.zIndex = highestZIndex;
    }

    function setActiveTaskbarIcon(appId) {
        document.querySelectorAll('.taskbar-app-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        if (openWindows[appId] && openWindows[appId].taskbarIcon && !openWindows[appId].isMinimized) {
            openWindows[appId].taskbarIcon.classList.add('active');
        }
    }

    // --- Arrastrar Ventanas ---
    function makeDraggable(element) {
        const header = element.querySelector('.window-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || openWindows[element.dataset.appId]?.isMaximized) return;

            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            bringToFront(element);
            setActiveTaskbarIcon(element.dataset.appId);
            desktop.style.cursor = 'grabbing';
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            const desktopRect = desktop.getBoundingClientRect();
            const taskbarHeight = taskbar.offsetHeight;

            newX = Math.max(0, Math.min(newX, desktopRect.width - element.offsetWidth));
            // Permitir arrastrar un poco por encima para "meterla" debajo de la barra de tareas visualmente
            newY = Math.max(-element.offsetHeight + header.offsetHeight + 20, Math.min(newY, desktopRect.height - header.offsetHeight));


            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                desktop.style.cursor = 'default';
                header.style.cursor = 'move';
            }
        });
    }

    // --- Iconos de la Barra de Tareas ---
    function addTaskbarIcon(appId, title, windowElement, appIconClass) {
        const icon = document.createElement('div');
        icon.className = 'taskbar-app-icon';
        icon.dataset.appId = appId;

        const iconI = document.createElement('i');
        iconI.className = appIconClass.split(" ")[0] + " " + appIconClass.split(" ")[1]; // Tomar las primeras dos clases para el icono
        icon.appendChild(iconI);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        icon.appendChild(titleSpan);

        icon.addEventListener('click', () => {
            const app = openWindows[appId];
            if (!app) return; // La app ya no existe

            if (app.isMinimized) {
                restoreWindow(appId, app.element);
            } else {
                // Si la ventana está visible pero no activa, activarla
                // Si está activa, minimizarla (comportamiento común de dock/taskbar)
                if (app.element.style.zIndex == highestZIndex && !app.element.classList.contains('minimized-state')) {
                     minimizeWindow(appId, app.element);
                } else {
                    bringToFront(app.element);
                    setActiveTaskbarIcon(appId);
                }
            }
        });
        taskbarApps.appendChild(icon);
        return icon;
    }

    // --- Lanzar Aplicaciones desde Iconos del Escritorio ---
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const appId = icon.dataset.appId;
            const appTitle = icon.dataset.appTitle;
            const appIconClass = icon.querySelector('i')?.className || 'fas fa-window-maximize'; // Icono del escritorio
            launchApp(appId, appTitle, appIconClass);
        });
    });

    function launchApp(appId, appTitle, appIconClass) {
        if (openWindows[appId]) { // La app ya está abierta
            const app = openWindows[appId];
            if (app.isMinimized) {
                restoreWindow(appId, app.element);
            } else {
                bringToFront(app.element);
                setActiveTaskbarIcon(appId);
            }
            return;
        }

        let content = '';
        let customWindowClass = `${appId}-app`; // Para estilos específicos de app

        switch(appId) {
            case 'calculator':
                content = getCalculatorHTML();
                break;
            case 'files':
                content = getFileExplorerHTML();
                break;
            case 'notepad':
                content = getNotepadHTML();
                break;
            case 'terminal':
                content = `<div style="background: #000; color: #0F0; font-family: monospace; padding: 10px; height: 100%; overflow-y: auto;">AuraOS Terminal v0.1<br>> _</div>`;
                break;
            case 'settings':
                content = getSettingsHTML();
                break;
            case 'browser':
                content = getBrowserHTML();
                break;
            default:
                content = `<p>Contenido de ${appTitle} (ID: ${appId})</p>`;
        }

        const newWindow = createWindow(appId, appTitle, content, appIconClass, customWindowClass);
        if (appId === 'settings') {
            initSettingsUI(newWindow);
        }
    }

    // --- Contenido HTML de Aplicaciones ---
    function getCalculatorHTML() {
        return `
            <div class="calculator">
                <div class="calculator-display">
                    <div class="previous-operation" id="prevOperation"></div>
                    <div id="calcDisplay">0</div>
                </div>
                <button class="clear" data-val="C">AC</button>
                <button class="function" data-val="±">±</button>
                <button class="function" data-val="%">%</button>
                <button class="operator" data-val="/">÷</button>

                <button data-val="7">7</button>
                <button data-val="8">8</button>
                <button data-val="9">9</button>
                <button class="operator" data-val="*">×</button>

                <button data-val="4">4</button>
                <button data-val="5">5</button>
                <button data-val="6">6</button>
                <button class="operator" data-val="-">−</button>

                <button data-val="1">1</button>
                <button data-val="2">2</button>
                <button data-val="3">3</button>
                <button class="operator" data-val="+">+</button>

                <button data-val="0" style="grid-column: span 2;">0</button>
                <button data-val=".">.</button>
                <button class="equals" data-val="=">=</button>
            </div>
        `;
    }

    function initCalculator(calculatorWindow) {
        const display = calculatorWindow.querySelector('#calcDisplay');
        const prevOpDisplay = calculatorWindow.querySelector('#prevOperation');
        const buttons = calculatorWindow.querySelectorAll('.calculator button');
        let currentInput = '0';
        let operator = null;
        let previousInput = null;
        let shouldResetDisplay = false;
        let calculationHistory = '';

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const value = button.dataset.val;

                if(value === 'noop') return; // Para botones sin función aún

                if (value === 'C') {
                    currentInput = '0';
                    operator = null;
                    previousInput = null;
                    calculationHistory = '';
                    display.textContent = currentInput;
                    prevOpDisplay.textContent = '';
                    shouldResetDisplay = false;
                } else if (value === '±') {
                    currentInput = String(parseFloat(currentInput) * -1);
                    display.textContent = currentInput;
                } else if (value === '%') {
                    currentInput = String(parseFloat(currentInput) / 100);
                    display.textContent = currentInput;
                } else if (value === '=') {
                    if (operator && previousInput !== null) {
                        calculationHistory = `${previousInput} ${getOperatorSymbol(operator)} ${currentInput} =`;
                        currentInput = calculate(previousInput, currentInput, operator);
                        display.textContent = currentInput;
                        prevOpDisplay.textContent = calculationHistory;
                        operator = null;
                        shouldResetDisplay = true;
                    }
                } else if ('+-*/'.includes(value)) {
                    if (operator && previousInput !== null && !shouldResetDisplay) {
                        calculationHistory = `${previousInput} ${getOperatorSymbol(operator)} ${currentInput}`;
                        previousInput = calculate(previousInput, currentInput, operator);
                        display.textContent = previousInput;
                        prevOpDisplay.textContent = calculationHistory;
                        currentInput = previousInput;
                    } else {
                        calculationHistory = `${currentInput} ${getOperatorSymbol(value)}`;
                        previousInput = currentInput;
                        prevOpDisplay.textContent = calculationHistory;
                    }
                    operator = value;
                    shouldResetDisplay = true;
                } else { // Números y punto decimal
                    if (currentInput === '0' && value !== '.' || shouldResetDisplay) {
                        currentInput = value;
                        shouldResetDisplay = false;
                    } else {
                        if (value === '.' && currentInput.includes('.')) return;
                        currentInput += value;
                    }
                    // Limitar longitud para que no desborde el display fácilmente
                    display.textContent = currentInput.length > 12 ? currentInput.substring(0,12) + '...' : currentInput;
                }
            });
        });

        // Soporte para el teclado
        calculatorWindow.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9' || e.key === '.') {
                // Simular clic en el botón correspondiente
                const button = Array.from(buttons).find(b => b.dataset.val === e.key);
                if (button) button.click();
            } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
                const button = Array.from(buttons).find(b => b.dataset.val === e.key);
                if (button) button.click();
            } else if (e.key === 'Enter' || e.key === '=') {
                const button = Array.from(buttons).find(b => b.dataset.val === '=');
                if (button) button.click();
            } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
                const button = Array.from(buttons).find(b => b.dataset.val === 'C');
                if (button) button.click();
            } else if (e.key === '%') {
                const button = Array.from(buttons).find(b => b.dataset.val === '%');
                if (button) button.click();
            }
            e.preventDefault(); // Prevenir el comportamiento por defecto
        });

        function getOperatorSymbol(op) {
            switch(op) {
                case '+': return '+';
                case '-': return '−';
                case '*': return '×';
                case '/': return '÷';
                default: return op;
            }
        }
    }

    function calculate(num1Str, num2Str, op) {
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
            default: return num2Str;
        }
        // Redondear para evitar problemas de coma flotante
        const roundedResult = Number(result.toFixed(12));
        return String(roundedResult.toString().replace(/\.?0+$/, ''));
    }

    function getFileExplorerHTML() {
        return `
            <div class="file-explorer">
                <div class="sidebar">
                    <div class="sidebar-title">Lugares</div>
                    <ul>
                        <li class="active"><i class="fas fa-home"></i> Inicio</li>
                        <li><i class="fas fa-desktop"></i> Escritorio</li>
                        <li><i class="fas fa-folder"></i> Documentos</li>
                        <li><i class="fas fa-download"></i> Descargas</li>
                        <li><i class="fas fa-hdd"></i> Disco Local (C:)</li>
                    </ul>
                </div>
                <div class="main-area">
                    <div class="file-item">
                        <i class="fas fa-folder"></i>
                        <span class="file-name">Documentos</span>
                        <span class="file-size">-</span>
                        <span class="file-date">Ayer</span>
                    </div>
                    <div class="file-item">
                        <i class="fas fa-folder"></i>
                        <span class="file-name">Imágenes</span>
                        <span class="file-size">-</span>
                        <span class="file-date">15/07/2023</span>
                    </div>
                    <div class="file-item">
                        <i class="fas fa-file-pdf"></i>
                        <span class="file-name">Presentacion_Proyecto.pdf</span>
                        <span class="file-size">2.3 MB</span>
                        <span class="file-date">10/07/2023</span>
                    </div>
                     <div class="file-item">
                        <i class="fas fa-file-word"></i>
                        <span class="file-name">Informe_Final.docx</span>
                        <span class="file-size">120 KB</span>
                        <span class="file-date">05/07/2023</span>
                    </div>
                    <div class="file-item">
                        <i class="fas fa-file-archive"></i>
                        <span class="file-name">Backup_Fotos.zip</span>
                        <span class="file-size">150 MB</span>
                        <span class="file-date">01/07/2023</span>
                    </div>
                </div>
            </div>
        `;
    }
    function initFileExplorer(windowElement) {
        // Lógica simple para cambiar la clase 'active' en el sidebar
        const sidebarItems = windowElement.querySelectorAll('.sidebar li');
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                // Aquí podrías cargar "contenido" diferente en .main-area
                const mainArea = windowElement.querySelector('.main-area');
                mainArea.querySelector('.file-item .file-name').textContent = `Contenido de ${item.textContent.trim()}`;
            });
        });
    }

    function getNotepadHTML() {
        return `<textarea class="notepad-textarea" spellcheck="false" placeholder="Escribe algo aquí..."></textarea>`;
    }
    function initNotepad(windowElement) {
        // Podrías añadir guardado en localStorage aquí
        const textarea = windowElement.querySelector('.notepad-textarea');
        const appId = windowElement.dataset.appId;
        // Cargar contenido guardado
        const savedText = localStorage.getItem(`notepad-${appId}-content`);
        if (savedText) {
            textarea.value = savedText;
        }
        // Guardar al cambiar (con debounce para no sobrecargar)
        let debounceTimer;
        textarea.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                localStorage.setItem(`notepad-${appId}-content`, textarea.value);
            }, 500);
        });
    }

    function getSettingsHTML() {
        return `
            <div class="settings-content">
                <div class="settings-category">
                    <h3><i class="fas fa-palette"></i> Apariencia</h3>
                    <div class="setting-item">
                        <label for="theme-select">Tema:</label>
                        <select id="theme-select" disabled><option>Claro (Por defecto)</option><option>Oscuro (Próximamente)</option></select>
                    </div>
                    <div class="setting-item">
                        <label for="wallpaper-url">Fondo de escritorio (URL):</label>
                        <input type="text" id="wallpaper-url-input" placeholder="https://...">
                        <button id="apply-wallpaper-button">Aplicar</button>
                    </div>
                    <div class="setting-item">
                        <label>Vista Previa:</label>
                        <div class="wallpaper-preview">
                            <img id="wallpaper-preview-img" src="${DEFAULT_WALLPAPER_URL}" alt="Vista previa del fondo" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin-top: 5px;">
                        </div>
                    </div>
                    <div class="setting-item">
                        <label>Fondos Predefinidos:</label>
                        <div class="predefined-wallpapers">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png" alt="Wallpaper 1" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png" alt="Wallpaper 2" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png" alt="Wallpaper 3" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png" alt="Wallpaper 4" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png" alt="Wallpaper 5" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png">
                            <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png" alt="Wallpaper 6" data-wallpaper-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png">
                            <img src="${DEFAULT_WALLPAPER_URL}" alt="Default Wallpaper" data-wallpaper-url="${DEFAULT_WALLPAPER_URL}">
                        </div>
                    </div>
                </div>
                <div class="settings-category">
                    <h3><i class="fas fa-info-circle"></i> Acerca de</h3>
                    <p><strong>AuraOS - Web Desktop Sim</strong></p>
                    <p>Versión 0.2 Alpha</p>
                    <p>Un proyecto para demostrar capacidades de desarrollo Front-End.</p>
                </div>
            </div>
        `;
    }

    function initSettingsUI(settingsWindow) {
        const wallpaperPreviewImg = settingsWindow.querySelector('#wallpaper-preview-img');
        const currentWallpaper = localStorage.getItem('desktopWallpaper') || DEFAULT_WALLPAPER_URL;
        if (wallpaperPreviewImg) {
            wallpaperPreviewImg.src = currentWallpaper;
        }
    }

    // Inicializar ajustes (ej. cambiar fondo) - se haría dentro de createWindow si appId es 'settings'
    // pero para simplificar, si la ventana de ajustes se abre, adjuntamos el listener
    document.body.addEventListener('click', function(event) {
        if (event.target.id === 'apply-wallpaper-button') {
            const wallpaperUrlInput = document.getElementById('wallpaper-url-input');
            const wallpaperPreviewImg = document.getElementById('wallpaper-preview-img'); // Puede haber múltiples si se abren varias ventanas de settings, idealmente se buscaría dentro de la ventana activa.

            if (!wallpaperUrlInput) return;
            const wallpaperUrl = wallpaperUrlInput.value;

            if (wallpaperUrl && (wallpaperUrl.startsWith('http://') || wallpaperUrl.startsWith('https://') || wallpaperUrl.startsWith('data:image'))) {
                desktop.style.backgroundImage = `url('${wallpaperUrl}')`;
                localStorage.setItem('desktopWallpaper', wallpaperUrl);
                if (wallpaperPreviewImg) wallpaperPreviewImg.src = wallpaperUrl;
            } else if(wallpaperUrl === "") { // Restablecer al fondo por defecto
                desktop.style.backgroundImage = `url('${DEFAULT_WALLPAPER_URL}')`;
                localStorage.setItem('desktopWallpaper', DEFAULT_WALLPAPER_URL);
                if (wallpaperPreviewImg) wallpaperPreviewImg.src = DEFAULT_WALLPAPER_URL;
            }
        }
        // Listener para miniaturas de fondos predefinidos
        if (event.target.matches('.predefined-wallpapers img')) {
            const wallpaperUrl = event.target.dataset.wallpaperUrl;
            // Asumimos que la vista previa está en la misma ventana que la miniatura clickeada
            const settingsWindow = event.target.closest('.window.settings-app');
            const wallpaperPreviewImg = settingsWindow ? settingsWindow.querySelector('#wallpaper-preview-img') : document.getElementById('wallpaper-preview-img');


            if (wallpaperUrl) {
                desktop.style.backgroundImage = `url('${wallpaperUrl}')`;
                localStorage.setItem('desktopWallpaper', wallpaperUrl);
                if (wallpaperPreviewImg) {
                    wallpaperPreviewImg.src = wallpaperUrl;
                }
            }
        }
    });
    // Cargar fondo de escritorio guardado al inicio
    const savedWallpaper = localStorage.getItem('desktopWallpaper');
    if (savedWallpaper) {
        desktop.style.backgroundImage = `url('${savedWallpaper}')`;
    } else {
        // Establecer el fondo por defecto si no hay ninguno guardado
        desktop.style.backgroundImage = `url('${DEFAULT_WALLPAPER_URL}')`;
        localStorage.setItem('desktopWallpaper', DEFAULT_WALLPAPER_URL);
    }


}); // Fin DOMContentLoaded