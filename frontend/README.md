# Frontend de HemoVida

React y Vite. Requiere Node 22. Ejecuta `npm ci` y `npm run dev` para desarrollo. El proxy `/api` utiliza el backend local en el puerto 8000.

En Cloudflare: raíz `frontend`, build `npm ci && npm run build`, deploy `npm run deploy`. Configura `VITE_API_BASE_URL=https://hemovida-backend.onrender.com/api` como variable de build y reconstruye. No utiliza Gemini ni AI Studio. Consulta [la guía de despliegue](../DESPLIEGUE.md).
