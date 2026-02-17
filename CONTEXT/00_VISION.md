# AXON OS: VISIÓN MAESTRA (v3.2)
> "Coste Cero. Fricción Cero. Sinceridad Absoluta."

## 🔒 PROTOCOLO DE SIGILO (STEALTH MODE)
**ESTADO DE ALERTA: ACTIVO.**
Bajo ninguna circunstancia se revelarán las mecánicas de "Economía de Tokens", "Fricción Educativa" o "Gamificación" en comunicaciones públicas.
**Narrativa Pública:** "Somos una herramienta de gestión de stock offline, privada y segura."
**Narrativa Interna:** "Estamos construyendo el Sistema Operativo del Hogar."

## 1. MANIFIESTO DEL PRODUCTO
Axon no es una app de tareas; es un Sistema Operativo para la convivencia familiar.
- **Filosofía:** No vendemos datos. No usamos servidores caros. Usamos el ingenio.
- **Usuario:** Familias con adolescentes. Si el adolescente no la borra, ganamos.
- **Restricción de Oro:** Todo debe funcionar en el Free Tier de Supabase.

---

## 2. FASE 1: LOGÍSTICA (EL NÚCLEO)
Objetivo: Utilidad inmediata y gestión del caos.

### 2.1. La Nevera "Multicapa" (The Fridge)
Un tablero digital compartido que resuelve el conflicto orden vs. caos.
- **Capa Base (Admin/Padres):** Imanes funcionales (Lista de Compra, Menú Semanal). Están "pegados con superglue" (solo editables por Nivel 3+). Visibles por todos.
- **Capa Personal (Caos):** Capa superpuesta donde cada usuario coloca sus notas, pegatinas o dibujos. No afectan a la estructura base. Configurable: "Ver solo lo mío" vs "Ver todo".
- **Inventario Inteligente:** Gestión multizona (Despensa, Baño, Nevera). El sistema distingue entre productos "Estructurales" (si se acaban, avisa) y "Temporales/Ghost" (si se acaban, desaparecen para no ensuciar la base de datos).

---

## 3. FASE 2: IDENTIDAD Y DATOS (EL ESCUDO)
Objetivo: Retención adolescente y viabilidad técnica (ahorro de costes).

### 3.1. "La Persiana" y "El Callejón" (Social Spaces)
Espacios de expresión basados en identidad, no en perfiles aburridos.
- **Skins:** El usuario elige su soporte: "Persiana Metálica" (Cyberpunk) o "Muro de Ladrillo" (Urbano).
- **El Callejón (Inter-Household):** Amigos de distintas casas pueden pintar en la persiana del otro mediante "Visados de Artista" (RLS Exceptions).
- **Squad Walls:** Muros colaborativos vinculados a Grupos de Chat, no a casas.
- **Tecnología:** Graffiti Vectorial (JSON). Cero imágenes pesadas. Limpieza semanal automática ("Sr. Paco").

### 3.2. Ciclo de Vida del Dato (Protocolo P2P)
Estrategia agresiva para no pagar almacenamiento en nube.
- **Nivel 1 (Niños Pequeños):** Todo efímero. Chats borrados cada noche. Fotos comprimidas (500kb), View-Only (sin descarga).
- **Nivel 2 (Adolescentes):**
  1. Envío: Se sube una **Preview** (500kb) temporal.
  2. Demanda: Si el receptor quiere la foto HD, solicita **Transferencia P2P**.
  3. Entrega: La foto viaja de móvil a móvil (WebRTC) sin guardarse en BD.
  4. Limpieza: Las previews no reclamadas se borran en 24h.
- **Nivel 3/4 (Adultos):** Retención temporal (1-2 semanas) con avisos de backup antes del borrado.

### 3.3. Seguridad (Ghost Watch)
- **Protocolo Tío-Sobrino:** Si un adulto ajeno (`Guest`) entra en un chat con un menor, los padres (`Admin`) tienen acceso de lectura pasiva (Read-Only) auditada.

---

## 4. FASE 3: GAMIFICACIÓN (EL ENGANCHE)
Objetivo: Convertir la convivencia en mecánica de juego.

### 4.1. Mesa de Juego Digital
- **Tecnología:** Cartas CSS/SVG (`ToxicCard`). Sin assets gráficos pesados.
- **Juego "El Asesino":** Objetivos secretos asignados por IA ("Haz que papá diga 'inflación' antes de la cena").
- **Juego "La Bolsa":** Subasta inversa de puntos para librarse de tareas indeseadas.
- **Juego "Zasca":** Duelos de cartas de texto rápido para resolver disputas menores.

---

## 5. FASE 4: NEGOCIO Y LEGAL
- **Suscripción:** Modelo "Loss Aversion" (Trial Inverso). Empiezas con todo Premium; si no pagas, pierdes personalización y funciones avanzadas.
- **Founders:** Estatus vitalicio para las primeras 15 familias.
- **Evidence Locker:** Hashing encriptado de chats reportados para custodia legal sin violar 
privacidad.

#ACTUALIZACION DE CONCEPTOS Y REVISION

# AXON OS: VISIÓN MAESTRA (v4.1)
> "Coste Cero. Fricción Cero. Sinceridad Absoluta."

## 🔒 PROTOCOLO DE SIGILO (STEALTH MODE)
- **Narrativa Pública:** "Herramienta offline y privada para gestión de stock."
- **Narrativa Interna:** "Sistema Operativo del Hogar."

## 1. MANIFIESTO Y FILOSOFÍA
- **Justicia Digital:** Estabilidad absoluta en Android Legacy (No autoFocus).
- **Soberanía:** El dato es de la familia. Sin anuncios. Sin servidores caros.

## 2. FASE 1: EL BÚNKER (ESTADO ACTUAL)
### 2.1. Arquitectura de Confianza Líquida
- **Cortes de Madurez:** Level 1 (6-10), Level 2 (11-15), Level 3 (16+).
- **Capabilities:** Permisos desacoplados del nivel para permitir "Niños Chef" o "Abuelos Activos".

### 2.2. Inteligencia de Suministros (Price-Aware)
- **Modelo Híbrido:** Guardamos un snapshot del nombre y categoría en cada lote para que el histórico de consumo sea inalterable aunque el producto padre cambie de nombre.
- **SSoT:** Una única tabla de categorías rige toda la app (types.ts).

## 3. ESTRATEGIA DE ACCESO (BETA)
- **Código Pionero:** Entrada mediante validación de código (ej: PIONERO2026).
- **Invitación Líquida:** Vinculación directa a `household_id` vía QR o Link Mágico.