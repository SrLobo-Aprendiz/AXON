# ESTADO DEL PROYECTO

## ✅ COMPLETADO (FASE 1 - CORE DOMÉSTICO)
### Infraestructura & DB
- [x] Definición de Stack (React + Tailwind + Supabase).
- [x] Esquema de Base de Datos finalizado (`inventory_items`, `shopping_list`, `fridge_items`).
- [x] **Blindaje SQL:** Constraints únicos para evitar duplicados en listas activas.

### Funcionalidad "Cerebro"
- [x] **Automatización de Compra:** Detección automática de falta de stock (VIP < 4, Normal < 2).
- [x] **Motor de Alertas v2:** Distinción entre "Críticos" (Rojo) y "Sugerencias/Opcionales" (Azul).
- [x] **Gestión de Vida (Ghost vs Persistente):**
  - Productos Ghost: Se autodestruyen al llegar a 0.
  - Productos Estándar: Persisten a 0 uds (Lote Virtual) para recordar reposición.
- [x] **Auto-Limpieza:** Borrado automático de lotes virtuales al entrar stock real.
- [x] **Lógica FIFO:** Consumo inteligente priorizando caducidad más próxima.

### Interfaz (UX Funcional)
- [x] **FridgeCanvas:** Visualización de notas e imanes estáticos.
- [x] **StockModal v2 (Robustez Móvil):**
  - Edición "In-Place" (Lápices siempre visibles).
  - Menú de Mudanza Avanzado (Split Lotes + Cambio de fecha).
  - Kill Switch (Borrado total de producto + histórico).
  - **Hotfix:** Estabilidad garantizada en Android Legacy (No autoFocus).
- [x] **ShoppingListModal:** Filtros de categoría y UI Optimista.
- [x] **Alertas Unificadas:** Tarjetas inteligentes que combinan avisos de Stock y Caducidad.

- [x] **FridgeCanvas:** Visualización de notas e imanes estáticos.
- [x] **StockModal:** Visualización agrupada (Máscara) vs Desglose por lotes.
- [x] **ShoppingListModal:** Filtros de categoría, lógica de "Posponer" y UI Optimista.
- [x] **Alertas Unificadas:** Tarjetas inteligentes que combinan avisos de Stock y Caducidad.

## 🎨 BACKLOG DE DISEÑO (PENDIENTE "POLISH")
- [ ] **Drag & Drop:** Implementar librería para mover imanes libremente (`react-draggable`).
- [ ] **Estética Imanes:** CSS avanzado para dar aspecto físico (sombras, rotación, texturas).
- [ ] **Animaciones:** Transiciones suaves al abrir/cerrar modales y consumir items.

## 🚧 PRÓXIMOS PASOS (FASE 2 - SOCIAL & IDENTIDAD)
1.  **Header de Presencia:** Implementar "Llaveros" visuales en la parte superior.
2.  **Estados de Usuario:** Lógica para cambiar estado (Casa, Trabajo, Supermercado, Ocio).
3.  **Chats Contextuales:** Implementar sistema de mensajería asociado a la casa.