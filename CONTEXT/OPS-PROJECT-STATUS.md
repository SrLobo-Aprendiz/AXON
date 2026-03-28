# OPS-PROJECT-STATUS: ESTADO Y ROADMAP (v5.8)

**ESTADO GLOBAL:** 🟡 BUILDING (EN CONSTRUCCIÓN)
**FASE ACTUAL:** 1.5 - EL BÚNKER (Logística + Seguridad + i18n)
**OBJETIVO:** Beta funcional Offline para 10 familias ("Francotiradores").

---

## ✅ COMPLETADO (DONE)
- **Stack & Core:** Migración a React+Tailwind+Supabase realizada.
- **Gestión de Stock:** Motor de Alertas Rojo/Azul, Lógica Ghost vs Estructural, Auto-Limpieza.
- **Master Product Registry:** Implementado `ProductAutocomplete` para reutilizar productos maestros.
- **Deduplicación de Lotes:** Fusión inteligente basada en nombres.
- **UX UI (Core Apps):** `StockModal v2` (Edición in-place, mudanza de lotes y kill-switch), `ShoppingList` (Filtros de categoría y UI optimista), y `FridgeCanvas` (Sistema básico de imanes).
- **Mobile UX:** Deshabilitada apertura auto en foco (ComboBox con flecha manual), "Hard Data Lock" (cero Ghost UI) y carga escalonada.
- **UI:** Normalización de altos y fondos en diálogos para look Premium.
- **Adaptive Branding:** Pantalla de carga, header y colores reaccionan a `profile.level`.
- **Labs & RLS:** Restaurada creación de perfiles y SSoT en categories.
- **Onboarding:** Flujo trasladado a `/setup`. Identidad y Sync DB implementadas.
- **Planificación:** Redactado `architectural_design_plan_v1_5.md`.

---

## 🚧 EN PROCESO (WIP - PRIORIDAD ABSOLUTA)
*(Nada sale a producción hasta que esto esté verde)*

### 1. Núcleo y Seguridad (Roles Líquidos)
- [ ] **Aprobación de Arquitectura:** Esperar visto bueno CPO a `architectural_design_plan_v1_5.md` para construcción.
- [ ] **RLS Liquid Trust:** Escribir políticas en Supabase basadas en las nuevas Capabilities JSONB.
- [ ] **Panel Semáforo Admin:** UI de gestión de permisos al vuelo.

### 2. Infraestructura PWA (Offline First)
- [ ] **Worker y Caché:** Configurar Workbox/Vite PWA agresiva.
- [ ] **Motor de Sync:** Sincronización transparente de DB. Alertas de desconexión locales.

### 3. Identidad Cultural (i18n)
- [ ] **Motor Base:** Configurar librería de traducción.
- [ ] **Idiomas:** Pack Nacional (ES, CA, GL, EU) y Pack Bauhaus (DE, ZH).

### 4. Modelo de Transición (Borradores)
- [ ] **Quick Capture (Inbox):** Terminar lógica de cantidad=1, prioridad=normal, ubicación=inbox.

---

## 📅 PENDIENTE (NEXT - EN COLA)
*(Bloqueado hasta cerrar sección WIP)*
- [ ] **Beta Pioneros:** Generación de Member Cards, Contacto 10 DMs Duros, Sistema validación códigos (`beta_codes`).
- [ ] **Onboarding Completo:** Flujo de entrada visual con selección de idiomas.
- [ ] **Cartas Wishlist:** Lógica para que los Niños (Lvl 1) pidan cosas sin ensuciar el listado oficial y afectando a sus tokens o créditos.

---

## ⛔ BLOQUEADO / ICEBOX (FUTURO)
*(No tocar ni mencionar públicamente)*
- [ ] Muros sociales (Persiana/Callejón).
- [ ] Gamificación Avanzada (Puntos de Zasca, Asesino, La Bolsa).
- [ ] Acciones pasivas de Marketing de influencers.
