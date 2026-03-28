# ESTADO DEL PROYECTO (v5.0 - STEALTH MODE)
**ESTADO GLOBAL:** 🟡 BUILDING (EN CONSTRUCCIÓN)
**FASE ACTUAL:** 1.5 - EL BÚNKER (Logística + Seguridad + i18n)
**OBJETIVO:** Beta funcional Offline para 10 familias ("Francotiradores").

---

## 🚧 EN PROCESO (WIP - PRIORIDAD ABSOLUTA)
*(Nada sale a producción hasta que esto esté verde)*

### 1. Núcleo de Confianza (Roles Líquidos)
- [ ] **DB Schema:** Migrar `profiles` para incluir `level` (INT) y `capabilities` (JSONB).
- [ ] **RLS (Supabase):** Escribir las políticas que lean el JSONB para permitir/bloquear acciones.
- [ ] **UI Gestión:** Panel "Semáforo" para que el Admin active permisos al vuelo.

### 2. Infraestructura PWA (Offline First)
- [ ] **Service Workers:** Configurar caché agresiva (Workbox/Vite PWA).
- [ ] **Sync Engine:** Que los cambios offline se suban solos al recuperar red.
- [ ] **UX Fallback:** Indicadores visuales de "Sin Conexión" (modo solo lectura o escritura local).

### 3. Identidad Cultural (i18n)
- [ ] **Motor i18n:** Configurar librería (i18next o similar).
- [ ] **Pack Nacional:** Traducciones ES, CA, GL, EU.
- [ ] **Pack Bauhaus:** Traducción DE (Alemán técnico/corto) y ZH (Chino).

---

## ✅ COMPLETADO (DONE)
*(Cimientos sólidos ya construidos)*

### Infraestructura & Core
- [x] **Stack:** React + Tailwind + Supabase definidos.
- [x] **DB Schema:** Tablas maestras (`inventory`, `shopping_list`) finalizadas.
- [x] **Blindaje SQL:** Constraints únicos para evitar duplicados.
- [x] **Hotfix Móvil:** Solucionado el crash en Android Legacy (No autoFocus).

### Funcionalidad "Cerebro"
- [x] **Gestión de Vida:** Lógica Ghost (se borra al gastarse) vs Estructural (persiste).
- [x] **Alertas:** Motor de avisos (Rojo/Azul) según importancia.
- [x] **Auto-Limpieza:** Borrado de lotes virtuales al reponer stock.

### UX/UI (Interfaz)
- [x] **StockModal v2:** Edición in-place, mudanza de lotes y kill-switch.
- [x] **ShoppingList:** Filtros de categoría y UI optimista.
- [x] **FridgeCanvas:** Sistema básico de notas/imanes.

---

## 📅 PENDIENTE (NEXT - EN COLA)
*(Bloqueado hasta cerrar la sección WIP)*

- [ ] **Beta "Francotirador":** Generar las "Member Cards" (Imágenes) para los 10 testers.
- [ ] **Outreach:** Enviar los 10 DMs de contacto (Estrategia Iceberg).
- [ ] **Onboarding:** Flujo de entrada con "Manifiesto" y selección de idioma.
- [ ] **Wishlist:** Lógica para que los Level 1 (Niños) pidan cosas sin ensuciar la lista real.

---

## ⛔ BLOQUEADO / ICEBOX (FUTURO)
*(No tocar ni mencionar públicamente)*

- [ ] **Fase 2:** Muros sociales (Persiana/Callejón).
- [ ] **Gamificación:** Cartas, tokens y puntos.
- [ ] **Marketing:** Campañas masivas o influencers grandes.

#ACTUALIZACION 23/2/26
# ESTADO DEL PROYECTO (v5.8)
**ESTADO GLOBAL:** 🟡 BUILDING
**FASE ACTUAL:** 1.5 - EL BÚNKER (Logística + Seguridad + i18n)

## ✅ COMPLETADO (DONE)
- [x] **Master Product Registry:** Implementado `ProductAutocomplete` para reutilizar definiciones y evitar duplicidad de productos maestros.
- [x] **Deduplicación de Lotes:** Lógica inteligente para fusionar o vincular nuevos lotes a productos existentes basándose en el nombre.
- [x] **UI Normalization:** Alturas (`h-9`) y fondos (`bg-zinc-950`) unificados en diálogos de stock para un look premium.
- [x] **Mobile UX Optimization:** Deshabilitada apertura automática de desplegables en foco y añadido disparador manual (`ChevronDown`) para evitar saltos de teclado en móviles.
- [x] **SSoT de Categorías:** Centralizado en types.ts (Frescos, Higiene, Pescado).
- [x] **Onboarding Flow:** Extracción de la pantalla de bienvenida a una ruta dedicada `/setup`.
- [x] **Ultra-Stability:** Implementado "Hard Data Lock" y carga escalonada para dispositivos de gama media (OPPO A72).
- [x] **Adaptive Branding:** Pantalla de carga y Header dinámicos según el `profile.level` (Admin/Teen/Kid).
- [x] **Sync DB (Profiles):** Columna `level` sincronizada e integrada en el frontend.
- [x] **Asset Cache-Busting**: Implementado sistema de versiones para el favicon y branding oficial.

## 🚧 EN PROCESO (WIP)
- [ ] **RLS Liquid Trust:** Políticas de Supabase basadas en Capabilities/Levels.
- [ ] **i18n Engine:** Configurar traducciones para el "Pack Nacional".

### Modelo de Datos: Producto Nuevo/Borrador
- **Concepto:** `Quick Capture` (Inbox)
- **Valores por defecto:**
  - `Cantidad`: 1
  - `Prioridad`: Normal
  - `Ubicación`: Inbox
  - `Caducidad`: Null

## 📅 PENDIENTE (NEXT)
- [ ] **Beta Pioneros:** Sistema de validación de códigos `beta_codes`.
- [ ] **Wishlist:** Lógica para peticiones de compra de Level 1 (Kids).