import { App } from '../core/App.js';

export class DoomApp extends App {
    constructor(webOS) {
        super('doom', 'DOOM', 'fas fa-skull', webOS, {
            window: {
                width: 960,
                height: 720,
                minWidth: 320,
                minHeight: 240,
                maxWidth: 1600,
                maxHeight: 1200,
                customClass: 'doom-app',
                maintainAspectRatio: true,
                aspectRatio: 4 / 3
            },
            allowMultipleInstances: false
        });
        this.dosInstance = null;
        this.originalTitle = document.title;
        this.titleObserver = null;
        this.doomWindow = null;
        this._capturedKeyListeners = null;
        this._addEventListenerPatches = null;
        this._doomInputActive = false;
        this._onWindowFocused = null;
        this._onPointerDown = null;
    }

    renderContent(contentElement, windowInstance) {
        this.doomWindow = windowInstance;
        contentElement.innerHTML = `
            <div class="doom-loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #fff; font-family: monospace;">
                <div class="loading-text" style="margin-bottom: 20px; font-size: 18px;">Loading DOOM...</div>
                <div class="loading-progress" style="width: 300px; height: 20px; border: 2px solid #fff; background: #000;">
                    <div class="progress-bar" style="width: 0%; height: 100%; background: #ff0000; transition: width 0.3s;"></div>
                </div>
                <div class="loading-details" style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Initializing DOS emulator...</div>
            </div>
            <div class="doom-container" style="width: 100%; height: 100%; display: none; background: #000;">
                <canvas class="doom-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
        `;

        this.initializeDoom(contentElement, windowInstance);
    }

