export class ClockCalendarWidget {
    constructor(webOS) {
        this.webOS = webOS;
        this.element = this._createDOM();
        this.isOpen = false;
        this.currentDate = new Date();
        this.clockInterval = null;
        this.triggerElement = null;

        document.body.appendChild(this.element);
        this.boundGlobalClickHandler = (event) => this._handleGlobalClick(event);
    }

    _createDOM() {
        const widgetEl = document.createElement('div');
        widgetEl.id = 'clock-calendar-widget';
        widgetEl.classList.add('hidden');
        widgetEl.innerHTML = `
            <div class="widget-clock-time"></div>
            <div class="widget-clock-date"></div>
            <div class="calendar">
                <div class="calendar-header">
                    <button data-action="prev-month" class="calendar-nav-button" title="Previous month"><i class="fas fa-chevron-left"></i></button>
                    <span class="current-month-year"></span>
                    <button data-action="next-month" class="calendar-nav-button" title="Next month"><i class="fas fa-chevron-right"></i></button>
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

        widgetEl.addEventListener('click', (e) => e.stopPropagation());

        return widgetEl;
    }

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

    _renderCalendar() {
        const monthYearEl = this.element.querySelector('.current-month-year');
        const gridEl = this.element.querySelector('.calendar-grid');
        const daysHeaderEl = this.element.querySelector('.calendar-days-header');

        if (!monthYearEl || !gridEl || !daysHeaderEl) return;

        monthYearEl.textContent = this.currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        if (daysHeaderEl.children.length === 0) {
            const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            days.forEach(day => {
                const dayEl = document.createElement('div');
                dayEl.textContent = day;
                dayEl.classList.add('calendar-day-label');
                daysHeaderEl.appendChild(dayEl);
            });
        }

        gridEl.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

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

    _positionWidget() {
        if (!this.triggerElement || !this.element) return;

        const triggerRect = this.triggerElement.getBoundingClientRect();
        const widgetRect = this.element.getBoundingClientRect();

        let top = triggerRect.top - widgetRect.height - 5;
        let left = triggerRect.right - widgetRect.width;

        if (top < 5) {
            top = triggerRect.bottom + 5;
        }
        if (left < 5) {
            left = 5;
        }
        if (left + widgetRect.width > window.innerWidth - 5) {
            left = window.innerWidth - widgetRect.width - 5;
        }
        if (top + widgetRect.height > window.innerHeight - 5) {
            top = window.innerHeight - widgetRect.height - 5;
        }


        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
    }


    _handleGlobalClick(event) {
        if (this.isOpen &&
            !this.element.contains(event.target) &&
            this.triggerElement &&
            !this.triggerElement.contains(event.target)) {
            this.hide();
        }
    }

    toggle(triggerElement) {
        if (triggerElement) {
            this.triggerElement = triggerElement;
        }
        this.isOpen ? this.hide() : this.show();
    }

    show() {
        if (this.isOpen) return;
        this.currentDate = new Date();
        this._updateClockDisplay();
        this._renderCalendar();
        this.element.classList.remove('hidden');
        this.isOpen = true;

        requestAnimationFrame(() => {
            this._positionWidget();
        });

        if (!this.clockInterval) {
            this.clockInterval = setInterval(() => this._updateClockDisplay(), 1000);
        }
        document.addEventListener('click', this.boundGlobalClickHandler, true);
    }

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

    destroy() {
        this.hide();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}
