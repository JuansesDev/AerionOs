// js/apps/DrawingApp.js
import { App } from '../core/App.js';

export class DrawingApp extends App {
    constructor(webOS) {
        super('drawing', 'Paint', 'fas fa-paint-brush', webOS, {
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
        this._boundStartDrawing = (e) => this._startDrawing(e);
        this._boundDraw = (e) => this._draw(e);
        this._boundStopDrawing = () => this._stopDrawing();
        this._boundHandleTouchStart = (e) => this._handleTouchStart(e);
        this._boundHandleTouchMove = (e) => this._handleTouchMove(e);
    }

    // Override renderContent from App class
    renderContent(contentElement, windowInstance, launchOptions) {
        console.log('Inicializando aplicación de dibujo...');
        
        // Store window instance reference
        this.window = windowInstance;
        
        // Set up cleanup before window is closed
        this.window.on('beforeclose', () => this.cleanup());
        
        // Set window content
        contentElement.innerHTML = this._getWindowContent();
        
        // Initialize canvas and event listeners after a short delay to ensure DOM is ready
        setTimeout(async () => {
            try {
                await this._initCanvas();
                this._setupEventListeners();
                console.log('Aplicación de dibujo lista');
            } catch (error) {
                console.error('Error al iniciar la aplicación de dibujo:', error);
            }
        }, 100);
        
        return this.window;
    }

    _getWindowContent() {
        return `
            <div class="drawing-app" style="display: flex; flex-direction: column; height: 100%;">
                <div class="toolbar" style="padding: 8px; background: #f0f0f0; border-bottom: 1px solid #ddd; display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                    <button class="tool-btn active" data-tool="pencil" title="Lápiz">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="tool-btn" data-tool="eraser" title="Borrador">
                        <i class="fas fa-eraser"></i>
                    </button>
                    <input type="color" id="color-picker" value="#000000" title="Color" style="width: 40px; height: 30px; padding: 0; border: 1px solid #999; border-radius: 4px; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <label for="brush-size" style="font-size: 12px;">Tamaño:</label>
                        <input type="range" id="brush-size" min="1" max="50" value="5" title="Tamaño del pincel" style="width: 80px;">
                        <span id="brush-size-value" style="font-size: 12px; width: 30px; text-align: center;">5px</span>
                    </div>
                    <button id="clear-canvas" title="Limpiar lienzo" style="margin-left: auto; padding: 4px 8px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-trash"></i> Limpiar
                    </button>
                </div>
                <div class="canvas-container" style="flex: 1; overflow: hidden; position: relative; background: #f8f8f8; border: 1px solid #ddd;">
                    <canvas id="drawing-canvas" style="display: block; background: white; width: 100%; height: 100%;"></canvas>
                </div>
            </div>
            <style>
                .drawing-app {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #f0f0f0;
                }
                .toolbar {
                    padding: 8px;
                    background: #e0e0e0;
                    border-bottom: 1px solid #ccc;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .tool-btn {
                    padding: 6px 12px;
                    border: 1px solid #999;
                    background: #fff;
                    cursor: pointer;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .tool-btn.active {
                    background: #0078d7;
                    color: white;
                    border-color: #005a9e;
                }
                .tool-btn:hover {
                    background: #e5e5e5;
                }
                .tool-btn.active:hover {
                    background: #106ebe;
                }
                .canvas-container {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }
                #drawing-canvas {
                    background: white;
                    display: block;
                    cursor: crosshair;
                }
                #clear-canvas {
                    margin-left: auto;
                }
            </style>
        `;
    }

    async _initCanvas() {
        if (!this.window || !this.window.contentElement) {
            throw new Error('El contenido de la ventana no está disponible');
        }
        
        // Esperar un momento para asegurar que el DOM esté listo
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Usar el contentElement de la ventana para buscar los elementos
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
        
        // Función para guardar el contenido actual del canvas
        const saveCanvasContent = () => {
            if (!this.canvas || this.canvas.width === 0 || this.canvas.height === 0) {
                return null;
            }
            return this.canvas.toDataURL('image/png');
        };
        
        // Función para restaurar el contenido del canvas
        const restoreCanvasContent = (imageDataUrl, width, height) => {
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
        };
        
        // Función para redimensionar el canvas
        const resizeCanvas = () => {
            if (!this.canvas || !container) return;
            
            // Obtener dimensiones del contenedor
            const rect = container.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const pixelRatio = window.devicePixelRatio || 1;
            
            // Guardar el contenido actual del canvas
            const currentContent = saveCanvasContent();
            
            // Establecer el nuevo tamaño del canvas
            this.canvas.width = Math.floor(width * pixelRatio);
            this.canvas.height = Math.floor(height * pixelRatio);
            
            // Ajustar el tamaño CSS para que coincida con el tamaño lógico
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            
            // Configurar el contexto
            this.ctx.scale(pixelRatio, pixelRatio);
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Restaurar el contenido del canvas
            restoreCanvasContent(currentContent, width, height);
            
            // Aplicar estilos actuales
            this._updateContextStyle();
        };
        
        // Guardar la referencia a la función para poder eliminarla luego
        this._resizeCanvasHandler = resizeCanvas;
        
        // Configurar el redimensionamiento inicial
        resizeCanvas();
        
        // Usar el evento de redimensionamiento de la ventana
        if (this.window.on) {
            // Usar requestAnimationFrame para asegurar que se ejecute después del redimensionamiento
            const handleResize = () => {
                cancelAnimationFrame(this._resizeFrame);
                this._resizeFrame = requestAnimationFrame(() => {
                    resizeCanvas();
                });
            };
            
            // Configurar listeners para diferentes eventos de redimensionamiento
            this.window.on('resize', handleResize);
            this.window.on('maximize', handleResize);
            this.window.on('restore', handleResize);
            
            // Guardar referencia al manejador para poder eliminarlo luego
            this._windowResizeHandler = handleResize;
        } else {
            // Para el caso de que no exista el sistema de eventos de la ventana
            const handleResize = () => {
                cancelAnimationFrame(this._resizeFrame);
                this._resizeFrame = requestAnimationFrame(() => {
                    resizeCanvas();
                });
            };
            
            window.addEventListener('resize', handleResize);
            this._windowResizeHandler = handleResize;
        }
    }

    _setupEventListeners() {
        if (!this.window || !this.window.contentElement) {
            console.error('No se pueden configurar los eventos: elementos del DOM no disponibles');
            return;
        }
        
        try {
            // Botones de herramientas
            const toolButtons = this.window.contentElement.querySelectorAll('.tool-btn');
            toolButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const tool = e.target.dataset.tool || e.target.closest('.tool-btn')?.dataset.tool;
                    if (tool) {
                        this.currentTool = tool;
                        toolButtons.forEach(btn => btn.classList.remove('active'));
                        const target = e.target.classList.contains('tool-btn') ? e.target : e.target.closest('.tool-btn');
                        if (target) target.classList.add('active');
                        
                        // Actualizar el contexto según la herramienta
                        if (this.ctx) {
                            if (this.currentTool === 'eraser') {
                                this.ctx.strokeStyle = 'white';
                                this.ctx.globalCompositeOperation = 'destination-out';
                            } else {
                                this.ctx.strokeStyle = this.currentColor;
                                this.ctx.globalCompositeOperation = 'source-over';
                            }
                        }
                    }
                });
            });
            
