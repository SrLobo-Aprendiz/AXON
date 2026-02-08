# AXON OS: REGLAS DE DESARROLLO

## 1. RESTRICCIONES TÉCNICAS (IRON CLAD)
1. **Supabase Free Tier:** Nunca diseñar una feature que requiera Functions de pago o almacenamiento masivo.
   - *Solución:* Usar lógica en cliente (Client-Side) y P2P para archivos grandes.
2. **Assets:** Prohibido subir imágenes `.png` o `.jpg` para UI. Todo debe ser CSS, SVG (`lucide-react`) o Vectores JSON.
3. **Seguridad:** - RLS (Row Level Security) habilitado SIEMPRE en Supabase.
   - Tokens de sesión en Cookies `HttpOnly`, nunca en `localStorage`.

## 2. SISTEMA DE DISEÑO (CYBERPUNK / RAW)
- **Paleta:** `zinc-900` (Fondo), `green-500` (Acción/Tóxico), `red-500` (Peligro).
- **Estética:** Bordes finos (`border-zinc-700`), Sombras de neón (`shadow-green-500/20`), Fuentes Mono para datos.
- **Componentes:** Usar siempre `ToxicCard` como referencia visual.

## 3. FLUJO DE TRABAJO (SOLO-DEV)
- **No Unit Tests (por ahora):** Prioridad al "Visual Testing" en local.
- **Contexto Manual:** Antes de pedir código a una IA, PEGAR siempre el contenido de `00_VISION.md` y `01_STACK.ts`.
- **Iteración:** 1. Copiar contexto.
  2. Pedir feature pequeña.
  3. Implementar.
  4. Validar visualmente.
  4. **Compatibilidad Móvil (Legacy First):**
   - **Prohibido `autoFocus`:** NUNCA usar `autoFocus` en inputs dentro de componentes flotantes (Dialog, Popover, Drawer). Provoca "White Screen of Death" en Android WebViews antiguos.
   - **Safe Dates:** Parsear fechas siempre con validación `isNaN`. Los navegadores móviles viejos explotan con formatos de fecha incorrectos.