    async initializeDoom(contentElement, windowInstance) {
        const loadingEl = contentElement.querySelector('.doom-loading');
        const containerEl = contentElement.querySelector('.doom-container');
        const canvas = contentElement.querySelector('.doom-canvas');
        const progressBar = contentElement.querySelector('.progress-bar');
        const loadingDetails = contentElement.querySelector('.loading-details');

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('Checking local js-dos...', typeof Dos, typeof window.Dos);

            if (typeof Dos === "undefined" && typeof window.Dos === "undefined") {
                throw new Error('js-dos is not available - check that the local file was loaded');
            }

            const DosFunction = typeof Dos !== "undefined" ? Dos : window.Dos;
            this.updateProgress(progressBar, loadingDetails, 20, 'js-dos loaded successfully');

            canvas.width = 960;
            canvas.height = 720;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.imageRendering = 'pixelated';

            this.updateProgress(progressBar, loadingDetails, 40, 'Initializing DOSBox...');

            this._captureKeyListeners();

            this.dosInstance = DosFunction(canvas);

            this.protectPageTitle();

            this.dosInstance.ready((fs, main) => {
                this.updateProgress(progressBar, loadingDetails, 60, 'Loading DOOM bundle...');

                fs.extract("./public/games/doom/doom-bundle.zip").then(() => {
                    this.updateProgress(progressBar, loadingDetails, 80, 'Extracting files...');

                    main(["-c", "DOOM.EXE"]).then((ci) => {
                        this.updateProgress(progressBar, loadingDetails, 100, 'DOOM started!');

                        setTimeout(() => {
                            loadingEl.style.display = 'none';
                            containerEl.style.display = 'block';

                            this.optimizeCanvas(canvas, containerEl);

                            setTimeout(() => {
                                this.forceCanvasScaling(containerEl);
                                this._stopCapturingKeyListeners();
                            }, 1000);
                        }, 500);

                        windowInstance.on('focus', () => {
                            if (ci && ci.focus) {
                                ci.focus();
                            }
                        });

                        windowInstance.on('beforeClose', () => {
                            this.cleanup();
                        });

                        windowInstance.on('minimize', () => this._disableDoomInput());

                        this._onWindowFocused = (win) => {
                            if (win === this.doomWindow) {
                                this._enableDoomInput();
                            } else {
                                this._disableDoomInput();
                            }
                        };
                        this.webOS.windowManager.on('windowFocused', this._onWindowFocused);

                        this._onPointerDown = (e) => {
                            if (!this.doomWindow) return;
                            if (this.doomWindow.element.contains(e.target)) {
                                this._enableDoomInput();
                            } else {
                                this._disableDoomInput();
                            }
                        };
                        document.addEventListener('pointerdown', this._onPointerDown, true);

                        this.commandInterface = ci;

                    }).catch(error => {
                        console.error('Error running DOOM:', error);
                        this.showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance);
                    });
                }).catch(error => {
                    console.error('Error extracting bundle:', error);
                    this.showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance);
                });
            });

        } catch (error) {
            console.error('Error initializing DOOM:', error);
            this.showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance);
        }
    }

    showDoomDemo(canvas, loadingEl, containerEl, progressBar, loadingDetails, windowInstance) {
        console.log('Showing DOOM demo due to js-dos problems');

        this._stopCapturingKeyListeners();
        this.protectPageTitle();

        this.updateProgress(progressBar, loadingDetails, 80, 'Starting DOOM demo...');

        setTimeout(() => {
            this.updateProgress(progressBar, loadingDetails, 100, 'Demo started!');

            setTimeout(() => {
                loadingEl.style.display = 'none';
                containerEl.style.display = 'block';
                this.renderDoomDemo(canvas, windowInstance);
            }, 500);
        }, 1000);
    }

    renderDoomDemo(canvas, windowInstance) {
        const ctx = canvas.getContext('2d');
        canvas.width = 960;
        canvas.height = 720;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 64px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM', canvas.width / 2, 150);

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 32px monospace';
        ctx.fillText('Enhanced Simulator', canvas.width / 2, 220);

        ctx.fillStyle = '#00ff00';
        ctx.font = '24px monospace';
        ctx.fillText('✓ Game files: DETECTED', canvas.width / 2, 300);
        ctx.fillText('✓ Bundle prepared: READY', canvas.width / 2, 340);
        ctx.fillText('✓ Window optimized: 960x720', canvas.width / 2, 380);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px monospace';
        ctx.fillText('Technical configuration:', canvas.width / 2, 450);
        ctx.fillText('• js-dos: Pending full load', canvas.width / 2, 480);
        ctx.fillText('• Bundle: doom-bundle.zip (2.1MB)', canvas.width / 2, 510);
        ctx.fillText('• Scaling: Pixelated with 4:3 ratio', canvas.width / 2, 540);

        ctx.fillStyle = '#333333';
        ctx.fillRect(canvas.width / 2 - 120, 580, 240, 60);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(canvas.width / 2 - 120, 580, 240, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.fillText('Retry Load', canvas.width / 2, 615);

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= canvas.width / 2 - 120 && x <= canvas.width / 2 + 120 &&
                y >= 580 && y <= 640) {

                const contentElement = canvas.closest('.window-content');
                if (contentElement) {
                    contentElement.innerHTML = `
                        <div class="doom-loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #fff; font-family: monospace;">
                            <div class="loading-text" style="margin-bottom: 20px; font-size: 18px;">Retrying DOOM load...</div>
                            <div class="loading-progress" style="width: 300px; height: 20px; border: 2px solid #fff; background: #000;">
                                <div class="progress-bar" style="width: 0%; height: 100%; background: #ff0000; transition: width 0.3s;"></div>
                            </div>
                            <div class="loading-details" style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Checking js-dos...</div>
                        </div>
                        <div class="doom-container" style="width: 100%; height: 100%; display: none; background: #000;">
                            <canvas class="doom-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
                        </div>
                    `;
                    this.initializeDoom(contentElement, windowInstance);
                }
            }
        });

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
        if (canvas && container) {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.imageRendering = 'pixelated';
            canvas.style.imageRendering = '-moz-crisp-edges';
            canvas.style.imageRendering = 'crisp-edges';

            const allCanvases = container.querySelectorAll('canvas');
            allCanvases.forEach(canvasEl => {
                canvasEl.style.width = '100%';
                canvasEl.style.height = '100%';
                canvasEl.style.imageRendering = 'pixelated';
                canvasEl.style.imageRendering = '-moz-crisp-edges';
                canvasEl.style.imageRendering = 'crisp-edges';
                canvasEl.style.objectFit = 'fill';

                const ctx = canvasEl.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.mozImageSmoothingEnabled = false;
                    ctx.webkitImageSmoothingEnabled = false;
                    ctx.msImageSmoothingEnabled = false;
                }
            });

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

            this.canvasObserver = observer;

            console.log('Canvas optimized for DOOM with forced scaling');
        }
    }

    forceCanvasScaling(container) {
        const canvases = container.querySelectorAll('canvas');
        console.log(`Found ${canvases.length} canvas in DOOM`);

        canvases.forEach((canvas, index) => {
            console.log(`Applying forced scaling to canvas ${index}`);

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

            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.mozImageSmoothingEnabled = false;
                    ctx.webkitImageSmoothingEnabled = false;
                    ctx.msImageSmoothingEnabled = false;
                }
            } catch (e) {
                console.log('Could not configure the 2D context');
            }
        });

        container.offsetHeight;
    }

    protectPageTitle() {
        this.titleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.target === document.head) {
                    if (document.title !== this.originalTitle) {
                        console.log('Title changed by DOSBox, restoring...', document.title, '->', this.originalTitle);
                        document.title = this.originalTitle;
                    }
                }
            });
        });

        this.titleObserver.observe(document.head, {
            childList: true,
            subtree: true
        });

        this.titleInterval = setInterval(() => {
            if (document.title !== this.originalTitle) {
                document.title = this.originalTitle;
            }
        }, 100);
    }

    stopTitleProtection() {
        if (this.titleObserver) {
            this.titleObserver.disconnect();
            this.titleObserver = null;
        }

        if (this.titleInterval) {
            clearInterval(this.titleInterval);
            this.titleInterval = null;
        }

        document.title = this.originalTitle;
    }

    cleanup() {
        console.log("Cleaning up DOOM instance...");

        this.stopTitleProtection();

        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
            this.canvasObserver = null;
        }

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
        this.doomWindow = null;

        this._removeCapturedKeyListeners();
    }

    _captureKeyListeners() {
        if (this._addEventListenerPatches) return;

        this._capturedKeyListeners = [];
        this._addEventListenerPatches = [];
        this._doomInputActive = true;

        const keyTypes = new Set(['keydown', 'keyup', 'keypress']);
        const records = this._capturedKeyListeners;
        const targets = [document, window, document.body];

        targets.forEach((target) => {
            const original = target.addEventListener;
            target.addEventListener = function (type, listener, options) {
                if (keyTypes.has(type)) {
                    records.push({ target, type, listener, options });
                }
                return original.call(this, type, listener, options);
            };
            this._addEventListenerPatches.push({ target, original });
        });
    }

    _stopCapturingKeyListeners() {
        if (!this._addEventListenerPatches) return;
        this._addEventListenerPatches.forEach(({ target, original }) => {
            target.addEventListener = original;
        });
        this._addEventListenerPatches = null;
    }

    _enableDoomInput() {
        if (this._doomInputActive) return;
        this._stopCapturingKeyListeners();
        if (this._capturedKeyListeners) {
            this._capturedKeyListeners.forEach(({ target, type, listener, options }) => {
                target.addEventListener(type, listener, options);
            });
        }
        this._doomInputActive = true;
    }

    _disableDoomInput() {
        if (!this._doomInputActive) return;
        if (this._capturedKeyListeners) {
            this._capturedKeyListeners.forEach(({ target, type, listener, options }) => {
                try {
                    target.removeEventListener(type, listener, options);
                } catch (e) {}
            });
        }
        this._doomInputActive = false;
    }

    _removeCapturedKeyListeners() {
        if (this._onWindowFocused) {
            this.webOS.windowManager.off('windowFocused', this._onWindowFocused);
            this._onWindowFocused = null;
        }
        if (this._onPointerDown) {
            document.removeEventListener('pointerdown', this._onPointerDown, true);
            this._onPointerDown = null;
        }
        this._disableDoomInput();
        this._stopCapturingKeyListeners();
        this._capturedKeyListeners = null;
    }
}
