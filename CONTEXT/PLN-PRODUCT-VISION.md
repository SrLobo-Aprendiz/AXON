# PLN-PRODUCT-VISION: VISIÓN MAESTRA (v4.1)

> "Coste Cero. Fricción Cero. Sinceridad Absoluta."

## 1. MANIFIESTO Y FILOSOFÍA

Axon no es una app de tareas; es un Sistema Operativo para la convivencia familiar.

- **Justicia Digital:** Estabilidad absoluta en Android Legacy (No autoFocus).
- **Soberanía:** El dato es de la familia. Sin anuncios. Sin servidores caros.
- **Usuario:** Familias con adolescentes. Si el adolescente no la borra, ganamos.

## 2. FASE 1: EL BÚNKER (LOGÍSTICA Y NÚCLEO)

Objetivo: Utilidad inmediata y gestión del caos.

### 2.1. Arquitectura de Confianza Líquida

- **Cortes de Madurez:** Level 1 (6-10), Level 2 (11-15), Level 3 (16+), Level 4 (Parents/Admin).
- **Capabilities (Permisos Desacoplados):** Los permisos no dependen solo de la edad para permitir escenarios como "Niños Chef" o "Abuelos Activos".

### 2.2. La Nevera "Multicapa" (The Fridge)

Tablero digital compartido que resuelve el conflicto orden vs. caos.

- **Capa Base (Admin):** Imanes funcionales (Lista, Menú). Solo editables por Nivel 3+.
- **Capa Personal (Caos):** Capa superpuesta donde cada usuario coloca notas/dibujos sin afectar la base.

### 2.3. Inteligencia de Suministros (Price-Aware)

- **Productos vs. Lotes:** Distinción entre productos "Estructurales" (si se acaban, el sistema avisa) y "Temporales/Ghost" (si se acaban, desaparecen para no ensuciar la BD).
- **Estrategia Híbrida:** Se guarda un snapshot del nombre y categoría en cada lote para mantener el historial intacto aunque el producto padre sea modificado.
- **Captura Rápida (Quick Capture):** Entrada fricción cero directo a un Inbox. Mantenimiento diferido (rellenar prioridades/caducidades a posteriori).

## 3. FASE 2: IDENTIDAD Y DATOS (EL ESCUDO)

Objetivo: Retención adolescente mediante espacios de expresión y viabilidad técnica "Data Diet".

### 3.1. Social Spaces (La Persiana y El Callejón)

- **Skins:** "Persiana Metálica" (Cyberpunk) o "Muro de Ladrillo".
- **Squad Walls:** Muros vinculados a grupos intra y extra-familia (El Callejón con "Visados de Artista").
- **Tecnología:** Graffiti Vectorial (JSON). Cero imágenes pesadas. Limpieza automática ("Sr. Paco").

### 3.2. Ciclo de Vida del Dato (P2P Media)

- Nivel 1 (Niños): Efímero. Fotos comprimidas (500kb), sin descarga.
- Nivel 2 (Adolescentes): Preview subida. Transferencia real en HD vía **P2P (WebRTC)**. Cero coste de S3.
- Seguridad (Ghost Watch): Permite a padres lectura pasiva si un adulto ajeno entra al chat con un menor.

## 4. FASE 3: GAMIFICACIÓN (EL ENGANCHE)

Objetivo: Convertir la convivencia en juego usando `ToxicCard` (Cartas CSS/SVG).

- **"El Asesino":** Objetivos secretos ("Haz que papá diga X").
- **"La Bolsa":** Subasta inversa para librarse de tareas.
- **"Zasca":** Duelos de cartas rápidas para disputas menores.

## 5. FASE 4: NEGOCIO Y LEGAL

- Suscripción "Loss Aversion" (Empiezas Premium -> lo pierdes).
- Founders: Estatus vitalicio primeras 15 familias.
- Evidence Locker: Hashing encriptado para custodia legal

## COMPARACION PARA ARREGLAR CELDAS DE STOCK EN MOVIL

