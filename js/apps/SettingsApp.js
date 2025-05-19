// js/apps/SettingsApp.js
import { App } from '../core/App.js';

export class SettingsApp extends App {
     constructor(webOS) {
        super('settings', 'Ajustes', 'fas fa-cog', webOS, {
            window: { width: 600, height: 450, minWidth:500, minHeight:400, customClass: 'settings-app' }
        });
    }
    renderContent(contentElement, windowInstance, launchOptions) {
        const currentUsername = this.webOS.userSession.getCurrentUsername();
        const currentWallpaper = this.webOS.userSession.getUserSetting('wallpaper') || '';

        contentElement.innerHTML = `
            <div class="settings-content">
                <div class="settings-category">
                    <h3><i class="fas fa-user-circle"></i> Cuenta de Usuario</h3>
                    <div class="setting-item">
                        <label>Nombre de Usuario:</label>
                        <span>${currentUsername}</span>
                    </div>
                     <div class="setting-item">
                        <label></label> <!-- Empty label for alignment -->
                        <button data-action="logout" style="background-color: var(--error-color); color:white;">Cerrar Sesión</button>
                    </div>
                </div>
                <div class="settings-category">
                    <h3><i class="fas fa-palette"></i> Apariencia</h3>
                    <div class="setting-item">
                        <label for="wallpaper-url-input">Fondo de Escritorio (URL):</label>
                        <input type="text" id="wallpaper-url-input" value="${currentWallpaper}" placeholder="https://ejemplo.com/imagen.jpg" spellcheck="false">
                    </div>
                     <div class="setting-item">
                        <label></label>
                        <div>
                            <button data-action="apply-wallpaper">Aplicar Fondo</button>
                            <button data-action="reset-wallpaper" style="margin-left:10px;">Restablecer Predeterminado</button>
                        </div>
                    </div>
                    <div class="setting-item wallpaper-gallery-container">
                        <label>Galería de Fondos:</label>
                        <div class="wallpaper-gallery">
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747688882/default_background_kocr6r.png" alt="Fondo Predeterminado Actual">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490562/w0_Jr_Yx5bj_At_Uxp1_Gqs_ZV_0_3a55c9680d.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490562/w0_Jr_Yx5bj_At_Uxp1_Gqs_ZV_0_3a55c9680d.png" alt="Fondo Clásico">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png" alt="Fondo 1">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png" alt="Fondo 2">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png" alt="Fondo 3">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png" alt="Fondo 4">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png" alt="Fondo 5">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png" alt="Fondo 6">
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label>Tema (Próximamente):</label>
                        <select disabled><option>Oscuro (Actual)</option><option>Claro</option></select>
                    </div>
                </div>
                <div class="settings-category">
                    <h3><i class="fas fa-info-circle"></i> Acerca de AuraOS</h3>
                    <p><strong>AuraOS - Portfolio Edition</strong> v0.4</p>
                    <p>Un simulador de sistema operativo web creado con HTML, CSS y JavaScript modular.</p>
                    <p>© ${new Date().getFullYear()} JuansesDev</p>
                    <div class="setting-item">
                        <button data-action="system-info">Más información</button>
                    </div>
                </div>
            </div>
        `;

        const wallpaperInput = contentElement.querySelector('#wallpaper-url-input');

        contentElement.querySelector('[data-action="logout"]').addEventListener('click', () => {
            if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
                this.webOS.userSession.logout();
                // No es necesario cerrar la ventana aquí, _onLogout en WebOS se encargará
            }
        });
        contentElement.querySelector('[data-action="apply-wallpaper"]').addEventListener('click', () => {
            const url = wallpaperInput.value.trim();
            if (url) {
                this.webOS.desktop.setWallpaper(url); // Esto también guarda en userSession
            } else {
                alert("Por favor, ingresa una URL para el fondo de escritorio.");
            }
        });
        contentElement.querySelector('[data-action="reset-wallpaper"]').addEventListener('click', () => {
            wallpaperInput.value = ''; // Clear input
            this.webOS.desktop.setWallpaper(''); // Pass empty string to reset
        });

