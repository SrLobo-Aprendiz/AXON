# ESTADO DEL PROYECTO

## ✅ COMPLETADO (FASE 1 - CORE DOMÉSTICO)
### Infraestructura & DB
- [x] Definición de Stack (React + Tailwind + Supabase).
- [x] Esquema de Base de Datos finalizado (`inventory_items`, `shopping_list`, `fridge_items`).
- [x] **Blindaje SQL:** Constraints únicos para evitar duplicados en listas activas.

### Funcionalidad "Cerebro"
- [x] **Automatización de Compra:** Detección automática de falta de stock (VIP < 4, Normal < 2).
- [x] **Auto-Limpieza:** El sistema borra de la lista de compra si detecta entrada de stock manual.
- [x] **Lógica FIFO:** El consumo resta siempre del lote con caducidad más próxima.
- [x] **Gestión de Lotes (WMS):** Mudanza de stock entre ubicaciones (Total y Parcial/Split).

### Interfaz (UX Funcional)
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