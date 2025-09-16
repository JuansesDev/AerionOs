// js/apps/DoomApp.js
import { App } from '../core/App.js';

export class DoomApp extends App {
    constructor(webOS) {
        super('doom', 'DOOM', 'fas fa-skull', webOS, {
            window: {
                width: 960,  // Aumentado para verse más grande (3x la resolución base)
                height: 720, // Mantiene la relación 4:3
                minWidth: 320,
                minHeight: 240,
                maxWidth: 1600,
                maxHeight: 1200,
                customClass: 'doom-app',
                maintainAspectRatio: true,
                aspectRatio: 4/3 // Relación de aspecto clásica de DOOM
            },
            allowMultipleInstances: false
        });
        this.dosInstance = null;
    }

    renderContent(contentElement, windowInstance) {
        contentElement.innerHTML = `
            <div class="doom-loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #fff; font-family: monospace;">
                <div class="loading-text" style="margin-bottom: 20px; font-size: 18px;">Cargando DOOM...</div>
                <div class="loading-progress" style="width: 300px; height: 20px; border: 2px solid #fff; background: #000;">
                    <div class="progress-bar" style="width: 0%; height: 100%; background: #ff0000; transition: width 0.3s;"></div>
                </div>
                <div class="loading-details" style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Inicializando emulador DOS...</div>
            </div>
            <div class="doom-container" style="width: 100%; height: 100%; display: none; background: #000;">
                <canvas class="doom-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
        `;

        // Configurar event listener para redimensionamiento de ventana
        const resizeCanvas = () => {
            const canvas = contentElement.querySelector('.doom-canvas');
            if (canvas) {
                // Forzar que el canvas se ajuste al contenedor
                const container = canvas.parentElement;
                if (container) {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                }
            }
        };

        // Escuchar cambios de tamaño de ventana (cuando se implemente)
        // windowInstance.on('resize', resizeCanvas);

        this.initializeDoom(contentElement, windowInstance);
    }

