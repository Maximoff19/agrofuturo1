from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from .graph import ZoneGraph


def _cluster_metrics(graph: ZoneGraph, nodes: List[str]) -> Dict:
    # Summary stats for a set of nodes: tamaño, promedio de calidad de suelo y bounding box geográfico
    soil_scores = [graph.nodes[n]["soil_score"] for n in nodes]  # valores de soil_score
    latitudes = [graph.nodes[n]["lat"] for n in nodes]  # latitudes de nodos
    longitudes = [graph.nodes[n]["lon"] for n in nodes]  # longitudes de nodos
    return {
        "count": len(nodes),
        "soil_score_avg": float(np.mean(soil_scores)) if soil_scores else None,
        "lat_span": (float(min(latitudes)), float(max(latitudes))) if latitudes else None,
        "lon_span": (float(min(longitudes)), float(max(longitudes))) if longitudes else None,
    }


def _process_climate_chunk(chunk: pd.DataFrame, idx: int) -> Dict:
    # Agrega métricas climáticas por partición (usado en divide y vencerás)
    return {
        "chunk": idx,  # id de partición
        "rows": int(len(chunk)),  # filas en chunk
        "temp_avg": float(chunk["TT"].mean()),  # temperatura promedio
        "humidity_avg": float(chunk["HR"].mean()),  # humedad promedio
        "rain_total": float(chunk["RR"].sum()),  # lluvia acumulada
        "pressure_avg": float(chunk["PP"].mean()),  # presión promedio
    }


# --- Divide y vencerás clima (endpoint /algorithms/divide-and-conquer) ---
def run_divide_and_conquer(climate_df: pd.DataFrame, partitions: int = 4) -> Dict:
    """Divide el dataset de clima en N y procesa en paralelo (divide y vencerás)."""
    df = climate_df.sort_values("datetime").reset_index(drop=True)  # ordena cronológicamente
    partitions = max(1, partitions)  # al menos 1
    chunk_size = math.ceil(len(df) / partitions)  # tamaño por chunk
    chunks = [df.iloc[i : i + chunk_size] for i in range(0, len(df), chunk_size)]  # crea chunks

    with ThreadPoolExecutor(max_workers=partitions) as executor:  # pool threads
        results = list(executor.map(lambda args: _process_climate_chunk(*args), [(chunk, idx) for idx, chunk in enumerate(chunks)]))  # procesa en paralelo

    aggregate = {
        "rows": int(len(df)),
        "partitions": partitions,
        "temp_avg": float(np.mean([r["temp_avg"] for r in results])),
        "humidity_avg": float(np.mean([r["humidity_avg"] for r in results])),
        "rain_total": float(np.sum([r["rain_total"] for r in results])),
        "pressure_avg": float(np.mean([r["pressure_avg"] for r in results])),
    }
    return {"aggregate": aggregate, "partitions": results}


