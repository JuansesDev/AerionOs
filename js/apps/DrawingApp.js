// js/apps/DrawingApp.js
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
        // Bind de métodos una sola vez en el constructor
        this._boundStartDrawing = this._startDrawing.bind(this);
        this._boundDraw = this._draw.bind(this);
        this._boundStopDrawing = this._stopDrawing.bind(this);
        this._boundHandleTouchStart = this._handleTouchStart.bind(this);
        this._boundHandleTouchMove = this._handleTouchMove.bind(this);
        this._boundHandleResize = this._handleResize.bind(this);
    }

    /**
     * Renderiza el contenido de la aplicación
     * @param {HTMLElement} contentElement - Elemento donde se renderizará el contenido
     * @param {Object} windowInstance - Instancia de la ventana
     * @param {Object} launchOptions - Opciones de inicio
     * @returns {Object} Instancia de la ventana
     */
    renderContent(contentElement, windowInstance, launchOptions) {
        // Almacenar referencia a la ventana
        this.window = windowInstance;
        
        // Configurar limpieza antes de cerrar la ventana
        this.window.on('beforeclose', () => this.cleanup());
        
        // Establecer el contenido HTML
        contentElement.innerHTML = this._getWindowContent();
        
        // Inicializar canvas y event listeners después de un breve retraso
        setTimeout(async () => {
            try {
                await this._initCanvas();
                this._setupEventListeners();
                // Aplicación lista
            } catch (error) {
                // Error al iniciar la aplicación
            }
        }, 100);
        
        return this.window;
    }

