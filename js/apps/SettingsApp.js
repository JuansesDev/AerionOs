import { App } from '../core/App.js';

export class SettingsApp extends App {
     constructor(webOS) {
        super('settings', 'Settings', 'fas fa-cog', webOS, {
            window: { width: 600, height: 450, minWidth:500, minHeight:400, customClass: 'settings-app' }
        });
    }
    renderContent(contentElement, windowInstance, launchOptions) {
        const currentUsername = this.webOS.userSession.getCurrentUsername();
        const currentWallpaper = this.webOS.userSession.getUserSetting('wallpaper') || '';

        contentElement.innerHTML = `
            <div class="settings-content">
                <div class="settings-category">
                    <h3><i class="fas fa-user-circle"></i> User Account</h3>
                    <div class="setting-item">
                        <label>Username:</label>
                        <span>${currentUsername}</span>
                    </div>
                     <div class="setting-item">
                        <label></label>
                        <button data-action="logout" style="background-color: var(--error-color); color:white;">Log Out</button>
                    </div>
                </div>
                <div class="settings-category">
                    <h3><i class="fas fa-palette"></i> Appearance</h3>
                    <div class="setting-item">
                        <label for="wallpaper-url-input">Desktop Wallpaper (URL):</label>
                        <input type="text" id="wallpaper-url-input" value="${currentWallpaper}" placeholder="https://example.com/image.jpg" spellcheck="false">
                    </div>
                     <div class="setting-item">
                        <label></label>
                        <div>
                            <button data-action="apply-wallpaper">Apply Wallpaper</button>
                            <button data-action="reset-wallpaper" style="margin-left:10px;">Reset to Default</button>
                        </div>
                    </div>
                    <div class="setting-item wallpaper-gallery-container">
                        <label>Wallpaper Gallery:</label>
                        <div class="wallpaper-gallery">
                            <div class="wallpaper-item" data-url="public/AerionOs.png">
                                <img src="public/AerionOs.png" alt="AerionOS Wallpaper">
                            </div>
                            <div class="wallpaper-item" data-url="public/AerionOs2.png">
                                <img src="public/AerionOs2.png" alt="AerionOS Wallpaper 2">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490562/w0_Jr_Yx5bj_At_Uxp1_Gqs_ZV_0_3a55c9680d.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490562/w0_Jr_Yx5bj_At_Uxp1_Gqs_ZV_0_3a55c9680d.png" alt="Classic Wallpaper">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490600/S_Tkg_Q9ogx_Ys1w5m_Dty_Kv_0_68f90f509a.png" alt="Wallpaper 1">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490358/image_fx_2_4935fd865d.png" alt="Wallpaper 2">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740490093/C_Vtm_Qahen_Sdl_Vb84e_O_Bk_0_abe292d8d5.png" alt="Wallpaper 3">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489961/b_HZ_5jj_Njf_Y3s_F_Lkcrtl_G_0_8ab25f29ad.png" alt="Wallpaper 4">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740489621/GM_Tky_Qd_Zdj_Ac_Eq_X_Chz06_0_1727e01723.png" alt="Wallpaper 5">
                            </div>
                            <div class="wallpaper-item" data-url="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png">
                                <img src="https://res.cloudinary.com/dvrqgxoqf/image/upload/v1740488701/AQ_Mjz_L_Ot_EMX_Ycpr_Bdd7b_0_0a8efbdc62.png" alt="Wallpaper 6">
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label>Theme (Coming Soon):</label>
                        <select disabled><option>Dark (Current)</option><option>Light</option></select>
                    </div>
                </div>
                <div class="settings-category">
                    <h3><i class="fas fa-info-circle"></i> About AerionOS</h3>
                    <p><strong>AerionOS - Community Edition</strong> v0.4</p>
                    <p>A web operating system simulator built with HTML, CSS and modular JavaScript.</p>
                    <p>© ${new Date().getFullYear()} JuansesDev</p>
                    <div class="setting-item">
                        <button data-action="system-info">More information</button>
                    </div>
                </div>
            </div>
        `;

        const wallpaperInput = contentElement.querySelector('#wallpaper-url-input');

        contentElement.querySelector('[data-action="logout"]').addEventListener('click', async () => {
            try {
                const shouldLogout = await this.webOS.modals.showConfirm("Are you sure you want to log out?", "Log Out");
                if (shouldLogout) {
                    this.webOS.userSession.logout();
                }
            } catch (error) {
                console.log('Logout cancelled');
            }
        });
        contentElement.querySelector('[data-action="apply-wallpaper"]').addEventListener('click', async () => {
            const url = wallpaperInput.value.trim();
            if (url) {
                this.webOS.desktop.setWallpaper(url);
            } else {
                await this.webOS.modals.showAlert("Please enter a URL for the desktop wallpaper.", "Error");
            }
        });
        contentElement.querySelector('[data-action="reset-wallpaper"]').addEventListener('click', () => {
            wallpaperInput.value = '';
            this.webOS.desktop.setWallpaper('');
        });

        contentElement.querySelectorAll('.wallpaper-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    wallpaperInput.value = url;
                    this.webOS.desktop.setWallpaper(url);

                    contentElement.querySelectorAll('.wallpaper-item').forEach(el => {
                        el.classList.remove('selected');
                    });
                    item.classList.add('selected');
                }
            });
        });

        setTimeout(() => {
            const wallpaperItems = contentElement.querySelectorAll('.wallpaper-item');
            wallpaperItems.forEach(item => {
                if (item.dataset.url === currentWallpaper) {
                    item.classList.add('selected');
                }
            });
        }, 50);

        const systemInfoButton = contentElement.querySelector('[data-action="system-info"]');
        if (systemInfoButton) {
            systemInfoButton.addEventListener('click', () => {
                const windowId = 'about-aerionos-settings';

                const existingWindow = this.webOS.windowManager.getWindow(windowId);
                if (existingWindow) {
                    existingWindow.bringToFront();
                    return;
                }

                const aboutWindow = this.webOS.windowManager.createWindow(
                    windowId,
                    'About AerionOS',
                    'fas fa-info-circle',
                    {
                        width: 420,
                        height: 320,
                        minWidth: 350,
                        minHeight: 280,
                        customClass: 'about-window-theme'
                    }
                );

                const aboutContentHTML = `
                    <div style="padding: 20px; line-height: 1.6; color: var(--text-color); font-family: var(--font-family);">
                        <h3 style="margin-bottom: 15px; color: var(--accent-color); text-align: center; font-size: 1.6em; font-weight: 500;">
                            <i class="fab fa-linux" style="margin-right: 8px;"></i>AerionOS
                        </h3>
                        <p style="text-align: center; font-size: 0.95em; margin-bottom: 10px;">Version 0.5 (Community Edition)</p>
                        <p style="text-align: center; margin-bottom: 15px;">
                            Developed by: <strong style="color: var(--accent-color-hover);">JuansesDev</strong>
                        </p>
                        <p style="font-size: 0.9em; margin-bottom:8px;">
                            AerionOs is an interactive web operating system simulator,
                            designed to showcase front-end development skills
                            using HTML, CSS and modular JavaScript.
                        </p>
                        <p style="font-size:0.9em;margin-top:10px;">
                            Default background images provided by
                            <a href="https://pixeldreamsgallery.me/" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color);text-decoration:none;">Pixel Dreams Gallery</a> and other sources.
                        </p>
                        <p style="text-align:center;margin-top:25px;font-size:0.85em;color:var(--text-color-darker);">
                            © ${new Date().getFullYear()} JuansesDev.
                        </p>
                    </div>
                `.trim();

                if (aboutWindow) {
                    aboutWindow.setContent(aboutContentHTML);
                } else {
                    console.error("Could not create the 'About AerionOS' window");
                }
            });
        }
    }
}