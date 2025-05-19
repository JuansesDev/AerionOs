// Clase ClockCalendarWidget: Widget de reloj y calendario accesible desde la barra de tareas
export class ClockCalendarWidget {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.isOpen = false;
        this.currentDate = new Date(); // Fecha actual para la lógica del calendario
        this.clockInterval = null;
        this.triggerElement = null; // Elemento que activa el widget

        document.body.appendChild(this.element);
        this.boundGlobalClickHandler = (event) => this._handleGlobalClick(event);
    }

    // Crea el DOM del widget
    _createDOM() {
        const widgetEl = document.createElement('div');
        widgetEl.id = 'clock-calendar-widget';
        widgetEl.classList.add('hidden');
        // Estructura básica, se puede mejorar con CSS
        widgetEl.innerHTML = `
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

        widgetEl.querySelector('[data-action="prev-month"]').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this._renderCalendar();
        });

        widgetEl.querySelector('[data-action="next-month"]').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this._renderCalendar();
        });

        // Prevenir clics dentro del widget que lo cierren mediante el listener global
        widgetEl.addEventListener('click', (e) => e.stopPropagation());

        return widgetEl;
    }

    // Actualiza la información de hora y fecha en el widget
    _updateClockDisplay() {
        const now = new Date();
        const timeEl = this.element.querySelector('.widget-clock-time');
        const dateEl = this.element.querySelector('.widget-clock-date');

        if (timeEl) {
            timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    // Renderiza el calendario con la fecha actual
    _renderCalendar() {
        const monthYearEl = this.element.querySelector('.current-month-year');
        const gridEl = this.element.querySelector('.calendar-grid');
        const daysHeaderEl = this.element.querySelector('.calendar-days-header');

        if (!monthYearEl || !gridEl || !daysHeaderEl) return;

        monthYearEl.textContent = this.currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        // Renderizar encabezado de días de la semana
        if (daysHeaderEl.children.length === 0) { // Solo renderizar una vez
            const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']; // Nombres cortos de los días en español
            days.forEach(day => {
                const dayEl = document.createElement('div');
                dayEl.textContent = day;
                dayEl.classList.add('calendar-day-label');
                daysHeaderEl.appendChild(dayEl);
            });
        }

        gridEl.innerHTML = ''; // Limpiar cuadrícula anterior

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const today = new Date();

        // Agregar celdas vacías para los días antes del primero del mes
        // Domingo es 0, Lunes es 1, etc.
        let startDay = firstDayOfMonth.getDay(); // 0 para Domingo, 1 para Lunes...
        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            gridEl.appendChild(emptyCell);
        }

        // Agregar celdas de días
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

    // Posiciona el widget respecto al elemento activador
    _positionWidget() {
        if (!this.triggerElement || !this.element) return;

        const triggerRect = this.triggerElement.getBoundingClientRect();
        const widgetRect = this.element.getBoundingClientRect(); // Asegurarse de que esto se llame después de que el widget sea visible o tenga dimensiones

        let top = triggerRect.top - widgetRect.height - 5; // Margen de 5px encima del activador
        let left = triggerRect.right - widgetRect.width;   // Alinear el borde derecho del widget con el borde derecho del activador

        // Ajustar si está fuera de los límites de la ventana
        if (top < 5) { // Si está demasiado cerca de la parte superior o fuera de la pantalla
            top = triggerRect.bottom + 5; // Posicionar debajo del activador
        }
        if (left < 5) { // Si está demasiado cerca del borde izquierdo
            left = 5;
        }
        // Asegurarse de que el widget no se salga del borde derecho de la pantalla
        if (left + widgetRect.width > window.innerWidth - 5) {
            left = window.innerWidth - widgetRect.width - 5;
        }
        // Asegurarse de que el widget no se salga del borde inferior de la pantalla (si se posiciona debajo)
        if (top + widgetRect.height > window.innerHeight - 5) {
            top = window.innerHeight - widgetRect.height - 5;
        }


        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
    }


    // Maneja los clics fuera del widget para cerrarlo
    _handleGlobalClick(event) {
        if (this.isOpen &&
            !this.element.contains(event.target) &&
            this.triggerElement && // Asegurarse de que triggerElement esté configurado
            !this.triggerElement.contains(event.target)) {
            this.hide();
        }
    }

    // Alterna la visibilidad del widget
    toggle(triggerElement) {
        if (triggerElement) { // Actualizar el elemento activador cada vez que se llama al toggle con él
            this.triggerElement = triggerElement;
        }
        this.isOpen ? this.hide() : this.show();
    }

    // Muestra el widget
    show() {
        if (this.isOpen) return;
        this.currentDate = new Date(); // Restablecer al mes actual al abrir
        this._updateClockDisplay();
        this._renderCalendar();
        this.element.classList.remove('hidden');
        this.isOpen = true;

        // Posicionamiento diferido hasta después de que el elemento se renderice y las dimensiones estén disponibles
        requestAnimationFrame(() => {
            this._positionWidget();
        });

        if (!this.clockInterval) {
            this.clockInterval = setInterval(() => this._updateClockDisplay(), 1000); // Actualizar reloj cada segundo cuando está abierto
        }
        document.addEventListener('click', this.boundGlobalClickHandler, true);
    }

    // Oculta el widget
    hide() {
        if (!this.isOpen) return;
        this.element.classList.add('hidden');
        this.isOpen = false;
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        document.removeEventListener('click', this.boundGlobalClickHandler, true);
    }

    // Limpia recursos al destruir
    destroy() {
        this.hide(); // Asegurarse de que los listeners se eliminen
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}
