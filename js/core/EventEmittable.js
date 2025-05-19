// js/core/EventEmittable.js
export class EventEmittable {
    constructor() {
        this._events = {};
    }

    on(eventName, listener) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(listener);
    }

    emit(eventName, ...args) {
        if (this._events[eventName]) {
            this._events[eventName].forEach(listener => listener(...args));
        }
    }

    off(eventName, listenerToRemove) {
        if (!this._events[eventName]) return;

        this._events[eventName] = this._events[eventName].filter(
            listener => listener !== listenerToRemove
        );
    }
}