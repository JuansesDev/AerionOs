import { App } from '../core/App.js';

export class DrawingApp extends App {
    constructor(webOS) {
        super('drawing', 'AuraSketch', 'fas fa-paint-brush', webOS, {
            window: {
                initialWidth: 900,
                initialHeight: 650,
                minWidth: 560,
                minHeight: 460,
                customClass: 'drawing-app-window'
            },
            allowMultipleInstances: true
        });

        this.windows = new Map();
        this.BASE_CANVAS_WIDTH = 1200;
        this.BASE_CANVAS_HEIGHT = 900;
        this.MAX_HISTORY = 15;
        this.PALETTE = [
            '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
            '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
        ];
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
            lineWidth: 8,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            shapeSnapshot: null,
            undoStack: [],
            redoStack: [],
            resizeObserver: null,
            resizeFrame: null,
            windowResizeHandler: null,
            canvasHandlers: null
        };
        this.windows.set(windowInstance.id, state);

        contentElement.innerHTML = this._getWindowContent();

        windowInstance.on('beforeClose', () => this.cleanup(windowInstance));
        windowInstance.on('close', () => this.windows.delete(windowInstance.id));
        windowInstance.element.addEventListener('keydown', (e) => this._handleKeyDown(e, windowInstance));

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

        const swatches = this.PALETTE.map(c =>
            `<button class="swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`
        ).join('');

