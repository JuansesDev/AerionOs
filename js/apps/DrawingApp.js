import { App } from '../core/App.js';

export class DrawingApp extends App {
    constructor(webOS) {
        super('drawing', 'AuraSketch', 'fas fa-paint-brush', webOS, {
            window: {
                initialWidth: 800,
                initialHeight: 600,
                minWidth: 500,
                minHeight: 400,
                customClass: 'drawing-app-window'
            },
            allowMultipleInstances: true
        });

        this.windows = new Map();
        this.BASE_CANVAS_WIDTH = 1200;
        this.BASE_CANVAS_HEIGHT = 900;
    }

    _state(windowInstance) {
        return windowInstance ? this.windows.get(windowInstance.id) : null;
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        const state = {
            canvas: null,
            ctx: null,
            isDrawing: false,
            currentTool: 'pencil',
            currentColor: '#000000',
            lineWidth: 5,
            lastX: 0,
            lastY: 0,
            resizeObserver: null,
            resizeFrame: null,
            windowResizeHandler: null,
            canvasHandlers: null
        };
        this.windows.set(windowInstance.id, state);

        contentElement.innerHTML = this._getWindowContent();

        windowInstance.on('beforeClose', () => this.cleanup(windowInstance));
        windowInstance.on('close', () => this.windows.delete(windowInstance.id));

        setTimeout(async () => {
            try {
                await this._initCanvas(windowInstance);
                this._setupEventListeners(windowInstance);
            } catch (error) {
            }
        }, 100);

        return windowInstance;
    }

    _getWindowContent() {
        if (!document.querySelector('link[href="styles/drawing-app.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'styles/drawing-app.css';
            document.head.appendChild(link);
        }

        return `
            <div class="drawing-app">
                <div class="toolbar">
                    <button class="tool-btn active" data-tool="pencil" title="Pencil">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="tool-btn" data-tool="eraser" title="Eraser">
                        <i class="fas fa-eraser"></i>
                    </button>
                    <input
                        type="color"
                        id="color-picker"
                        value="#000000"
                        title="Color"
                        class="color-picker"
                    >
                    <div class="brush-size-container">
                        <label for="brush-size">Size:</label>
                        <input
                            type="range"
                            id="brush-size"
                            min="1"
                            max="50"
                            value="5"
                            title="Brush size"
                        >
                        <span id="brush-size-value">5px</span>
                    </div>
                    <button id="clear-canvas" title="Clear canvas" class="clear-btn">
                        <i class="fas fa-trash"></i> Clear
                    </button>
                </div>
                <div class="canvas-container">
                    <canvas id="drawing-canvas"></canvas>
                </div>
            </div>
        `;
    }

    _handleResize(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.canvas || !state.canvas.parentElement) return;

        const container = state.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        const containerWidth = rect.width;
        const containerHeight = rect.height;

        const scaleX = containerWidth / this.BASE_CANVAS_WIDTH;
        const scaleY = containerHeight / this.BASE_CANVAS_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = this.BASE_CANVAS_WIDTH * scale;
        const scaledHeight = this.BASE_CANVAS_HEIGHT * scale;

        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;

        state.canvas.style.width = `${scaledWidth}px`;
        state.canvas.style.height = `${scaledHeight}px`;
        state.canvas.style.position = 'absolute';
        state.canvas.style.left = `${offsetX}px`;
        state.canvas.style.top = `${offsetY}px`;
        state.canvas.style.imageRendering = 'auto';
    }

    async _initCanvas(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        if (!windowInstance?.contentElement) {
            throw new Error('The window content is not available');
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        const container = windowInstance.contentElement.querySelector('.canvas-container');
        state.canvas = windowInstance.contentElement.querySelector('#drawing-canvas');

        if (!state.canvas) {
            throw new Error('Could not find the canvas element');
        }

        state.canvas.width = this.BASE_CANVAS_WIDTH;
        state.canvas.height = this.BASE_CANVAS_HEIGHT;

        state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

        if (!container) {
            throw new Error('Could not find the canvas container');
        }

        container.style.height = 'calc(100% - 50px)';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        const handleResize = () => {
            cancelAnimationFrame(state.resizeFrame);
            state.resizeFrame = requestAnimationFrame(() => this._handleResize(windowInstance));
        };

        this._handleResize(windowInstance);
        this._initializeCanvasBackground(windowInstance);

        if (typeof ResizeObserver === 'function') {
            state.resizeObserver = new ResizeObserver(handleResize);
            state.resizeObserver.observe(container);
        } else {
            state.windowResizeHandler = handleResize;
            window.addEventListener('resize', handleResize);
        }
    }

    _initializeCanvasBackground(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx || !state.canvas) return;

        state.ctx.fillStyle = 'white';
        state.ctx.fillRect(0, 0, this.BASE_CANVAS_WIDTH, this.BASE_CANVAS_HEIGHT);
        this._updateContextStyle(windowInstance);
    }

    _setupEventListeners(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !windowInstance?.contentElement) {
            console.error('Cannot set up events: DOM elements not available');
            return;
        }

        const root = windowInstance.contentElement;

