---
name: grammar-engine
description: Usar al construir el módulo de gramática y generar data/gramatica - formato de lección por tema e idioma, tipos de ejercicio.
---
Por tema hay DOS archivos: data/gramatica/tema-XX-en.json y tema-XX-fr.json, según el contenido gramatical exacto de curriculum/references/temario-a1.md.
ESQUEMA: { "tema": N, "idioma": "en|fr", "titulo": "...", "regla": "explicación en español, máx 120 palabras, con la trampa típica del hispanohablante", "ejemplos": [{"frase":"...","traduccion":"..."}], "trampa": "...", "ejercicios": [15 por idioma por tema] }.
TIPOS DE EJERCICIO: hueco, opcion_multiple (distractores = errores típicos de hispanohablante), ordenar, corregir_error, traducir. Distribución sugerida: 4 hueco, 3 opción múltiple, 3 ordenar, 3 corregir, 2 traducir, dificultad progresiva.
REGLAS: vocabulario restringido a ese tema y anteriores. Ejemplos con la vida del usuario cuando calce natural (estudiante de informática, Arequipa, bici, familia en Canadá). Corrección 100% offline (normalizar mayúsculas/tildes/apóstrofes). Lección se marca "completada" la primera vez que se terminan sus 15 ejercicios (requisito del examen de tema), repetible infinitas veces.
