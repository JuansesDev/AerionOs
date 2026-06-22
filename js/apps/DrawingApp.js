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

        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.currentColor = '#000000';
        this.lineWidth = 5;
        this._resizeFrame = null;
        this._windowResizeHandler = null;

        this.BASE_CANVAS_WIDTH = 1200;
        this.BASE_CANVAS_HEIGHT = 900;

        this._boundStartDrawing = this._startDrawing.bind(this);
        this._boundDraw = this._draw.bind(this);
        this._boundStopDrawing = this._stopDrawing.bind(this);
        this._boundHandleTouchStart = this._handleTouchStart.bind(this);
        this._boundHandleTouchMove = this._handleTouchMove.bind(this);
        this._boundHandleResize = this._handleResize.bind(this);
    }

    renderContent(contentElement, windowInstance, launchOptions) {
        this.window = windowInstance;

        this.window.on('beforeclose', () => this.cleanup());

        contentElement.innerHTML = this._getWindowContent();

        setTimeout(async () => {
            try {
                await this._initCanvas();
                this._setupEventListeners();
            } catch (error) {
            }
        }, 100);

        return this.window;
    }

    _getWindowContent() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'styles/drawing-app.css';
        document.head.appendChild(link);

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

    _saveCanvasContent() {
        if (!this.canvas || this.canvas.width === 0 || this.canvas.height === 0) {
            return null;
        }
        return this.canvas.toDataURL('image/png');
    }

    _restoreCanvasContent(imageDataUrl, width, height) {
        if (!imageDataUrl) {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, width, height);
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = imageDataUrl;
    }

    _handleResize() {
        if (!this.canvas || !this.canvas.parentElement) return;

        const container = this.canvas.parentElement;
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

        this.canvas.style.width = `${scaledWidth}px`;
        this.canvas.style.height = `${scaledHeight}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${offsetX}px`;
        this.canvas.style.top = `${offsetY}px`;

        this.canvas.style.imageRendering = 'auto';
    };

    async _initCanvas() {
        if (!this.window?.contentElement) {
            throw new Error('The window content is not available');
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        const container = this.window.contentElement.querySelector('.canvas-container');
        this.canvas = this.window.contentElement.querySelector('#drawing-canvas');

        if (!this.canvas) {
            throw new Error('Could not find the canvas element');
        }

        this.canvas.width = this.BASE_CANVAS_WIDTH;
        this.canvas.height = this.BASE_CANVAS_HEIGHT;

        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        if (!container) {
            throw new Error('Could not find the canvas container');
        }

        container.style.height = 'calc(100% - 50px)';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        const handleResize = () => {
            cancelAnimationFrame(this._resizeFrame);
            this._resizeFrame = requestAnimationFrame(() => this._handleResize());
        };

        this._handleResize();

        this._initializeCanvasBackground();

        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(handleResize);
            this._resizeObserver.observe(container);
        } else {
            window.addEventListener('resize', handleResize);
            this._windowResizeHandler = handleResize;
        }
    }

    _initializeCanvasBackground() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.BASE_CANVAS_WIDTH, this.BASE_CANVAS_HEIGHT);
        this._updateContextStyle();
    }

    _setupEventListeners() {
        if (!this.window?.contentElement) {
            console.error('Cannot set up events: DOM elements not available');
            return;
        }

        const handleToolButtonClick = (e) => {
            const button = e.target.closest('.tool-btn');
            if (!button) return;

            const tool = button.dataset.tool;
            if (!tool) return;

            this.currentTool = tool;
            document.querySelectorAll('.tool-btn').forEach(btn =>
                btn.classList.toggle('active', btn === button)
            );

            if (this.ctx) {
                if (this.currentTool === 'eraser') {
                    this.ctx.strokeStyle = 'white';
                    this.ctx.globalCompositeOperation = 'destination-out';
                } else {
                    this.ctx.strokeStyle = this.currentColor;
                    this.ctx.globalCompositeOperation = 'source-over';
                }
                this.ctx.lineWidth = this.lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            }
        };

        const handleColorChange = (e) => {
            this.currentColor = e.target.value;
            this._updateContextStyle();
        };

        const handleBrushSizeChange = (e) => {
            this.lineWidth = parseInt(e.target.value);
            const brushSizeValue = this.window.contentElement.querySelector('#brush-size-value');
            if (brushSizeValue) {
                brushSizeValue.textContent = `${this.lineWidth}px`;
            }
            this._updateContextStyle();
        };

        const handleClearCanvas = () => {
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        };

        try {
            document.querySelectorAll('.tool-btn').forEach(button => {
                button.removeEventListener('click', handleToolButtonClick);
                button.addEventListener('click', handleToolButtonClick);
            });

            const colorPicker = this.window.contentElement.querySelector('#color-picker');
            if (colorPicker) {
                colorPicker.removeEventListener('input', handleColorChange);
                colorPicker.addEventListener('input', handleColorChange);
            }

            const brushSize = this.window.contentElement.querySelector('#brush-size');
            if (brushSize) {
                brushSize.removeEventListener('input', handleBrushSizeChange);
                brushSize.addEventListener('input', handleBrushSizeChange);
            }

            const clearButton = this.window.contentElement.querySelector('#clear-canvas');
            if (clearButton) {
                clearButton.removeEventListener('click', handleClearCanvas);
                clearButton.addEventListener('click', handleClearCanvas);
            }

            if (this.canvas) {
                const canvasEvents = {
                    mousedown: this._boundStartDrawing,
                    mousemove: this._boundDraw,
                    mouseup: this._boundStopDrawing,
                    mouseout: this._boundStopDrawing,
                    touchstart: this._boundHandleTouchStart,
                    touchmove: this._boundHandleTouchMove,
                    touchend: this._boundStopDrawing
                };

                Object.entries(canvasEvents).forEach(([event, handler]) => {
                    this.canvas.removeEventListener(event, handler);
                });

                Object.entries(canvasEvents).forEach(([event, handler]) => {
                    this.canvas.addEventListener(event, handler, { passive: false });
                });
            }
        } catch (error) {
            console.error('Error setting up events:', error);
        }
    }

    _startDrawing(e) {
        if (!this.ctx) return;

        this.isDrawing = true;

        const pos = this._getCanvasCoordinates(e);
        if (!pos) return;

        this.lastX = pos.x;
        this.lastY = pos.y;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);

        this.ctx.arc(this.lastX, this.lastY, this.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
    }

    _getCanvasCoordinates(e) {
        let x, y;
        if (e.touches) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            x = (touch.clientX - rect.left) / rect.width * this.canvas.width;
            y = (touch.clientY - rect.top) / rect.height * this.canvas.height;
            e.preventDefault();
        } else {
            const rect = this.canvas.getBoundingClientRect();
            x = (e.clientX - rect.left) / rect.width * this.canvas.width;
            y = (e.clientY - rect.top) / rect.height * this.canvas.height;
        }

        x = Math.max(0, Math.min(x, this.canvas.width));
        y = Math.max(0, Math.min(y, this.canvas.height));

        return { x, y };
    }

    _draw(e) {
        if (!this.isDrawing || !this.ctx) return;

        const pos = this._getCanvasCoordinates(e);
        if (!pos) return;

        const x = pos.x;
        const y = pos.y;

        const dist = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));

        if (dist > 10) {
            const steps = Math.ceil(dist / 2);
            const stepX = (x - this.lastX) / steps;
            const stepY = (y - this.lastY) / steps;

            for (let i = 0; i < steps; i++) {
                const currentX = this.lastX + stepX * i;
                const currentY = this.lastY + stepY * i;
                this._drawPoint(currentX, currentY);
            }
        } else {
            this._drawPoint(x, y);
        }

        this.lastX = x;
        this.lastY = y;
    }

    _drawPoint(x, y) {
        if (!this.ctx) return;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(x, y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    _updateContextStyle() {
        if (!this.ctx) return;

        if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = 'white';
            this.ctx.fillStyle = 'white';
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    _stopDrawing() {
        this.isDrawing = false;
        if (this.ctx) {
            this.ctx.beginPath();
        }
    }

    _handleTouchStart(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this._startDrawing(mouseEvent);
    }

    _handleTouchMove(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this._draw(mouseEvent);
    }

    cleanup() {
        try {
            cancelAnimationFrame(this._resizeFrame);

            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }

            if (this._windowResizeHandler) {
                if (this.window?.off) {
                    ['resize', 'maximize', 'restore'].forEach(event => {
                        this.window.off(event, this._boundHandleResize);
                    });
                } else if (window.removeEventListener) {
                    window.removeEventListener('resize', this._boundHandleResize);
                }
                this._windowResizeHandler = null;
            }

            if (this.canvas) {
                const events = {
                    mousedown: this._boundStartDrawing,
                    mousemove: this._boundDraw,
                    mouseup: this._boundStopDrawing,
                    mouseout: this._boundStopDrawing,
                    touchstart: this._boundHandleTouchStart,
                    touchmove: this._boundHandleTouchMove,
                    touchend: this._boundStopDrawing
                };

                Object.entries(events).forEach(([event, handler]) => {
                    this.canvas.removeEventListener(event, handler);
                });

                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx = null;
                }

                this.canvas = null;
            }
        } catch (error) {
        }
    }
}