        root.querySelectorAll('.tool-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tool = button.dataset.tool;
                if (!tool) return;
                state.currentTool = tool;
                root.querySelectorAll('.tool-btn').forEach(btn =>
                    btn.classList.toggle('active', btn === button)
                );
                this._updateContextStyle(windowInstance);
            });
        });

        const colorPicker = root.querySelector('#color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                state.currentColor = e.target.value;
                this._updateContextStyle(windowInstance);
            });
        }

        const brushSize = root.querySelector('#brush-size');
        if (brushSize) {
            brushSize.addEventListener('input', (e) => {
                state.lineWidth = parseInt(e.target.value);
                const brushSizeValue = root.querySelector('#brush-size-value');
                if (brushSizeValue) {
                    brushSizeValue.textContent = `${state.lineWidth}px`;
                }
                this._updateContextStyle(windowInstance);
            });
        }

        const clearButton = root.querySelector('#clear-canvas');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (state.ctx && state.canvas) {
                    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
                    state.ctx.fillStyle = 'white';
                    state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
                }
            });
        }

        if (state.canvas) {
            const handlers = {
                mousedown: (e) => this._startDrawing(e, windowInstance),
                mousemove: (e) => this._draw(e, windowInstance),
                mouseup: () => this._stopDrawing(windowInstance),
                mouseout: () => this._stopDrawing(windowInstance),
                touchstart: (e) => this._handleTouchStart(e, windowInstance),
                touchmove: (e) => this._handleTouchMove(e, windowInstance),
                touchend: () => this._stopDrawing(windowInstance)
            };
            state.canvasHandlers = handlers;
            Object.entries(handlers).forEach(([event, handler]) => {
                state.canvas.addEventListener(event, handler, { passive: false });
            });
        }
    }

    _startDrawing(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;

        state.isDrawing = true;

        const pos = this._getCanvasCoordinates(e, windowInstance);
        if (!pos) return;

        state.lastX = pos.x;
        state.lastY = pos.y;

        state.ctx.beginPath();
        state.ctx.moveTo(state.lastX, state.lastY);

        state.ctx.arc(state.lastX, state.lastY, state.lineWidth / 2, 0, Math.PI * 2);
        state.ctx.fill();

        state.ctx.beginPath();
        state.ctx.moveTo(state.lastX, state.lastY);
    }

    _getCanvasCoordinates(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.canvas) return null;

        let x, y;
        const rect = state.canvas.getBoundingClientRect();
        if (e.touches) {
            const touch = e.touches[0];
            x = (touch.clientX - rect.left) / rect.width * state.canvas.width;
            y = (touch.clientY - rect.top) / rect.height * state.canvas.height;
            e.preventDefault();
        } else {
            x = (e.clientX - rect.left) / rect.width * state.canvas.width;
            y = (e.clientY - rect.top) / rect.height * state.canvas.height;
        }

        x = Math.max(0, Math.min(x, state.canvas.width));
        y = Math.max(0, Math.min(y, state.canvas.height));

        return { x, y };
    }

    _draw(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.isDrawing || !state.ctx) return;

        const pos = this._getCanvasCoordinates(e, windowInstance);
        if (!pos) return;

        const x = pos.x;
        const y = pos.y;

        const dist = Math.sqrt(Math.pow(x - state.lastX, 2) + Math.pow(y - state.lastY, 2));

        if (dist > 10) {
            const steps = Math.ceil(dist / 2);
            const stepX = (x - state.lastX) / steps;
            const stepY = (y - state.lastY) / steps;

            for (let i = 0; i < steps; i++) {
                const currentX = state.lastX + stepX * i;
                const currentY = state.lastY + stepY * i;
                this._drawPoint(currentX, currentY, windowInstance);
            }
        } else {
            this._drawPoint(x, y, windowInstance);
        }

        state.lastX = x;
        state.lastY = y;
    }

    _drawPoint(x, y, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;

        state.ctx.lineTo(x, y);
        state.ctx.stroke();

        state.ctx.beginPath();
        state.ctx.arc(x, y, state.ctx.lineWidth / 2, 0, Math.PI * 2);
        state.ctx.fill();

        state.ctx.beginPath();
        state.ctx.moveTo(x, y);
    }

    _updateContextStyle(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;

        if (state.currentTool === 'eraser') {
            state.ctx.strokeStyle = 'white';
            state.ctx.fillStyle = 'white';
            state.ctx.globalCompositeOperation = 'destination-out';
        } else {
            state.ctx.strokeStyle = state.currentColor;
            state.ctx.fillStyle = state.currentColor;
            state.ctx.globalCompositeOperation = 'source-over';
        }

        state.ctx.lineWidth = state.lineWidth;
        state.ctx.lineCap = 'round';
        state.ctx.lineJoin = 'round';

        state.ctx.imageSmoothingEnabled = true;
        state.ctx.imageSmoothingQuality = 'high';
    }

    _stopDrawing(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.isDrawing = false;
        if (state.ctx) {
            state.ctx.beginPath();
        }
    }

    _handleTouchStart(e, windowInstance) {
        if (e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this._startDrawing(mouseEvent, windowInstance);
    }

    _handleTouchMove(e, windowInstance) {
        if (e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this._draw(mouseEvent, windowInstance);
    }

    cleanup(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        try {
            cancelAnimationFrame(state.resizeFrame);

            if (state.resizeObserver) {
                state.resizeObserver.disconnect();
                state.resizeObserver = null;
            }

            if (state.windowResizeHandler) {
                window.removeEventListener('resize', state.windowResizeHandler);
                state.windowResizeHandler = null;
            }

            if (state.canvas && state.canvasHandlers) {
                Object.entries(state.canvasHandlers).forEach(([event, handler]) => {
                    state.canvas.removeEventListener(event, handler);
                });
            }

            if (state.ctx && state.canvas) {
                state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
            }

            state.ctx = null;
            state.canvas = null;
        } catch (error) {
        }
    }
}