/**
     * Genera el contenido HTML de la ventana de la aplicación
     * @returns {string} HTML de la aplicación
     */
    _getWindowContent() {
        // Add link to external CSS file
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'styles/drawing-app.css';
        document.head.appendChild(link);

        return `
            <div class="drawing-app">
                <div class="toolbar">
                    <button class="tool-btn active" data-tool="pencil" title="Lápiz">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="tool-btn" data-tool="eraser" title="Borrador">
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
                        <label for="brush-size">Tamaño:</label>
                        <input 
                            type="range" 
                            id="brush-size" 
                            min="1" 
                            max="50" 
                            value="5" 
                            title="Tamaño del pincel"
                        >
                        <span id="brush-size-value">5px</span>
                    </div>
                    <button id="clear-canvas" title="Limpiar lienzo" class="clear-btn">
                        <i class="fas fa-trash"></i> Limpiar
                    </button>
                </div>
                <div class="canvas-container">
                    <canvas id="drawing-canvas"></canvas>
                </div>
            </div>
        `;
    }

    /**
     * Guarda el contenido actual del canvas
     * @returns {string|null} URL de datos de la imagen o null si no hay contenido
     */
    _saveCanvasContent() {
        if (!this.canvas || this.canvas.width === 0 || this.canvas.height === 0) {
            return null;
        }
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Restaura el contenido del canvas desde una URL de datos
     * @param {string} imageDataUrl - URL de datos de la imagen a restaurar
     * @param {number} width - Ancho del canvas
     * @param {number} height - Alto del canvas
     */
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

    /**
     * Maneja el redimensionamiento del canvas
     */
    _handleResize() {
        if (!this.canvas || !this.canvas.parentElement) return;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Guardar contenido actual
        const currentContent = this._saveCanvasContent();
        
        // Establecer nuevo tamaño
        this.canvas.width = Math.floor(rect.width * pixelRatio);
        this.canvas.height = Math.floor(rect.height * pixelRatio);
        
        // Ajustar tamaño CSS
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        // Configurar contexto
        const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Restaurar contenido
        this._restoreCanvasContent(currentContent, rect.width, rect.height);
        this._updateContextStyle();
    };

    async _initCanvas() {
        if (!this.window?.contentElement) {
            throw new Error('El contenido de la ventana no está disponible');
        }
        
        // Esperar un momento para asegurar que el DOM esté listo
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Obtener referencias a los elementos
        const container = this.window.contentElement.querySelector('.canvas-container');
        this.canvas = this.window.contentElement.querySelector('#drawing-canvas');
        
        if (!this.canvas) {
            throw new Error('No se pudo encontrar el elemento canvas');
        }
        
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        if (!container) {
            throw new Error('No se pudo encontrar el contenedor del canvas');
        }
        
        // Configurar estilos iniciales
        container.style.height = 'calc(100% - 50px)';
        container.style.position = 'relative';
        
        // Función para manejar el redimensionamiento
        const handleResize = () => {
            cancelAnimationFrame(this._resizeFrame);
            this._resizeFrame = requestAnimationFrame(() => this._handleResize());
        };
        
        // Configurar redimensionamiento inicial
        this._handleResize();
        
        // Configurar observador de redimensionamiento
        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(handleResize);
            this._resizeObserver.observe(container);
        } else {
            // Fallback para navegadores sin ResizeObserver
            window.addEventListener('resize', handleResize);
            this._windowResizeHandler = handleResize;
        }
    }

    _setupEventListeners() {
        if (!this.window?.contentElement) {
            console.error('No se pueden configurar los eventos: elementos del DOM no disponibles');
            return;
        }

        // Manejadores de eventos
        const handleToolButtonClick = (e) => {
            const button = e.target.closest('.tool-btn');
            if (!button) return;
            
            const tool = button.dataset.tool;
            if (!tool) return;
            
            // Actualizar herramienta activa
            this.currentTool = tool;
            document.querySelectorAll('.tool-btn').forEach(btn => 
                btn.classList.toggle('active', btn === button)
            );
            
            // Actualizar estilos del contexto
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

        // Configurar event listeners
        try {
            // Botones de herramientas
            document.querySelectorAll('.tool-btn').forEach(button => {
                button.removeEventListener('click', handleToolButtonClick);
                button.addEventListener('click', handleToolButtonClick);
            });

            // Selector de color
            const colorPicker = this.window.contentElement.querySelector('#color-picker');
            if (colorPicker) {
                colorPicker.removeEventListener('input', handleColorChange);
                colorPicker.addEventListener('input', handleColorChange);
            }

            // Control de tamaño de pincel
            const brushSize = this.window.contentElement.querySelector('#brush-size');
            if (brushSize) {
                brushSize.removeEventListener('input', handleBrushSizeChange);
                brushSize.addEventListener('input', handleBrushSizeChange);
            }

            // Botón de limpiar
            const clearButton = this.window.contentElement.querySelector('#clear-canvas');
            if (clearButton) {
                clearButton.removeEventListener('click', handleClearCanvas);
                clearButton.addEventListener('click', handleClearCanvas);
            }

            // Eventos del canvas
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

                // Remover listeners existentes
                Object.entries(canvasEvents).forEach(([event, handler]) => {
                    this.canvas.removeEventListener(event, handler);
                });

                // Agregar nuevos listeners
                Object.entries(canvasEvents).forEach(([event, handler]) => {
                    this.canvas.addEventListener(event, handler, { passive: false });
                });
            }
        } catch (error) {
            console.error('Error al configurar los eventos:', error);
        }
    }

    _startDrawing(e) {
        if (!this.ctx) return;
        
        this.isDrawing = true;
        
        // Obtener coordenadas del ratón o del toque
        const pos = this._getCanvasCoordinates(e);
        if (!pos) return;
        
        // Guardar la posición inicial
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Iniciar un nuevo trazo
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        
        // Dibujar un punto inicial (para cuando solo se hace clic)
        this.ctx.arc(this.lastX, this.lastY, this.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Iniciar el trazo
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
    }
    
    _getCanvasCoordinates(e) {
        // Obtener coordenadas del ratón o del toque
        let x, y;
        if (e.touches) {
            // Para pantallas táctiles
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            x = (touch.clientX - rect.left) / rect.width * this.canvas.width;
            y = (touch.clientY - rect.top) / rect.height * this.canvas.height;
            e.preventDefault();
        } else {
            // Para ratón
            const rect = this.canvas.getBoundingClientRect();
            x = (e.clientX - rect.left) / rect.width * this.canvas.width;
            y = (e.clientY - rect.top) / rect.height * this.canvas.height;
        }
        
        // Asegurarse de que las coordenadas estén dentro de los límites del canvas
        x = Math.max(0, Math.min(x, this.canvas.width));
        y = Math.max(0, Math.min(y, this.canvas.height));
        
        return { x, y };
    }
    
    _draw(e) {
        if (!this.isDrawing || !this.ctx) return;
        
        // Obtener coordenadas actuales
        const pos = this._getCanvasCoordinates(e);
        if (!pos) return;
        
        const x = pos.x;
        const y = pos.y;
        
        // Calcular la distancia desde la última posición
        const dist = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));
        
        // Si la distancia es muy grande, dibujar una línea recta
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
        
        // Actualizar la última posición
        this.lastX = x;
        this.lastY = y;
    }
    
    _drawPoint(x, y) {
        if (!this.ctx) return;
        
        // Dibujar una línea desde la última posición a la actual
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Para líneas más suaves, dibujar un círculo en la posición actual
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Preparar para la siguiente línea
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    _updateContextStyle() {
        if (!this.ctx) return;
        
        // Configurar los estilos según la herramienta actual
        if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = 'white';
            this.ctx.fillStyle = 'white';
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        // Configurar el ancho de línea y otros estilos
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

    /**
     * Limpia los recursos antes de cerrar la ventana
     */
    cleanup() {
        try {
            // Limpiar animation frame
            cancelAnimationFrame(this._resizeFrame);
            
            // Limpiar observador de redimensionamiento
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }
            
            // Limpiar event listeners de la ventana
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
            
            // Limpiar canvas y sus event listeners
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
                
                // Remover event listeners
                Object.entries(events).forEach(([event, handler]) => {
                    this.canvas.removeEventListener(event, handler);
                });
                
                // Limpiar contexto
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx = null;
                }
                
                this.canvas = null;
            }
        } catch (error) {
            // Error silencioso durante la limpieza
        }
    }
}
