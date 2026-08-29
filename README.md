# Idiomas — curso de inglés (A1)

PWA estática para aprender inglés a ritmo libre (sin calendario), con exámenes espejo de TOEFL/IELTS. Todo el progreso vive en el dispositivo (IndexedDB); no hay backend.

**App en vivo:** https://jarbit8.github.io/languagues_learning/

## Stack
Vite · React 18 · TypeScript · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa. SPA 100% estática, deploy automático a GitHub Pages vía GitHub Actions.

## Desarrollo
```bash
npm install
npm run dev      # http://localhost:5173/languagues_learning/
npm run build    # genera dist/ (debe pasar sin errores antes de cada push)
npm run verificar # vocabulario adelantado + coherencia de los data packs
```

## Arquitectura
- **Contenido** en `/data` (packs JSON de vocabulario, gramática, listening). El código no hardcodea contenido: A2/B1/B2 entran como packs nuevos.
- **Estado** en Dexie (`src/db.ts`): solo el progreso del usuario.
- **Guías de construcción** en `.claude/skills/*` (curriculum, vocab-engine, exam-engine, grammar-engine, speaking-ai, listening-engine, ui-mobile, deploy).

## Privacidad
Repo público: ningún secreto en el código. La API key de Anthropic (para speaking y corrección de writing) la pega el usuario en Ajustes y vive solo en el `localStorage` de su dispositivo.