        return `
            <div class="drawing-app">
                <div class="toolbar">
                    <div class="tool-group">
                        <button class="tool-btn active" data-tool="pencil" title="Pencil"><i class="fas fa-pencil-alt"></i></button>
                        <button class="tool-btn" data-tool="eraser" title="Eraser"><i class="fas fa-eraser"></i></button>
                        <button class="tool-btn" data-tool="fill" title="Fill"><i class="fas fa-fill-drip"></i></button>
                        <button class="tool-btn" data-tool="line" title="Line"><i class="fas fa-slash"></i></button>
                        <button class="tool-btn" data-tool="rectangle" title="Rectangle"><i class="far fa-square"></i></button>
                        <button class="tool-btn" data-tool="ellipse" title="Ellipse"><i class="far fa-circle"></i></button>
                        <button class="tool-btn" data-tool="picker" title="Eyedropper"><i class="fas fa-eye-dropper"></i></button>
                    </div>
                    <div class="tool-group">
                        <button class="action-btn" data-action="undo" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
                        <button class="action-btn" data-action="redo" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
                    </div>
                    <div class="tool-group brush-sizes">
                        <button class="size-btn" data-size="3" title="Small"><span style="width:4px;height:4px;"></span></button>
                        <button class="size-btn active" data-size="8" title="Medium"><span style="width:9px;height:9px;"></span></button>
                        <button class="size-btn" data-size="18" title="Large"><span style="width:16px;height:16px;"></span></button>
                        <input type="range" id="brush-size" min="1" max="50" value="8">
                        <span id="brush-size-value">8px</span>
                    </div>
                    <div class="tool-group right">
                        <button class="action-btn" data-action="clear" title="Clear"><i class="fas fa-trash"></i></button>
                        <button class="action-btn" data-action="download" title="Download PNG"><i class="fas fa-download"></i></button>
                        <button class="action-btn" data-action="save" title="Save to AerionOS"><i class="fas fa-save"></i></button>
                    </div>
                </div>
                <div class="palette">
                    <div class="swatches">${swatches}</div>
                    <label class="custom-color" title="Custom color">
                        <i class="fas fa-plus"></i>
                        <input type="color" id="color-picker" value="#000000">
                    </label>
                    <span class="current-color-preview" style="background:#000000"></span>
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

        const scale = Math.min(rect.width / this.BASE_CANVAS_WIDTH, rect.height / this.BASE_CANVAS_HEIGHT);
        const scaledWidth = this.BASE_CANVAS_WIDTH * scale;
        const scaledHeight = this.BASE_CANVAS_HEIGHT * scale;

        state.canvas.style.width = `${scaledWidth}px`;
        state.canvas.style.height = `${scaledHeight}px`;
        state.canvas.style.position = 'absolute';
        state.canvas.style.left = `${(rect.width - scaledWidth) / 2}px`;
        state.canvas.style.top = `${(rect.height - scaledHeight) / 2}px`;
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
        if (!container) {
            throw new Error('Could not find the canvas container');
        }

        state.canvas.width = this.BASE_CANVAS_WIDTH;
        state.canvas.height = this.BASE_CANVAS_HEIGHT;
        state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        const handleResize = () => {
            cancelAnimationFrame(state.resizeFrame);
            state.resizeFrame = requestAnimationFrame(() => this._handleResize(windowInstance));
        };

        this._handleResize(windowInstance);

        state.ctx.fillStyle = 'white';
        state.ctx.fillRect(0, 0, this.BASE_CANVAS_WIDTH, this.BASE_CANVAS_HEIGHT);
        this._updateContextStyle(windowInstance);

        if (typeof ResizeObserver === 'function') {
            state.resizeObserver = new ResizeObserver(handleResize);
            state.resizeObserver.observe(container);
        } else {
            state.windowResizeHandler = handleResize;
            window.addEventListener('resize', handleResize);
        }
    }

    _setupEventListeners(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !windowInstance?.contentElement) {
            console.error('Cannot set up events: DOM elements not available');
            return;
        }

        const root = windowInstance.contentElement;

        root.querySelector('.toolbar').addEventListener('click', (e) => {
            const toolBtn = e.target.closest('.tool-btn');
            if (toolBtn) { this._selectTool(windowInstance, toolBtn.dataset.tool); return; }
            const sizeBtn = e.target.closest('.size-btn');
            if (sizeBtn) { this._setBrushSize(windowInstance, parseInt(sizeBtn.dataset.size)); return; }
            const actionBtn = e.target.closest('.action-btn');
            if (actionBtn) { this._handleAction(windowInstance, actionBtn.dataset.action); return; }
        });

        root.querySelector('.swatches').addEventListener('click', (e) => {
            const swatch = e.target.closest('.swatch');
            if (swatch) this._setColor(windowInstance, swatch.dataset.color);
        });

        const colorPicker = root.querySelector('#color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => this._setColor(windowInstance, e.target.value));
        }

        const brushSize = root.querySelector('#brush-size');
        if (brushSize) {
            brushSize.addEventListener('input', (e) => this._setBrushSize(windowInstance, parseInt(e.target.value)));
        }

        if (state.canvas) {
            const handlers = {
                mousedown: (e) => this._onPointerDown(e, windowInstance),
                mousemove: (e) => this._onPointerMove(e, windowInstance),
                mouseup: () => this._onPointerUp(windowInstance),
                mouseout: () => this._onPointerUp(windowInstance),
                touchstart: (e) => this._handleTouchStart(e, windowInstance),
                touchmove: (e) => this._handleTouchMove(e, windowInstance),
                touchend: () => this._onPointerUp(windowInstance)
            };
            state.canvasHandlers = handlers;
            Object.entries(handlers).forEach(([event, handler]) => {
                state.canvas.addEventListener(event, handler, { passive: false });
            });
        }

        this._setColor(windowInstance, state.currentColor);
        this._updateUndoRedoButtons(windowInstance);
    }

    _selectTool(windowInstance, tool) {
        const state = this._state(windowInstance);
        if (!state || !tool) return;
        state.currentTool = tool;
        windowInstance.contentElement.querySelectorAll('.tool-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tool === tool)
        );
        this._updateContextStyle(windowInstance);
    }

    _setColor(windowInstance, color) {
        const state = this._state(windowInstance);
        if (!state || !color) return;
        state.currentColor = color;
        const root = windowInstance.contentElement;
        const picker = root.querySelector('#color-picker');
        if (picker) picker.value = color;
        const preview = root.querySelector('.current-color-preview');
        if (preview) preview.style.background = color;
        root.querySelectorAll('.swatch').forEach(sw =>
            sw.classList.toggle('active', sw.dataset.color.toLowerCase() === color.toLowerCase())
        );
        this._updateContextStyle(windowInstance);
    }

    _setBrushSize(windowInstance, size) {
        const state = this._state(windowInstance);
        if (!state || !size) return;
        state.lineWidth = size;
        const root = windowInstance.contentElement;
        const slider = root.querySelector('#brush-size');
        if (slider) slider.value = size;
        const valueEl = root.querySelector('#brush-size-value');
        if (valueEl) valueEl.textContent = `${size}px`;
        root.querySelectorAll('.size-btn').forEach(btn =>
            btn.classList.toggle('active', parseInt(btn.dataset.size) === size)
        );
        this._updateContextStyle(windowInstance);
    }

    _handleAction(windowInstance, action) {
        switch (action) {
            case 'undo': this._undo(windowInstance); break;
            case 'redo': this._redo(windowInstance); break;
            case 'clear': this._clearCanvas(windowInstance); break;
            case 'download': this._downloadPng(windowInstance); break;
            case 'save': this._saveToPictures(windowInstance); break;
        }
    }

    _handleKeyDown(e, windowInstance) {
        if (!e.ctrlKey && !e.metaKey) return;
        const key = e.key.toLowerCase();
        if (key === 'z') {
            e.preventDefault();
            if (e.shiftKey) this._redo(windowInstance);
            else this._undo(windowInstance);
        } else if (key === 'y') {
            e.preventDefault();
            this._redo(windowInstance);
        }
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
    }

    _getCanvasCoordinates(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.canvas) return null;

        const rect = state.canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches) {
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
            if (e.cancelable) e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let x = (clientX - rect.left) / rect.width * state.canvas.width;
        let y = (clientY - rect.top) / rect.height * state.canvas.height;
        x = Math.max(0, Math.min(x, state.canvas.width));
        y = Math.max(0, Math.min(y, state.canvas.height));
        return { x, y };
    }

    _onPointerDown(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;

        const pos = this._getCanvasCoordinates(e, windowInstance);
        if (!pos) return;

        state.startX = state.lastX = pos.x;
        state.startY = state.lastY = pos.y;

        if (state.currentTool === 'picker') {
            this._pickColor(windowInstance, pos.x, pos.y);
            return;
        }

        this._pushUndo(windowInstance);

        if (state.currentTool === 'fill') {
            this._floodFill(windowInstance, pos.x, pos.y);
            return;
        }

        state.isDrawing = true;

        if (state.currentTool === 'pencil' || state.currentTool === 'eraser') {
            state.ctx.beginPath();
            state.ctx.moveTo(pos.x, pos.y);
            state.ctx.arc(pos.x, pos.y, state.lineWidth / 2, 0, Math.PI * 2);
            state.ctx.fill();
            state.ctx.beginPath();
            state.ctx.moveTo(pos.x, pos.y);
        } else {
            state.shapeSnapshot = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
        }
    }

    _onPointerMove(e, windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.isDrawing || !state.ctx) return;

        const pos = this._getCanvasCoordinates(e, windowInstance);
        if (!pos) return;

        if (state.currentTool === 'pencil' || state.currentTool === 'eraser') {
            const dist = Math.hypot(pos.x - state.lastX, pos.y - state.lastY);
            if (dist > 10) {
                const steps = Math.ceil(dist / 2);
                const stepX = (pos.x - state.lastX) / steps;
                const stepY = (pos.y - state.lastY) / steps;
                for (let i = 0; i < steps; i++) {
                    this._drawPoint(state, state.lastX + stepX * i, state.lastY + stepY * i);
                }
            } else {
                this._drawPoint(state, pos.x, pos.y);
            }
            state.lastX = pos.x;
            state.lastY = pos.y;
        } else if (state.shapeSnapshot) {
            state.ctx.putImageData(state.shapeSnapshot, 0, 0);
            this._drawShape(state, state.currentTool, state.startX, state.startY, pos.x, pos.y);
        }
    }

    _onPointerUp(windowInstance) {
        const state = this._state(windowInstance);
        if (!state) return;
        state.isDrawing = false;
        state.shapeSnapshot = null;
        if (state.ctx) state.ctx.beginPath();
    }

    _drawPoint(state, x, y) {
        if (!state.ctx) return;
        state.ctx.lineTo(x, y);
        state.ctx.stroke();
        state.ctx.beginPath();
        state.ctx.arc(x, y, state.ctx.lineWidth / 2, 0, Math.PI * 2);
        state.ctx.fill();
        state.ctx.beginPath();
        state.ctx.moveTo(x, y);
    }

    _drawShape(state, tool, x0, y0, x1, y1) {
        const ctx = state.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (tool === 'line') {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        } else if (tool === 'rectangle') {
            ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
        } else if (tool === 'ellipse') {
            ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    _hexToRgba(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
    }

    _floodFill(windowInstance, x, y) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;

        const w = state.canvas.width;
        const h = state.canvas.height;
        x = Math.floor(x);
        y = Math.floor(y);

        const image = state.ctx.getImageData(0, 0, w, h);
        const data = image.data;
        const startIdx = (y * w + x) * 4;
        const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
        const fill = this._hexToRgba(state.currentColor);

        const tolerance = 16;
        const matches = (i) =>
            Math.abs(data[i] - target[0]) <= tolerance &&
            Math.abs(data[i + 1] - target[1]) <= tolerance &&
            Math.abs(data[i + 2] - target[2]) <= tolerance &&
            Math.abs(data[i + 3] - target[3]) <= tolerance;

        if (matches((y * w + x) * 4) && this._sameColor(target, fill)) return;

        const stack = [[x, y]];
        while (stack.length) {
            const [cx, cy] = stack.pop();
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
            const i = (cy * w + cx) * 4;
            if (!matches(i)) continue;
            data[i] = fill[0];
            data[i + 1] = fill[1];
            data[i + 2] = fill[2];
            data[i + 3] = fill[3];
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        state.ctx.putImageData(image, 0, 0);
    }

    _sameColor(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }

    _pickColor(windowInstance, x, y) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx) return;
        const p = state.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        this._setColor(windowInstance, hex);
        this._selectTool(windowInstance, 'pencil');
    }

    _pushUndo(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx || !state.canvas) return;
        try {
            state.undoStack.push(state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height));
            if (state.undoStack.length > this.MAX_HISTORY) state.undoStack.shift();
            state.redoStack = [];
        } catch (e) {
        }
        this._updateUndoRedoButtons(windowInstance);
    }

    _undo(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx || state.undoStack.length === 0) return;
        state.redoStack.push(state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height));
        state.ctx.putImageData(state.undoStack.pop(), 0, 0);
        this._updateUndoRedoButtons(windowInstance);
    }

    _redo(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx || state.redoStack.length === 0) return;
        state.undoStack.push(state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height));
        state.ctx.putImageData(state.redoStack.pop(), 0, 0);
        this._updateUndoRedoButtons(windowInstance);
    }

    _updateUndoRedoButtons(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !windowInstance?.contentElement) return;
        const root = windowInstance.contentElement;
        const undoBtn = root.querySelector('[data-action="undo"]');
        const redoBtn = root.querySelector('[data-action="redo"]');
        if (undoBtn) undoBtn.disabled = state.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = state.redoStack.length === 0;
    }

    _clearCanvas(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.ctx || !state.canvas) return;
        this._pushUndo(windowInstance);
        state.ctx.save();
        state.ctx.globalCompositeOperation = 'source-over';
        state.ctx.fillStyle = 'white';
        state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        state.ctx.restore();
    }

    _downloadPng(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.canvas) return;
        const link = document.createElement('a');
        link.download = 'aurasketch.png';
        link.href = state.canvas.toDataURL('image/png');
        link.click();
    }

    async _saveToPictures(windowInstance) {
        const state = this._state(windowInstance);
        if (!state || !state.canvas) return;
        const dataUrl = state.canvas.toDataURL('image/png');
        const path = await this.webOS.modals.showFileSaveDialog('/Pictures/', 'drawing.png', ['.png']);
        if (!path) return;
        const ok = this.webOS.fs.writeFile(path, dataUrl);
        if (ok) {
            this.webOS.modals.showAlert(`Saved to ${path}`, 'Saved', 'fa-check-circle');
        } else {
            this.webOS.modals.showAlert('Could not save the image.', 'Error', 'fa-exclamation-triangle');
        }
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

            state.undoStack = [];
            state.redoStack = [];
            state.shapeSnapshot = null;
            state.ctx = null;
            state.canvas = null;
        } catch (error) {
        }
    }
}