        // Agregar eventos para la galería de fondos
        contentElement.querySelectorAll('.wallpaper-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    // Actualizar la URL en el input
                    wallpaperInput.value = url;
                    // Aplicar el fondo inmediatamente
                    this.webOS.desktop.setWallpaper(url);

                    // Resaltar elemento seleccionado
                    contentElement.querySelectorAll('.wallpaper-item').forEach(el => {
                        el.classList.remove('selected');
                    });
                    item.classList.add('selected');
                }
            });
        });

        // Después de renderizar el contenido y antes de adjuntar eventos:
        // Marcar el wallpaper actual como seleccionado en la galería
        setTimeout(() => {
            const wallpaperItems = contentElement.querySelectorAll('.wallpaper-item');
            wallpaperItems.forEach(item => {
                if (item.dataset.url === currentWallpaper) {
                    item.classList.add('selected');
                }
            });
        }, 50);

        // Agregar el event listener para el botón de información
        const systemInfoButton = contentElement.querySelector('[data-action="system-info"]');
        if (systemInfoButton) {
            systemInfoButton.addEventListener('click', () => {
                const windowId = 'about-auraos-settings'; // ID único para la ventana

                // Comprobar si la ventana ya está abierta
                const existingWindow = this.webOS.windowManager.getWindow(windowId);
                if (existingWindow) {
                    // Si ya está abierta, solo la enfocamos
                    existingWindow.bringToFront();
                    return;
                }

                // 1. Crear la ventana usando la misma configuración que en Desktop.js
                const aboutWindow = this.webOS.windowManager.createWindow(
                    windowId,
                    'Acerca de AuraOS',      // Título
                    'fas fa-info-circle',    // Icono
                    { // Opciones de la ventana (tamaño, etc.)
                        width: 420, // Un poco más ancho para el contenido
                        height: 320, // Un poco más alto
                        minWidth: 350,
                        minHeight: 280,
                        customClass: 'about-window-theme' // Para posible estilo específico
                    }
                );

                // 2. Definir el contenido HTML usando el mismo formato que en Desktop.js
                const aboutContentHTML = `
                    <div style="padding: 20px; line-height: 1.6; color: var(--text-color); font-family: var(--font-family);">
                        <h3 style="margin-bottom: 15px; color: var(--accent-color); text-align: center; font-size: 1.6em; font-weight: 500;">
                            <i class="fab fa-linux" style="margin-right: 8px;"></i>AuraOS
                        </h3>
                        <p style="text-align: center; font-size: 0.95em; margin-bottom: 10px;">Versión 0.5 (Portfolio Edition)</p>
                        <p style="text-align: center; margin-bottom: 15px;">
                            Desarrollado por: <strong style="color: var(--accent-color-hover);">JuansesDev</strong>
                        </p>
                        <p style="font-size: 0.9em; margin-bottom:8px;">
                            AuraOS es un simulador de sistema operativo web interactivo,
                            diseñado para demostrar habilidades en desarrollo front-end
                            utilizando HTML, CSS y JavaScript modular.
                        </p>
                        <p style="font-size:0.9em;margin-top:10px;">
                            Imágenes de fondo por defecto proporcionadas por
                            <a href="https://pixeldreamsgallery.me/" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color);text-decoration:none;">Pixel Dreams Gallery</a> y otras fuentes.
                        </p>
                        <p style="text-align:center;margin-top:25px;font-size:0.85em;color:var(--text-color-darker);">
                            © ${new Date().getFullYear()} JuansesDev.
                        </p>
                    </div>
                `.trim();

                // 3. Establecer el contenido en la ventana creada
                if (aboutWindow) {
                    aboutWindow.setContent(aboutContentHTML);
                } else {
                    console.error("No se pudo crear la ventana 'Acerca de AuraOS'");
                }
            });
        }
    }
}