# --- QuickSort (endpoint /algorithms/sort; usado en frontend para ranking de zonas y series de clima) ---
# Front: quicksort ordena rankings de suelo/clima; se llama desde app.js al cargar el ranking inicial.
def quicksort(items: List[Dict], key: str) -> List[Dict]:
    # Ordena recursivamente usando QuickSort
    if len(items) <= 1:
        return items  # base
    pivot = items[len(items) // 2][key]  # pivote central
    left = [x for x in items if x[key] < pivot]  # menores
    middle = [x for x in items if x[key] == pivot]  # iguales
    right = [x for x in items if x[key] > pivot]  # mayores
    return quicksort(left, key) + middle + quicksort(right, key)


def run_sort(items: List[Dict], key: str, method: str = "quicksort", reverse: bool = False) -> List[Dict]:
    # Selecciona QuickSort (único método soportado) y opcionalmente revierte el orden
    sorted_items = quicksort(items, key)  # ordena
    if reverse:
        sorted_items.reverse()  # invierte si se requiere
    return sorted_items  # resultado




# --- K-Means (endpoint /algorithms/kmeans, clusters de suelo para mapas/dashboard) ---
def run_kmeans(features: pd.DataFrame, norm_meta: Dict[str, Tuple[float, float]], k: int = 4, max_iter: int = 20) -> Dict:
    feature_cols = [c for c in features.columns if c.endswith("_norm")]  # selecciona columnas ya normalizadas
    col_index = {c: idx for idx, c in enumerate(feature_cols)}  # mapea cada columna normalizada a su índice en la matriz
    data = features[feature_cols].to_numpy()  # convierte el dataframe a una matriz NumPy para cálculos vectorizados
    k = max(2, min(k, len(data)))  # asegura que k esté entre 2 y el número de filas disponibles

    rng = np.random.default_rng(seed=42)  # crea generador aleatorio con semilla fija para reproducibilidad
    centroids = data[rng.choice(len(data), size=k, replace=False)]  # elige k filas aleatorias como centroides iniciales
    labels = np.zeros(len(data), dtype=int)  # inicializa etiquetas de cluster para cada punto

    for _ in range(max_iter):  # itera hasta max_iter veces o hasta converger
        distances = np.linalg.norm(data[:, None, :] - centroids[None, :, :], axis=2)  # calcula distancias punto-centroide
        new_labels = np.argmin(distances, axis=1)  # asigna cada punto al centroide más cercano
        new_centroids = np.array(  # recalcula centroides como promedio de los puntos asignados
            [data[new_labels == i].mean(axis=0) if np.any(new_labels == i) else centroids[i] for i in range(k)]
        )
        if np.allclose(new_centroids, centroids, atol=1e-4):  # si los centroides no cambian (convergen) rompe el ciclo
            labels = new_labels
            centroids = new_centroids
            break
        labels = new_labels  # actualiza etiquetas para la siguiente iteración
        centroids = new_centroids  # actualiza centroides para la siguiente iteración

    clusters = []  # lista de clusters resultantes
    distrito_col = features["distrito"].tolist()  # almacena los nombres de distrito para mapearlos a clusters
    for idx in range(k):  # recorre cada cluster final
        members = [distrito_col[i] for i, lbl in enumerate(labels) if lbl == idx]  # extrae distritos pertenecientes al cluster
        centroid_denorm = {}  # preparará el centroide reescalado a valores originales
        for col, (min_v, max_v) in norm_meta.items():  # para cada variable normalizada
            norm_val = centroids[idx][col_index[f"{col}_norm"]]  # toma el valor normalizado del centroide en esa dimensión
            centroid_denorm[col] = float(min_v + norm_val * (max_v - min_v))  # reescala a rango original usando min/max
        clusters.append({"id": idx, "members": members, "centroid": centroid_denorm})  # agrega el cluster con miembros y centroide

    return {"k": k, "clusters": clusters}  # devuelve k usado y clusters con centroides desnormalizados


# --- Bellman–Ford (endpoint /algorithms/bellman-ford, rutas mínimas consumidas por frontend) ---
def run_bellman_ford(graph: ZoneGraph, source: str) -> Dict:
    # Caminos de menor costo desde un nodo origen (Bellman–Ford)
    nodes = list(graph.adjacency.keys())  # nodos
    dist = {n: float("inf") for n in nodes}  # distancias
    prev: Dict[str, str | None] = {n: None for n in nodes}  # predecesores
    dist[source] = 0.0  # origen a 0

    edges = [(u, v, w) for u, neighbors in graph.adjacency.items() for v, w in neighbors]  # aristas
    for _ in range(len(nodes) - 1):  # |V|-1 iteraciones
        updated = False  # flag
        for u, v, w in edges:  # relaja cada arista
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w  # actualiza distancia
                prev[v] = u  # guarda predecesor
                updated = True  # hubo cambio
        if not updated:
            break  # sin cambios => óptimo

    return {"source": source, "distance": dist, "prev": prev}

