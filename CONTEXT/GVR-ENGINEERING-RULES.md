# GVR-ENGINEERING-RULES: REGLAS DE DESARROLLO

## 1. FLUJO DE TRABAJO (SOLO-DEV & IA)
- **Contexto Obligatorio:** Antes de ejecutar cualquier tarea o proponer código, el agente (IA) **DEBE** leer siempre los archivos de la raíz de la carpeta `CONTEXT/` (en especial `GVR-ENGINEERING-RULES.md`, `PLN-PRODUCT-VISION.md` y `TEC-SYSTEM-STACK.md`) para usarlos como base inamovible para toda operación.
- **Aprendizaje Continuo (Comentarios Requeridos):** El CPO está en fase de aprendizaje activo. Es **OBLIGATORIO** que cada vez que generes o modifiques código, añadas comentarios explicativos en español dentro del propio código (sobre las funciones o bloques lógicos) explicando **QUÉ** hace y **POR QUÉ**, facilitando así el seguimiento de los cambios efectuados.
- **No Unit Tests (por ahora):** Prioridad al "Visual Testing" en local.
- **Iteración:** Pedir feature pequeña -> Implementar -> Validar visualmente.

## 2. RESTRICCIONES TÉCNICAS (IRON CLAD)
1. **Supabase Free Tier:** Nunca diseñar una feature que requiera Functions de pago o almacenamiento masivo. Usar lógica en cliente (Client-Side) y P2P para archivos.
2. **Vercel Build:** Dependencias de construcción (`vite`, `tailwindcss`) DEBEN estar en `dependencies` (no en dev) para evitar Error 127.
3. **SSoT Obligatorio:** Prohibido hardcodear categorías o etiquetas. Todo emana de `types.ts` (ver `TEC-SYSTEM-STACK.md`).
4. **Assets:** Prohibido subir imágenes `.png` o `.jpg` para UI. Todo debe ser CSS, SVG (`lucide-react`) o Vectores JSON.
5. **Dates:** Usar siempre el componente `CustomDatePicker` (date-fns) en formato `yyyy-MM-dd`. Parsear fechas siempre con validación `isNaN`.
6. **Seguridad:** RLS (Row Level Security) habilitado SIEMPRE en Supabase. Tokens de sesión en Cookies `HttpOnly`, nunca en `localStorage`.

## 3. SISTEMA DE DISEÑO (CYBERPUNK / RAW)
- **Paleta:** `zinc-900` (Fondo), `green-500` (Acción/Tóxico), `red-500` (Peligro).
- **Estética:** Bordes finos (`border-zinc-700`), Sombras de neón (`shadow-green-500/20`), Fuentes Mono para datos.
- **Componentes:** Usar siempre `ToxicCard` como referencia visual y mantener alturas (`h-9`) y fondos (`bg-zinc-950`) unificados en diálogos de stock para un look premium.

## 4. UX MÓVIL Y ESTABILIDAD (LEGACY FIRST)
- **Prohibido `autoFocus`:** NUNCA usar `autoFocus` en inputs dentro de componentes flotantes (Dialog, Popover, Drawer). Provoca "White Screen of Death" en Android WebViews antiguos.
- **Smart Inputs:** Deshabilitada apertura automática de desplegables en foco y añadido disparador manual (`ChevronDown`) para evitar saltos de teclado en móviles. Los ComboBox de Ubicación y Tienda deben recuperar el historial del `householdId` para evitar fatiga de escritura.
- **Contrastes:** Verificar legibilidad en Dark Mode (evitar negro sobre negro en inputs).
- **Protocolo de Estabilidad (Hard Data Lock):** Prohibido liberar el `LoadingScreen` hasta que la triada `session + profile + currentHousehold` esté resuelta (`!== undefined`). Evita el contenido fantasma ("Ghost UI").
- **Hybrid UI (OPPO Strategy):** En modales pesados, escalonar la carga: Delay de 250ms antes de pedir datos (permite renderizar animación de apertura) y Renderizado perezoso (Lazy) para cargar primero lo esencial y tras 300ms el resto.
- **Adaptive Branding:** La interfaz debe reaccionar visualmente al `profile.level` (Admin = Logo Bóveda; Teen = Glitch/Brillo; Kid = Bounce).