            // Selector de color
            const colorPicker = this.window.contentElement.querySelector('#color-picker');
            if (colorPicker) {
                colorPicker.value = this.currentColor;
                colorPicker.addEventListener('input', (e) => {
                    this.currentColor = e.target.value;
                    this._updateContextStyle();
                });
            }
            
            // Control de tamaño de pincel
            const brushSize = this.window.contentElement.querySelector('#brush-size');
            if (brushSize) {
                brushSize.value = this.lineWidth;
                brushSize.addEventListener('input', (e) => {
                    this.lineWidth = parseInt(e.target.value);
                    this._updateContextStyle();
                });
            }
            
            // Botón de limpiar
            const clearButton = this.window.contentElement.querySelector('#clear-canvas');
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                    if (this.ctx && this.canvas) {
                        this.ctx.fillStyle = 'white';
                        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    }
                });
            }
            
            // Eventos del canvas
            if (this.canvas) {
                // Eliminar event listeners existentes para evitar duplicados
                const newCanvas = this.canvas.cloneNode(true);
                this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
                this.canvas = newCanvas;
                this.ctx = this.canvas.getContext('2d');
                
                // Configurar estilos del contexto
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = this.lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                // Añadir event listeners
                this.canvas.addEventListener('mousedown', (e) => this._startDrawing(e));
                this.canvas.addEventListener('mousemove', (e) => this._draw(e));
                this.canvas.addEventListener('mouseup', () => this._stopDrawing());
                this.canvas.addEventListener('mouseout', () => this._stopDrawing());
                
                // Soporte para pantallas táctiles
                this.canvas.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
                this.canvas.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
                this.canvas.addEventListener('touchend', () => this._stopDrawing());
                
                console.log('Eventos del canvas configurados correctamente');
            }
            
            // Configurar el evento de enfoque
            if (this.window.on) {
                this.window.on('focus', () => {
                    if (this.ctx) {
                        this.ctx.strokeStyle = this.currentTool === 'eraser' ? 'white' : this.currentColor;
                        this.ctx.lineWidth = this.lineWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.lineJoin = 'round';
                        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
                    }
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

    _getCanvasCoordinates(e) {
        // Obtener coordenadas del ratón o del toque
        let x, y;
        if (!this.canvas) return null;
        
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

    // Cleanup method to be called before window is closed
    cleanup() {
        console.log('Limpiando recursos de la aplicación de dibujo...');
        
        try {
            // Clean up animation frame
            if (this._resizeFrame) {
                cancelAnimationFrame(this._resizeFrame);
                this._resizeFrame = null;
            }
            
            // Clean up window event listeners
            if (this._windowResizeHandler) {
                if (this.window && this.window.off) {
                    this.window.off('resize', this._windowResizeHandler);
                    this.window.off('maximize', this._windowResizeHandler);
                    this.window.off('restore', this._windowResizeHandler);
                } else if (window.removeEventListener) {
                    window.removeEventListener('resize', this._windowResizeHandler);
                }
                this._windowResizeHandler = null;
            }
            
            // Clean up canvas and its event listeners
            if (this.canvas) {
                this.canvas.removeEventListener('mousedown', this._boundStartDrawing);
                this.canvas.removeEventListener('mousemove', this._boundDraw);
                this.canvas.removeEventListener('mouseup', this._boundStopDrawing);
                this.canvas.removeEventListener('mouseout', this._boundStopDrawing);
                this.canvas.removeEventListener('touchstart', this._boundHandleTouchStart);
                this.canvas.removeEventListener('touchmove', this._boundHandleTouchMove);
                this.canvas.removeEventListener('touchend', this._boundStopDrawing);
                
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
                
                this.ctx = null;
                this.canvas = null;
            }
            
            console.log('Recursos de la aplicación de dibujo limpiados correctamente');
        } catch (error) {
            console.error('Error al limpiar los recursos de la aplicación de dibujo:', error);
        }
    }
}
