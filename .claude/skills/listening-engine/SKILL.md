---
name: listening-engine
description: Usar al construir el módulo de listening - diálogos TTS con dos voces, preguntas de comprensión, recursos externos.
---
DIÁLOGOS GENERADOS: 2 por tema en data/listening/tema-XX.json (6-10 líneas, 2 hablantes, situación del tema, vocabulario restringido a temas vistos). Esquema: { "tema": N, "idioma": "en|fr", "titulo": "...", "lineas": [{"hablante":"A","texto":"..."}], "preguntas": [{"tipo":"...", "enunciado":"...", "respuesta":"...", "aceptadas":[...]}] }.
REPRODUCCIÓN: dos voces distintas de getVoices() (o variar pitch 0.9/1.1 si solo hay una). Rate 0.85 en bloques 1-2, 0.95 en bloques 3-4. Botón repetir ilimitado y "más lento".
TIPOS DE PREGUNTA: opción múltiple, V/F, completar dato, y anota_la_hora (obligatoria en todo diálogo donde calce desde bloque 2 — lo más evaluado en IELTS/TEF básico). Primera escucha sin transcripción, luego disponible con audio por línea.
RECURSOS EXTERNOS (pantalla fija con guía): inglés — VOA Learning English nivel 1, BBC Learning English, serie Extra English, dibujos con subtítulos en inglés. Francés — TV5Monde Apprendre le français A1, Alice Ayel, Français avec Pierre, Extr@ en français, Coffee Break French. Reglas visibles: subtítulos siempre en el idioma que escuchas nunca en español; listening pasivo cuenta pero mínimo 3 sesiones activas por semana con transcripción.