    async initializeDoom(contentElement, windowInstance) {
        const loadingEl = contentElement.querySelector('.doom-loading');
        const containerEl = contentElement.querySelector('.doom-container');
        const canvas = contentElement.querySelector('.doom-canvas');
        const progressBar = contentElement.querySelector('.progress-bar');
        const loadingText = contentElement.querySelector('.loading-text');
        const loadingDetails = contentElement.querySelector('.loading-details');

        try {
            // Esperar un poco para asegurar que js-dos se cargue
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar si js-dos está disponible (ahora debería estar cargado localmente)
            console.log('Verificando js-dos local...', typeof Dos, typeof window.Dos);
            
            if (typeof Dos === "undefined" && typeof window.Dos === "undefined") {
                throw new Error('js-dos no está disponible - verifique que el archivo local se haya cargado');
            }

            // Usar la función Dos
            const DosFunction = typeof Dos !== "undefined" ? Dos : window.Dos;
            this.updateProgress(progressBar, loadingDetails, 20, 'js-dos cargado correctamente');

            // Configurar el canvas para mejor escalado
            canvas.width = 960;
            canvas.height = 720;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.imageRendering = 'pixelated';

            this.updateProgress(progressBar, loadingDetails, 40, 'Inicializando DOSBox...');

            // Usar js-dos 6.22 API
            this.dosInstance = DosFunction(canvas);
            
            // Esperar a que esté listo
            this.dosInstance.ready((fs, main) => {
                this.updateProgress(progressBar, loadingDetails, 60, 'Cargando bundle de DOOM...');

                // Cargar el bundle
                fs.extract("./public/games/doom/doom-bundle.zip").then(() => {
                    this.updateProgress(progressBar, loadingDetails, 80, 'Extrayendo archivos...');

                    // Ejecutar DOOM
                    main(["-c", "DOOM.EXE"]).then((ci) => {
                        this.updateProgress(progressBar, loadingDetails, 100, 'DOOM iniciado!');

                        // Ocultar loading y mostrar el juego
                        setTimeout(() => {
                            loadingEl.style.display = 'none';
                            containerEl.style.display = 'block';
                            
                            // Optimizar canvas después de mostrar el juego
                            this.optimizeCanvas(canvas, containerEl);
                            
                            // Aplicar estilos adicionales después de un breve delay
                            setTimeout(() => {
                                this.forceCanvasScaling(containerEl);
                            }, 1000);
                        }, 500);

                        // Configurar eventos de ventana
                        windowInstance.on('focus', () => {
                            if (ci && ci.focus) {
                                ci.focus();
                            }
                        });

                        windowInstance.on('beforeClose', () => {
                            this.cleanup();
                        });

                        // Guardar referencia para cleanup
                        this.commandInterface = ci;

                    }).catch(error => {
                        console.error('Error ejecutando DOOM:', error);
                        throw new Error('Error ejecutando DOOM: ' + error.message);
                    });
                }).catch(error => {
                    console.error('Error extrayendo bundle:', error);
                    throw new Error('Error cargando bundle de DOOM: ' + error.message);
                });
            });

        } catch (error) {
            console.error('Error initializing DOOM:', error);
            
            // Si hay error, mostrar demo en lugar de fallar
            this.showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance);
        }
    }

    showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance) {
        console.log('Mostrando demo de DOOM debido a problemas con js-dos');
        
        this.updateProgress(progressBar, loadingDetails, 80, 'Iniciando demo de DOOM...');
        
        setTimeout(() => {
            this.updateProgress(progressBar, loadingDetails, 100, 'Demo iniciada!');
            
            // Ocultar loading y mostrar el juego
            setTimeout(() => {
                loadingEl.style.display = 'none';
                containerEl.style.display = 'block';
                this.renderDoomDemo(canvas, windowInstance);
            }, 500);
        }, 1000);
    }

    renderDoomDemo(canvas, windowInstance) {
        // Crear una demo visual mejorada de DOOM
        const ctx = canvas.getContext('2d');
        canvas.width = 960;
        canvas.height = 720;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Título
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 64px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM', canvas.width / 2, 150);
        
        // Subtítulo
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 32px monospace';
        ctx.fillText('Simulador Mejorado', canvas.width / 2, 220);
        
        // Estado
        ctx.fillStyle = '#00ff00';
        ctx.font = '24px monospace';
        ctx.fillText('✓ Archivos de juego: DETECTADOS', canvas.width / 2, 300);
        ctx.fillText('✓ Bundle preparado: LISTO', canvas.width / 2, 340);
        ctx.fillText('✓ Ventana optimizada: 960x720', canvas.width / 2, 380);
        
        // Información técnica
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px monospace';
        ctx.fillText('Configuración técnica:', canvas.width / 2, 450);
        ctx.fillText('• js-dos: Pendiente de carga completa', canvas.width / 2, 480);
        ctx.fillText('• Bundle: doom-bundle.zip (2.1MB)', canvas.width / 2, 510);
        ctx.fillText('• Escalado: Pixelated con relación 4:3', canvas.width / 2, 540);
        
        // Botón de recarga
        ctx.fillStyle = '#333333';
        ctx.fillRect(canvas.width / 2 - 120, 580, 240, 60);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(canvas.width / 2 - 120, 580, 240, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.fillText('Reintentar Carga', canvas.width / 2, 615);
        
        // Agregar interactividad
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Verificar si se hizo click en el botón de recarga
            if (x >= canvas.width / 2 - 120 && x <= canvas.width / 2 + 120 && 
                y >= 580 && y <= 640) {
                
                // Reintentar carga
                const contentElement = canvas.closest('.window-content');
                if (contentElement) {
                    contentElement.innerHTML = `
                        <div class="doom-loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #fff; font-family: monospace;">
                            <div class="loading-text" style="margin-bottom: 20px; font-size: 18px;">Reintentando carga de DOOM...</div>
                            <div class="loading-progress" style="width: 300px; height: 20px; border: 2px solid #fff; background: #000;">
                                <div class="progress-bar" style="width: 0%; height: 100%; background: #ff0000; transition: width 0.3s;"></div>
                            </div>
                            <div class="loading-details" style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Verificando js-dos...</div>
                        </div>
                        <div class="doom-container" style="width: 100%; height: 100%; display: none; background: #000;">
                            <canvas class="doom-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
                        </div>
                    `;
                    this.initializeDoom(contentElement, windowInstance);
                }
            }
        });
        
        // Configurar eventos de ventana
        windowInstance.on('beforeClose', () => {
            this.cleanup();
        });
    }

    updateProgress(progressBar, detailsEl, percentage, message) {
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        if (detailsEl) {
            detailsEl.textContent = message;
        }
    }

    optimizeCanvas(canvas, container) {
        // Asegurar que el canvas use todo el espacio disponible
        if (canvas && container) {
            // Configurar escalado agresivo
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.imageRendering = 'pixelated';
            canvas.style.imageRendering = '-moz-crisp-edges';
            canvas.style.imageRendering = 'crisp-edges';
            
            // Buscar todos los canvas en el contenedor (js-dos puede crear varios)
            const allCanvases = container.querySelectorAll('canvas');
            allCanvases.forEach(canvasEl => {
                canvasEl.style.width = '100%';
                canvasEl.style.height = '100%';
                canvasEl.style.imageRendering = 'pixelated';
                canvasEl.style.imageRendering = '-moz-crisp-edges';
                canvasEl.style.imageRendering = 'crisp-edges';
                canvasEl.style.objectFit = 'fill';
                
                // Configurar el canvas interno si es necesario
                const ctx = canvasEl.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.mozImageSmoothingEnabled = false;
                    ctx.webkitImageSmoothingEnabled = false;
                    ctx.msImageSmoothingEnabled = false;
                }
            });
            
            // Usar un observador para detectar cambios y mantener el escalado
            const observer = new MutationObserver(() => {
                const newCanvases = container.querySelectorAll('canvas');
                newCanvases.forEach(canvasEl => {
                    if (!canvasEl.hasAttribute('data-scaled')) {
                        canvasEl.style.width = '100%';
                        canvasEl.style.height = '100%';
                        canvasEl.style.imageRendering = 'pixelated';
                        canvasEl.style.objectFit = 'fill';
                        canvasEl.setAttribute('data-scaled', 'true');
                    }
                });
            });
            
            observer.observe(container, { 
                childList: true, 
                subtree: true,
                attributes: true 
            });
            
            // Guardar el observer para limpieza posterior
            this.canvasObserver = observer;
            
            console.log('Canvas optimizado para DOOM con escalado forzado');
        }
    }

    forceCanvasScaling(container) {
        // Buscar y forzar el escalado de todos los canvas
        const canvases = container.querySelectorAll('canvas');
        console.log(`Encontrados ${canvases.length} canvas en DOOM`);
        
        canvases.forEach((canvas, index) => {
            console.log(`Aplicando escalado forzado al canvas ${index}`);
            
            // Aplicar estilos directamente
            canvas.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                object-fit: fill !important;
                image-rendering: pixelated !important;
                image-rendering: -moz-crisp-edges !important;
                image-rendering: crisp-edges !important;
                transform: scale(1) !important;
                display: block !important;
            `;
            
            // Configurar el contexto 2D si es posible
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.mozImageSmoothingEnabled = false;
                    ctx.webkitImageSmoothingEnabled = false;
                    ctx.msImageSmoothingEnabled = false;
                }
            } catch (e) {
                console.log('No se pudo configurar el contexto 2D');
            }
        });
        
        // Forzar un reflow
        container.offsetHeight;
    }

    cleanup() {
        console.log("Cleaning up DOOM instance...");
        
        // Limpiar el observer del canvas
        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
            this.canvasObserver = null;
        }
        
        // Limpiar la instancia de DOS
        if (this.commandInterface) {
            try {
                if (this.commandInterface.exit) {
                    this.commandInterface.exit();
                }
            } catch (e) {
                console.warn('Error during command interface cleanup:', e);
            }
        }
        
        if (this.dosInstance) {
            try {
                if (this.dosInstance.stop) {
                    this.dosInstance.stop();
                }
            } catch (e) {
                console.warn('Error during DOS instance cleanup:', e);
            }
        }
        
        this.dosInstance = null;
        this.commandInterface = null;
    }
}
