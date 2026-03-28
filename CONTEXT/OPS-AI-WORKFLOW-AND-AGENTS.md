# AXON: Inteligencia Artificial y Flujo de Trabajo Híbrido

Este documento recoge la estrategia técnica adoptada en AXON para el uso eficiente de modelos de Inteligencia Artificial (IA) en el desarrollo de la aplicación, optimizando la cuota (tokens de "la nube") y maximizando el poder de procesamiento de nuestros modelos de ejecución en local (Hardware del usuario / GPU local).

## Teoría del Flujo Híbrido

En el ecosistema complejo de este proyecto nos apoyaremos en la dupla: **Orquestador en la Nube + Obrero en Local.**
- **El modelo central (cloud):** Actúa como líder técnico. Lee repositorios enteros, busca errores estructurales arquitectónicos complejos, sugiere qué archivos revisar y genera comandos terminales para ser ejecutados.
- **El modelo local (ej. Ollama qwen2.5-coder:14b):** Ejecuta tareas crudas de alto consumo de tokens. Como no gasta crédito ni cuota central, se usa para refactorizados en bloque, escritura tediosa de boilerplate, y revisión manual de líneas y rutinas algorítmicas largas (ej. calculadores de stock fantasma).

## Implementación "Zero-Token-Cost" vía Terminal

Como la herramienta MCP local instalada actualmente (`preguntar_a_ollama`) consume tokens de input del orquestador central para transcribir el código, el protocolo de desarrollo óptimo para delegar modificaciones a nuestro servidor Ollama local será el uso directo de PowerShell (Pipes).

**Comando Estándar para PowerShell (Windows):**
```powershell
Get-Content "[RUTAS_DE_ARCHIVO_SEPARADAS_POR_COMA]" -Raw | ollama run [MODELO_LOCAL] "[PROMPT_ESTRUCTURADO]"
```

*Ejemplo:*
```powershell
Get-Content "src\components\FridgeCanvas.tsx" -Raw | ollama run qwen2.5-coder:14b "Eres un experto en React..."
```

## Estructura de PROMPT Estándar para Ollama Local

Para evitar recortes destructivos o pérdidas de contexto del modelo Open Source local, nuestros prompts de delegación deben regirse SIEMPRE bajo las siguientes directrices:

1.  **Poca Pista, Mucho Contexto:** Pasarle el archivo completo (`-Raw`) y que el modelo deba hacer `Ctrl+F` (buscar lógicamente) su zona de trabajo mediante contexto verbal. No aislarle pequeñas líneas o perderá las etiquetas colindantes.
2.  **No sobrescribir / No Borrar. Solo comentar:** Pedir expresamente que **comente la línea original afectada y pegue la solución justo debajo**, de modo que actúe como una medida de seguridad (undo point) visible.
3.  **Migas de Pan obligatorias (Tags):** Obligar al modelo a que encapsule todas sus respuestas y bloques de código insertados con el tag: `// FIX: OLLAMA local`. De este modo, en el futuro sabremos de un simple vistazo con `Ctrl+F` y `git diff` cuáles fueron las líneas tocadas por la IA local.
4.  **Explicación Humano->Humano:** La respuesta en la consola debe indicar exactamente la ruta y una descripción textual de qué bloque ha cambiado para que el usuario o el Agente Central sepan exactamente a qué altura de VS Code pegar el *snippet*.

## El Futuro: Agentes de Automatización Autónomos Locales

Para llevar este modelo de delegación manual a un estado "completamente desatendido", el siguiente paso de la infraestructura técnica de AXON será equiparle manos virtuales al modelo local de Ollama. Se estudiará el lanzamiento de los siguientes engranajes:

1.  **Aider:** Herramienta de interfaz de comandos (CLI). Lanza los *commits* automáticos y la edición en crudo de los archivos pasándole parámetros interactivos en el chat la consola. Ideal para "Refactorízame todo este directorio usando Qwen".
2.  **Cline (Roo Code) o Continue.dev:** Extensiones como ventanas laterales dentro de VS Code para poder tener el chat acoplado donde le digamos qué archivo usar activamente bajo consumo cero.

**Conclusión:**
Este documento sirve como ancla operativa para no consumir cuotas en tareas braquiales y derivarlas siempre al ecosistema local del PC, mientras el Orquestador principal (Agente de Google) toma decisiones estructurales.
