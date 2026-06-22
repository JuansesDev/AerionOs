# AerionOS - Web OS Simulator (Beta)

![AerionOS Desktop](https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747691727/auraos_jf7szq.png)

AerionOS is an interactive desktop operating system simulation that runs entirely in your browser, built with **HTML, CSS and JavaScript (ES6+ Modules)**. This project, currently in **Beta**, serves as a portfolio piece to showcase the creation of complex interfaces and modular web applications.

## Highlights

*   **Desktop Environment:** Draggable, minimizable, maximizable and closable windows.
*   **Taskbar and Start Menu:** Functional for launching applications and managing windows.
*   **Simulated File System:** Persisted per user using `localStorage`.
*   **User Authentication:** Basic "login" and "registration".
*   **Included Applications:**
    *   File Explorer
    *   Notepad (save/open `.txt` files)
    *   Code Editor (save/open files, run basic HTML)
    *   Terminal (basic file system commands)
    *   Calculator
    *   Web Browser (basic, with **limitations due to the X-Frame-Options policies** of many sites that prevent embedding them in iframes).
    *   Settings (wallpaper customization, system info)
    *   Drawing App (interactive canvas with drawing tools)
    *   Games: Minesweeper, Chess (1P vs simple AI / 2P local) and **DOOM** (full emulation of the classic game)
*   **Modular Architecture:** Code organized into ES6 classes and modules.

## Recent Improvements

*   **Full Rebranding:** The project was renamed from **AuraOS** to **AerionOS** with a new visual identity.
*   **UX/UI Improvements:**
    *   Larger icons in the main menu for better usability
    *   Multiple wallpapers available
    *   Better visual consistency using PNG icons instead of SVG
    *   Improved selection styles for interactive elements
*   **New Features:**
    *   Full DOOM emulation using DOSBox
    *   Drawing app with advanced tools
    *   Expanded wallpaper management system
*   **Technical Fixes:**
    *   Improved persistence of user settings
    *   Optimization of the simulated file system
    *   Fixed global references and ES6 modules

## Technologies

*   HTML5, CSS3 (Variables, Flexbox, Grid)
*   JavaScript (ES6+ Classes and Modules)
*   Font Awesome (Icons)
*   `localStorage` (Persistence)

## Running

1.  Download or clone the project.
2.  **Serve the files through a local web server.** (e.g. VSCode "Live Server" extension, or `npx http-server` in the project folder).
    *   *Opening `index.html` directly from the file system (`file:///`) will not work because of the ES6 modules.*
3.  Open your local server URL (e.g. `http://localhost:8080`) in a modern browser.

## Live Demo

You can try the demo at the following link:

[https://juansesdev.github.io/AerionOS/](https://juansesdev.github.io/AerionOS/)

## Author

*   **JuansesDev**
    *   GitHub: [@JuansesDev](https://github.com/JuansesDev)
    *   Web Portfolio: [juanses-dev.com](https://juanses-dev.com)
    *   LinkedIn: [Sebastián Vargas](https://www.linkedin.com/in/sebastian-vargas-122aa4285)

*(This project is under active development. Feedback and suggestions are welcome!)*
