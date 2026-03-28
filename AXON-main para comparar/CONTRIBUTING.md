# Guía de Contribución - AXON

Este proyecto sigue estándares estrictos de ingeniería de software para asegurar que el sistema sea sostenible a largo plazo. Si vas a añadir código, por favor respeta las siguientes normas.

## 🌟 Reglas de Oro (Arquitectura)

1.  **Capa de Servicios Obligatoria:** Nunca llames a `supabase` directamente desde un componente UI. Todas las peticiones deben pasar por `src/lib/services/api.ts`.
2.  **Dual UI (Lite vs Premium):** Todos los componentes visuales pesados o animaciones deben respetar el flag `useLowPerfUI`. No introduzcas dependencias de animaciones globales que no puedan desactivarse.
3.  **Tipado Estricto:** Usa los tipos definidos en `src/lib/types.ts`. Evita el uso de `any` a menos que sea estrictamente necesario para compatibilidad externa.

## 🛠️ Flujo de Trabajo con IA

Cuando trabajes con asistentes de IA (como Claude o Antigravity):

- **Planning First:** Siempre pide un `implementation_plan.md` antes de empezar a picar código en tareas complejas.
- **Atomic Commits:** Haz commits pequeños y descriptivos. Separa los fixes visuales de los cambios estructurales.
- **Context Awareness:** Mantén actualizados los archivos en la carpeta `CONTEXT/` para que la IA entienda las decisiones de diseño tomadas anteriormente.

## 📝 Estilo de Código

- Usa **TypeScript** con nombres de funciones descriptivos en inglés o español (pero sé consistente en módulos).
- Prefiere **Arrow Functions** para componentes funcionales.
- Comenta la lógica de negocio compleja dentro del Service Layer, no en la UI.

---

*“Code is for humans to read, and only incidentally for machines to execute.”*
