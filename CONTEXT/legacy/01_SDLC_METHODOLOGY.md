# CONTEXT/01_SDLC_METHODOLOGY.md
# FUENTE DE VERDAD: ESTÁNDARES TÉCNICOS IBM (SDLC)

## 1. PROPÓSITO
Este documento establece los requisitos de ingeniería obligatorios para AXON. El agente debe validar cada tarea contra estos estándares antes de solicitar la aprobación del CPO (usuario).

## 2. MATRIZ DE EJECUCIÓN Y AUDITORÍA

| Fase SDLC | Estándares de Ingeniería (IBM) | Jerarquía de Calidad | Entregables y Documentación | Criterios de Auditoría (Checklist) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planificación** | Identificación de restricciones técnicas y de hardware. Metas y objetivos mediante SRS. | Planificación de garantía de calidad y requisitos de aceptación. | Documento SRS, URS y SySRS. | ¿El SRS define requisitos funcionales y no funcionales? ¿Se priorizaron los requisitos como 'imprescindibles'? |
| **2. Diseño** | Acoplamiento débil (loose coupling) y alta cohesión. Uso de UML (Clases, Secuencia, Transición). | Creación de planes de prueba y estrategias QA (Modelo en V). | Documento de Diseño (SDD) y planos arquitectónicos. | ¿Se han entregado diagramas UML antes de codificar? ¿Demuestra el diseño acoplamiento débil entre módulos? |
| **3. Desarrollo** | Arquitectura OO vs Procedimental. Uso obligatorio de IDEs, linters y formateadores. | Pruebas Unitarias realizadas por el desarrollador para cada función. | Comentarios de código, README técnico y PNT (SOPs). | ¿Está el código documentado para humanos? ¿Se han entregado los PNT para que el orquestador entienda el proceso? |
| **4. Pruebas** | Validación de entradas/salidas (Caja Negra). Funcionales, no funcionales y de regresión. | **Obligatorio:** Unitarias -> Integración -> Sistema -> Aceptación (UAT). | Matrices de trazabilidad y reportes de errores. | ¿Se ha seguido la jerarquía completa sin omitir niveles? ¿Se realizaron pruebas de regresión tras corregir errores? |
| **5. Implementación** | Topologías de n-niveles (Firewalls, Balanceadores, BD protegida). | Pruebas en entorno de Staging y despliegue Canary. | Uso de CI/CD y gestión de paquetes (npm/pip). | ¿Está la base de datos detrás de un firewall? ¿El entorno de staging replica fielmente el de producción? |
| **6. Mantenimiento** | Corrección de errores de alta prioridad y mejoras de UI/UX. | Pruebas de aceptación formal y retroalimentación Agile. | Gestión de versiones semánticas (Major.Minor.Patch). | ¿Sigue la nueva versión la numeración semántica (Ej: 1.0.1)? ¿Se actualizó la documentación de usuario? |

## 3. PROTOCOLO DE ACTUACIÓN PARA EL AGENTE
1. **Fase de Análisis:** Antes de proponer código, el agente debe identificar en qué fila de esta tabla se encuentra la solicitud actual.
2. **Fase de Propuesta:** El agente debe listar los "Entregables" que generará según la tabla.
3. **Fase de Verificación:** El agente debe autoevaluarse con los "Criterios de Auditoría" antes de entregar el trabajo al CPO.