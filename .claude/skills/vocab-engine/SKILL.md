---
name: vocab-engine
description: Usar al construir o modificar el módulo de vocabulario - tarjetas duales, marcado libre, SRS, audio, formato JSON de packs.
---
PRINCIPIO: el usuario decide cuántas palabras aprende y cuándo. Sin cuota diaria ni presión de calendario; el sistema solo registra qué marcó y cuándo, para armar examen diario y repasos.
TARJETA (concepto dual): español + inglés + francés + audio por idioma + ejemplo A1 por idioma + nota opcional. Esquema JSON: { "tema": N, "titulo": "...", "conceptos": [ { "id": "a1-tNN-NNN", "es": "...", "en": {"texto":"...","ejemplo":"..."}, "fr": {"texto":"...","ejemplo":"..."}, "nota": "opcional" } ] }. Genera los packs de los 24 temas con ~30 conceptos cada uno según el temario. Ejemplos SIEMPRE con gramática ya vista en temas anteriores o el actual.
FLUJO: usuario abre tema en curso → ve tarjetas con estado → toca una → escucha audios → botón "Aprendida ✓" (puede desmarcar el mismo día) → contador "hoy marcaste N palabras" alimenta el examen diario.
SRS 3 CAJAS: nueva→aprendida(timestamp)→en_repaso→dominada. Repaso a +1, +3, +7 días del marcado. Acierta las 3 → dominada. Falla en cualquier examen → vuelve a caja 1 (+1 día). Repasos vencidos se acumulan sin castigo ni mensajes de culpa.
AUDIO: SpeechSynthesisUtterance lang en-US (fallback en-GB) y fr-FR (fallback fr-CA), rate 0.9. Verificar voces con speechSynthesis.getVoices() (carga asíncrona, escuchar voiceschanged); si falta, aviso único con instrucciones de instalación. Reproducir también el ejemplo, no solo la palabra.
PERSISTENCIA (Dexie): palabras { id, estado, fechaAprendida, cajaSRS, proximoRepaso, aciertosSeguidos, fallosTotales }. El contenido se lee de los JSON; Dexie solo guarda estado.
