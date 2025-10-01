# AerionOS - Simulador de SO Web (Versión Beta)

![AerionOS Desktop](https://res.cloudinary.com/dvrqgxoqf/image/upload/v1747691727/auraos_jf7szq.png)

AerionOS es una simulación interactiva de un sistema operativo de escritorio que se ejecuta completamente en tu navegador, construida con **HTML, CSS y JavaScript (ES6+ Módulos)**. Este proyecto, actualmente en **versión Beta**, sirve como portafolio para demostrar la creación de interfaces complejas y aplicaciones web modulares.

## Características Destacadas

*   **Entorno de Escritorio:** Con ventanas arrastrables, minimizables, maximizables y cerrables.
*   **Barra de Tareas y Menú de Inicio:** Funcionales para lanzar aplicaciones y gestionar ventanas.
*   **Sistema de Archivos Simulado:** Persistente por usuario usando `localStorage`.
*   **Autenticación de Usuario:** "Login" y "registro" básicos.
*   **Aplicaciones Incluidas:**
    *   Explorador de Archivos
    *   Bloc de Notas (guardar/abrir archivos `.txt`)
    *   Editor de Código (guardar/abrir archivos, ejecutar HTML básico)
    *   Terminal (comandos básicos del sistema de archivos)
    *   Calculadora
    *   Navegador Web (básico, con **limitaciones debido a las políticas X-Frame-Options** de muchos sitios web que impiden su incrustación en iframes).
    *   Ajustes (personalización de fondo, info del sistema)
    *   Aplicación de Dibujo (canvas interactivo con herramientas de dibujo)
    *   Juegos: Buscaminas, Ajedrez (1P vs IA simple / 2P local) y **DOOM** (emulación completa del clásico juego)
*   **Arquitectura Modular:** Código organizado en clases y módulos ES6.

## Mejoras Recientes (v2024)

*   **Rebranding Completo:** El proyecto ha sido renombrado de **AuraOS** a **AerionOS** con nueva identidad visual
*   **Mejoras en UX/UI:**
    *   Íconos de mayor tamaño en el menú principal para mejor usabilidad
    *   Múltiples fondos de pantalla disponibles
    *   Mejor consistencia visual con íconos PNG en lugar de SVG
    *   Estilos de selección mejorados para elementos interactivos
*   **Nuevas Funcionalidades:**
    *   Emulación completa de DOOM usando DOSBox
    *   Aplicación de dibujo con herramientas avanzadas
    *   Sistema de gestión de wallpapers expandido
*   **Correcciones Técnicas:**
    *   Mejora en la persistencia de configuraciones de usuario
    *   Optimización del sistema de archivos simulado
    *   Corrección de referencias globales y módulos ES6

## Tecnologías

*   HTML5, CSS3 (Variables, Flexbox, Grid)
*   JavaScript (ES6+ Clases y Módulos)
*   Font Awesome (Iconos)
*   `localStorage` (Persistencia)

## Ejecución

1.  Descarga o clona el proyecto.
2.  **Sirve los archivos a través de un servidor web local.** (Ej: Extensión "Live Server" de VSCode, o `npx http-server` en la carpeta del proyecto).
    *   *Abrir `index.html` directamente desde el sistema de archivos (`file:///`) no funcionará debido a los módulos ES6.*
3.  Abre la URL de tu servidor local (ej. `http://localhost:8080`) en un navegador moderno.

## Demo en línea

Puedes probar la demo desde el siguiente enlace:

[https://juansesdev.github.io/AerionOS/](https://juansesdev.github.io/AerionOS/)

## Autor

*   **JuansesDev**
    *   GitHub: [@JuansesDev](https://github.com/JuansesDev)
    *   Portafolio Web: [juanses-dev.com](https://juanses-dev.com)
    *   LinkedIn: [Sebastián Vargas](https://www.linkedin.com/in/sebastian-vargas-122aa4285)

*(Este proyecto está en desarrollo activo. ¡Comentarios y sugerencias son bienvenidos!)*