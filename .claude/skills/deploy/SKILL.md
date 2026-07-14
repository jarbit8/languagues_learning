---
name: deploy
description: Usar al configurar o arreglar el despliegue a GitHub Pages - workflow, base path, PWA bajo subruta, verificación.
---
FLUJO: push a main → GitHub Actions construye → publica en Pages → https://jarbit8.github.io/languagues_learning/.
WORKFLOW .github/workflows/deploy.yml: on push a main; permissions contents:read, pages:write, id-token:write; concurrency group pages cancel-in-progress true; job build con actions/checkout@v4, actions/setup-node@v4 (node 20, cache npm), npm ci, npm run build, actions/upload-pages-artifact@v3 (path dist); job deploy con environment github-pages y actions/deploy-pages@v4.
CONFIGURACIÓN MANUAL (una vez, la hace el usuario): GitHub → Settings → Pages → Source: GitHub Actions. Sin esto el deploy falla.
REGLAS DE SUBRUTA: vite.config.ts base '/languagues_learning/' exacto; rutas de assets y data siempre relativas o vía import.meta.env.BASE_URL, nunca empezar con '/' a secas; HashRouter o tabs por estado, nunca BrowserRouter; vite-plugin-pwa start_url y scope respetando el base.
VERIFICACIÓN POST-DEPLOY: Action en verde → abrir URL en celular → carga, TTS funciona, instalable → modo avión: sigue funcionando salvo speaking → service worker autoactualiza sin quedar cacheada versión vieja.
SEGURIDAD: repo público, jamás commitear keys ni .env. Si una key toca un commit, se considera quemada: revocarla y generar otra.