> > > [Get-Content "C:\Users\jugen\OneDrive\Documentos\REPOS\AXON\src\components\StockModal
> > > ... .tsx"] | [Get-Content "C:\Users\jugen\OneDrive\Documentos\REPOS\AXON\AXON-main para c
> > > ... omparar\src\components\StockModal.tsx"]
> > > ... PROMPT_USUARIO:
> > > ... Qwen, ahora tienes en tu contexto (arriba) el contenido de ambos archivos. El primero
> > > ... es de la versión 'Labs' (con error de recorte en móvil en Avisos y Despensa) y el se
> > > ... gundo es de la versión 'Main' (donde funciona bien).
> > > ... Busca diferencias en las clases de TailwindCSS de los contenedores de listas de Aviso
> > > ... s y Despensa. No me des la solución, guíame para encontrar el culpable del recorte vi
> > > ... sual.
> > > Entiendo. Vamos a analizar el contenido de ambos archivos para identificar las diferencias en las clases de TailwindCSS que pueden estar causando el problema de diseño responsivo en los contenedores de listas de "Avisos" y "Despensa".

### Paso 1: Identificar secciones relevantes

Primero, debemos identificar las secciones específicas de los archivos donde se definen los contenedores de listas de "Avisos" y "Despensa". Estas secciones pueden estar dentro del archivo `StockModal.tsx` o en archivos separados dentro de la carpeta `stock`.

### Paso 2: Buscar clases de TailwindCSS relevantes

Buscaremos las clases de TailwindCSS que controlan el diseño responsivo, como anchos (`w-full`, `max-w-x`, `w-screen`), desbordamientos (`overflow-x-hidden`, `overflow-hidden`), y márgenes/padding (`pr-`, `mr-`, `p-`).

### Paso 3: Comparar las clases de TailwindCSS

Compararemos las clases de TailwindCSS en ambas versiones para identificar cualquier diferencia que pueda estar causando el problema.

### Ejemplo de análisis

A continuación, te muestro un ejemplo de cómo podríamos analizar las secciones relevantes:

#### Sección de "Avisos" y "Despensa"

Supongamos que en ambos archivos hay una sección similar a la siguiente:

```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Avisos */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Despensa */}
  </div>
</div>
```

### Paso 4: Analizar diferencias

Compararemos las clases de TailwindCSS en ambas versiones:

#### Versión 'Labs' (con error)

```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
    {/* Contenido de Avisos */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
    {/* Contenido de Despensa */}
  </div>
</div>
```

#### Versión 'Main' (funciona bien)

```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Avisos */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Despensa */}
  </div>
</div>
```

### Identificación del problema

En la versión 'Labs', se han añadido las clases `overflow-x-hidden` a los contenedores de "Avisos" y "Despensa". Estas clases pueden estar causando un recorte visual en pantallas más pequeñas.

### Guía para identificar el culpable

1. **Identifica la sección específica**: Localiza las secciones donde se definen los contenedores de listas de "Avisos" y "Despensa".
2. **Compara las clases de TailwindCSS**: Revisa cuidadosamente las clases de TailwindCSS utilizadas en ambas versiones.
3. **Busca diferencias**: Identifica cualquier clase adicional o diferente que pueda estar causando el problema.

### Ejecución

Puedes seguir estos pasos para identificar la causa del recorte visual:

1. **Abre ambos archivos** en tu editor de código.
2. **Localiza las secciones de "Avisos" y "Despensa"**.
3. **Compara las clases de TailwindCSS** utilizadas en ambas versiones.
4. **Identifica cualquier clase adicional o diferente** que pueda estar causando el problema.

Si encuentras alguna diferencia, puedes probar a eliminar la clase adicional en la versión 'Labs' y ver si se soluciona el problema de recorte visual.

### Resumen

1. Identifica las secciones relevantes de "Avisos" y "Despensa".
2. Compara las clases de TailwindCSS utilizadas en ambas versiones.
3. Busca diferencias que puedan estar causando el problema de recorte visual.
4. Probar cambios para identificar el culpable.

Si necesitas más ayuda o tienes alguna pregunta específica, por favor avísame.

> > > se solucionaria simplemente cambiando lo que pone en una version con la de la otra?
> > > Es posible que simplemente copiar las clases de TailwindCSS de la versión 'Main' a la versión 'Labs' resuelva el problema, pero antes de hacer eso, es importante entender por qué la versión 'Main' funciona correctamente.

El problema de recorte visual puede estar relacionado con cómo las clases de TailwindCSS se aplican y cuánto espacio ocupan en diferentes tamaños de pantalla. Por ejemplo, si en la versión 'Labs' se utiliza `overflow-x-hidden` en un contenedor que tiene más contenido del que cabe, esto puede causar un recorte visual.

Para solucionar el problema:

1. **Identifica las clases de TailwindCSS** utilizadas en ambas versiones para los contenedores de "Avisos" y "Despensa".
2. **Compara estas clases** entre la versión 'Labs' y 'Main'.
3. **Elimina o modifica las clases en la versión 'Labs'** si necesitas replicar el comportamiento de la versión 'Main'.

Aquí hay un ejemplo de cómo podrías hacerlo:

1. **En la versión 'Labs':**

```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
    {/* Contenido de Avisos */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
    {/* Contenido de Despensa */}
  </div>
</div>
```

2. **Elimina `overflow-x-hidden`** o modifica las clases según la versión 'Main':

```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Avisos */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Contenido de Despensa */}
  </div>
</div>
```

3. **Prueba la versión modificada** en diferentes tamaños de pantalla para asegurarte de que el problema de recorte visual se haya solucionado.

Si después de hacer estos cambios el problema persiste, es posible que necesites revisar otras partes del código o las clases de TailwindCSS utilizadas en los componentes hijos dentro de "Avisos" y "Despensa".

Recuerda siempre realizar pruebas para asegurarte de que la solución no introduzca otros problemas.
