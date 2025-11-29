# AgroFuturo — Huancayo (Frontend)

Demo estática en HTML/CSS/JS que presenta una primera versión de AgroFuturo:
- Mapa Google Maps centrado en Huancayo con zonas.
- Capas: Aptitud, Suelo, Clima.
- Recomendación según presupuesto y objetivo (equilibrado/rendimiento/riesgo).
- Métricas y gráficos con datos de ejemplo.

## Ejecutar

Opción 1: abrir `index.html` directamente en el navegador.

Opción 2: servir en local (recomendado para evitar restricciones CORS de algunos navegadores):

```
npx serve -p 5173
# o
python3 -m http.server 5173
```

Luego abre: http://localhost:5173

## Estructura

- `index.html` — Shell de la página, layout y cargas de librerías (Google Maps, Chart.js).
- `styles.css` — Estilos y layout responsive.
- `app.js` — Lógica de mapa, datos de ejemplo, recomendador y gráficos.

## Notas

- Datos y polígonos son de ejemplo para UI. No son catastrales ni oficiales.
- Las coordenadas de Huancayo son aproximadas para esta demo.
- Necesitas una clave de Google Maps Javascript/Directions API. Sustituye `YOUR_GOOGLE_MAPS_API_KEY` en `index.html` por tu clave (con acceso al SDK de Maps y Directions).
