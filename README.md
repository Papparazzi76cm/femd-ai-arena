# FEMD Eventos

Prompt Maestro para el Desarrollo del Proyecto "FEMD TORNEOS"
Rol: Actúa como un experto desarrollador full-stack con especialización en React, TypeScript, Lovable Cloud y la IA de Lovable
Objetivo Principal: Crear una aplicación web completa, moderna y funcional para una empresa organizadora de eventos y torneos de fútbol llamada "FEMD TORNEOS". La aplicación debe ser visualmente espectacular, totalmente responsive, con soporte para tema claro/oscuro, y debe incluir un avanzado panel de administración con herramientas de IA.
1. Especificaciones Generales y Stack Tecnológico
Framework Frontend: React 19+ con TypeScript.
Backend y Base de Datos (BaaS): Supabase. Utilizarás tu Cloud para Autenticación, Base de Datos PostgreSQL, Almacenamiento (Storage) y Funciones Edge.
Estilos: Tailwind CSS. La configuración se hará directamente en el index.html a través del CDN para un desarrollo rápido.
Inteligencia Artificial: Usa tu nueva funcionalidad de aplicación de IA
Estructura de Archivos: El proyecto se basará en un index.html que carga un index.tsx como módulo ES6. Los componentes, servicios, hooks y tipos estarán organizados en sus respectivas carpetas (/components, /services, /hooks, /types).
2. Estructura y Diseño Visual (UI/UX)
Paleta de Colores: El color de acento principal es el verde esmeralda (clases emerald de Tailwind). El diseño debe funcionar perfectamente en un tema claro (fondos blancos/grises claros) y un tema oscuro (fondos grises oscuros/negros).
Tipografía: Utiliza una fuente sans-serif limpia y legible (la fuente por defecto de Tailwind es suficiente).
Animaciones y Transiciones: Implementa animaciones sutiles y profesionales para mejorar la experiencia de usuario:
Efectos hover en botones y tarjetas (ligero escalado, cambio de sombra).
Animaciones de aparición (fade-in, fade-in-up) para elementos de la página y modales.
Transiciones suaves para el cambio de tema (transition-colors duration-300).
Responsividad: Todos los componentes y páginas deben ser completamente funcionales y estéticamente agradables en dispositivos móviles, tablets y ordenadores de escritorio. Usa los breakpoints de Tailwind (sm, md, lg, xl).
Componentes Reutilizables: Crea componentes para elementos comunes como iconos, tarjetas, modales y botones para mantener la consistencia.
3. Funcionalidades Clave y Desglose por Componente
A. Archivos Raíz:
index.html:
Configura el importmap para gestionar las dependencias de React, Supabase y @google/genai desde un CDN.
Incluye el script de configuración de Tailwind CSS.
Añade estilos CSS globales para una barra de scroll personalizada que se adapte al tema claro/oscuro.
La etiqueta <body> debe tener las clases base para los colores de texto y fondo y la transición entre temas.
App.tsx:
Componente principal que gestiona la navegación entre vistas (sin usar un router, sino un estado currentView).
Maneja el estado global para la apertura de modales (ej. isAuthModalOpen).
Envuelve toda la aplicación en los proveedores de contexto: AuthProvider y ThemeProvider.
B. Autenticación y Contexto (hooks/):
useAuth.ts:
Crea un AuthContext para gestionar el estado del usuario (user).
Implementa las funciones login, register y logout que llaman al authService.
Utiliza supabase.auth.onAuthStateChange para escuchar cambios en la sesión y actualizar el estado del usuario automáticamente.
Lógica de rol: Un usuario con el email mariscalimagen@gmail.com debe tener el rol de admin.
useTheme.ts:
Crea un ThemeContext para gestionar el tema (light o dark).
La función toggleTheme cambia el estado.
Usa useEffect para añadir la clase dark o light a la etiqueta <html> y persistir la preferencia en localStorage.
C. Componentes Principales:
Header.tsx:
Debe ser sticky en la parte superior.
Transición de fondo: transparente cuando está en la parte superior de la página, y con un fondo semitransparente con backdrop-blur al hacer scroll.
El logo debe cambiar según el tema (versión clara y oscura).
Menú de navegación con un dropdown para "Competiciones".
Muestra el estado de autenticación: "Acceder / Registrarse" o "Bienvenido, {nombre}" y "Cerrar Sesión".
Incluye el ThemeToggleButton.
Implementa un menú de hamburguesa para móviles que se despliega a pantalla completa.
Footer.tsx: Un pie de página simple con el logo, enlaces de navegación y links a redes sociales (placeholders).
AuthModal.tsx:
Modal para inicio de sesión y registro con un sistema de pestañas.
Maneja el estado del formulario, la validación y muestra los errores devueltos por authService.
ChatBot.tsx:
Un botón flotante en la esquina inferior derecha.
Al hacer clic, abre una ventana de chat.
Muestra el historial de la conversación y un indicador de "escribiendo..." animado mientras espera la respuesta de la IA.
La lógica de envío llama a geminiService.chatWithBot.
AudioPlayer.tsx:
Un reproductor de audio flotante en la esquina inferior izquierda.
Debe ser discreto. Al pasar el ratón por encima, se expande para mostrar un control de volumen.
Reproduce música de fondo en bucle.
Recuerda el volumen y el estado de silencio del usuario usando localStorage.
D. Páginas y Vistas:
HomePage.tsx:
Sección Hero: Un carrusel de imágenes a pantalla completa que se alimenta de las imágenes de las últimas publicaciones del blog.
Sección de Noticias: Muestra las últimas 6 publicaciones del blog en una cuadrícula de BlogPostCard. Debe manejar estados de carga y error. Si no hay posts, debe mostrar un mensaje informativo.
Sección de Galería: Una espectacular galería de carteles de torneos en forma de carrusel 3D rotatorio. Las imágenes se obtienen del bucket carteles de tu cloud Storage.
AdminDashboard.tsx (La pieza central):
Comprobación de Configuración: Al cargar, debe intentar obtener datos de todas las tablas. Si falla (ej., la tabla no existe), debe ocultar el panel y mostrar un bloque de código con un script SQL completo para que el administrador cree todas las tablas, inserte datos iniciales (equipos) y configure las políticas de Row Level Security (RLS) en Cloud.
Herramientas IA:
Generador de Imágenes: Un textarea para el prompt, un select para el aspect ratio. Muestra la imagen resultante.
Gestión de Contenido:
PostEditor.tsx: Un editor completo para crear/editar posts. Incluye botones de IA para generar descripción y contenido a partir del título. Permite subir una imagen principal o seleccionar una de la galería (ImagePicker).
EventEditor.tsx: Un formulario para gestionar eventos del calendario, incluyendo un selector múltiple para los equipos participantes.
Gestión de Datos: CRUDs completos para Equipos, Participantes y Patrocinadores. Los formularios deben aparecer/desaparecer dinámicamente.
Gestión de Archivos: Tres componentes StorageBucketManager para gestionar los buckets imagenes-web, imagenes-torneos y carteles. Deben permitir subir, listar, eliminar y copiar la URL pública de los archivos.
TeamsPage.tsx y TeamDetailPage.tsx:
TeamsPage muestra una cuadrícula de todos los equipos.
TeamDetailPage es un componente "router" que, según el nombre del equipo, renderiza un componente de detalle específico (ej. TeamDetailArandaRiber.tsx) o un GenericTeamDetail si no hay uno específico.
TeamDetailLayout.tsx: Es un layout reutilizable que recibe toda la data de un equipo (plantilla, calendario, etc.) y la renderiza en una interfaz con pestañas (Resumen, Plantilla, Calendario).
Otras Páginas: SponsorsPage, ContactPage, CalendarPage, BlogPostPage, BlogListPage deben ser construidas según la estructura y diseño de los archivos proporcionados, mostrando la información correspondiente de cloud.
E. Capa de Servicios (services/):
authService.ts: Interactúa con supabase.auth para manejar la autenticación.
postService.ts, teamService.ts, etc.: Cada servicio debe implementar las operaciones CRUD (get, add, update, delete) para su tabla correspondiente en la base de datos de Supabase.
4. Configuración del Backend 
Base de Datos:
Crea las tablas: teams, participants, events, posts, sponsors.
Las columnas deben coincidir exactamente con las interfaces definidas en types.ts.
RLS (Row Level Security): Habilita RLS en TODAS las tablas. Crea políticas que permitan el acceso de lectura (SELECT) a todo el público (public) y todas las demás operaciones (INSERT, UPDATE, DELETE) solo a los usuarios autenticados (authenticated).
Almacenamiento:
Crea tres buckets PÚBLICOS: imagenes-web, imagenes-torneos, carteles.
Configura las políticas de almacenamiento para permitir la lectura pública y la escritura solo para usuarios autenticados.
Funciones Edge (Deno):
Crea una función para cada tarea de IA (chat, generate-image, search, maps, analyze, generate-description, generate-content).
Devuelve la respuesta al frontend en formato JSON.
Siguiendo estas indicaciones de forma meticulosa, se replicará el proyecto "FEMD TORNEOS" con total fidelidad en su arquitectura, funcionalidad y diseño. ¡A desarrollar

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://femd-ai-arena.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/55831ac8-61fb-4054-8994-23bcdb637a23).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
