# AgroFuturo — Backend (FastAPI)

Backend asíncrono en Python que procesa los datasets cargados de clima y suelo para servir algoritmos en tiempo real al frontend.

## Setup rápido

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Docs auto-generadas: http://localhost:8000/docs

## Estructura

- `backend/main.py` — API FastAPI con endpoints REST.
- `backend/data_loader.py` — Ingesta, limpieza, normalización y cacheo (`lru_cache`) de datasets.
- `backend/graph.py` — Construcción del grafo de zonas (distritos) combinando similitud de suelo y proximidad geográfica.
- `backend/algorithms.py` — Implementaciones específicas (DFS, BFS, divide y vencerás, QuickSort/MergeSort, Floyd–Warshall, K-Means, Bellman–Ford, Kosaraju).
- `backend/config.py` — Rutas a datasets y parámetros por defecto.

## Cómo se usan los datasets

- **Suelo** (`soil_huancayo_sintetico_50kv.2.xlsx - Sheet1.csv`): se agrega por `distrito` (promedios), se normalizan métricas (pH, MO_pct, CEC, N, P, K, pendiente, índice de calidad) y se calcula `soil_score`. Con esto se arma el grafo de zonas y se alimentan K-Means, Floyd–Warshall, Bellman–Ford y Kosaraju.
- **Clima** (`IGP_EstacionEMA_2018-2024_Dataset.xlsx - Worksheet.csv`): se parsean fechas (UTC), se agregan métricas mensuales y se sirven series de tiempo para QuickSort/MergeSort y el pipeline divide-y-vencerás.

## Endpoints clave

- `/health` — estado.
- `/datasets/summary` — resumen de filas, rangos y normalizaciones.
- `/soil/zones` — zonas agregadas con `soil_score`.
- `/climate/timeseries` — serie de tiempo por métrica (TT, HR, RR, PP, FF, DD).
- `/algorithms/divide-and-conquer` — procesamiento paralelo del clima.
- `/algorithms/sort` — QuickSort o MergeSort sobre clima o suelo.
- `/algorithms/floyd-warshall` — matriz de costos entre zonas.
- `/algorithms/kmeans` — clusters multivariables de suelo.
- `/algorithms/bellman-ford` — rutas de menor costo desde un distrito.
- `/algorithms/kosaraju` — componentes fuertemente conectadas (agrupaciones de calidad).

## Cómo se aplica cada algoritmo

- **Divide y Vencerás** (`/algorithms/divide-and-conquer`): particiona el dataset de clima en N chunks y procesa en paralelo con `ThreadPoolExecutor` para tiempos de respuesta bajos sobre series largas.
- **QuickSort / MergeSort** (`/algorithms/sort`): ordenan series de clima (TT, HR, RR, etc.) o métricas de suelo (`soil_score`, pH, MO, etc.) para rankings o dashboards en tiempo real.
- **Floyd–Warshall** (`/algorithms/floyd-warshall`): calcula la matriz de costos mínima entre todos los distritos (pesos = distancia combinada de suelo y geografía). Útil para heatmaps/matrices de relación.
- **K-Means** (`/algorithms/kmeans`): agrupa distritos por variables normalizadas de suelo (pH, MO, CEC, N, P, K, pendiente, índice de calidad). Devuelve centroides desnormalizados para interpretabilidad.
- **Bellman–Ford** (`/algorithms/bellman-ford`): caminos de menor “costo” desde un distrito a los demás, usando el mismo grafo; sirve para priorizar inversiones o rutas lógicas entre zonas similares.
- **Kosaraju** (`/algorithms/kosaraju`): identifica componentes fuertemente conectadas en el grafo dirigido (mejor → peor `soil_score`), agrupando zonas con flujo natural de calidad.

Todos los algoritmos usan exclusivamente los datasets cargados: suelo para grafo/agrupaciones y clima para series, splits y ordenamientos.

## Ejemplos de consumo desde el frontend

- Zonas para mapas: `GET http://localhost:8000/soil/zones?limit=20`
- Serie temperatura ordenada: `GET http://localhost:8000/algorithms/sort?dataset=climate&metric=TT&method=quicksort&limit=300`
- Clusters: `GET http://localhost:8000/algorithms/kmeans?k=4`
- Grafo para matrices: `GET http://localhost:8000/algorithms/floyd-warshall`

## Notas

- CORS está abierto para desarrollo local.
- Los algoritmos usan sólo los datasets provistos; no hay datos externos.
- Pensado para ejecutar en caliente junto al frontend que sirva en `localhost` (puertos libres).
