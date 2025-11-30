from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import algorithms
from .config import DEFAULT_KMEANS_K, DEFAULT_SORT_LIMIT, FEATURE_WEIGHT, GEO_WEIGHT
from .data_loader import (
    climate_timeseries,
    dataset_summary,
    load_climate,
    load_soil,
    soil_zones,
)
from .graph import build_zone_graph

logger = logging.getLogger("agrofuturo.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(
    title="AgroFuturo Analytics API",
    description="Backend en FastAPI para algoritmos de clima/suelo en Huancayo.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Preload datasets and graph
    climate_df, _ = load_climate()
    _, soil_grouped, norm_meta = load_soil()
    app.state.graph = build_zone_graph(soil_grouped)
    app.state.soil_grouped = soil_grouped
    app.state.norm_meta = norm_meta
    app.state.climate_df = climate_df
    logger.info("Backend listo con %s muestras de clima y %s distritos de suelo", len(climate_df), len(soil_grouped))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/datasets/summary")
async def datasets_summary():
    return dataset_summary()


@app.get("/soil/zones")
async def get_soil_zones(limit: int = Query(50, ge=1, le=200)):
    return {"zones": soil_zones(limit)}


@app.get("/climate/timeseries")
async def get_climate_timeseries(
    metric: str = Query("TT", description="TT (temp), HR (humedad), RR (lluvia), PP, FF, DD"),
    year: Optional[int] = Query(None),
    limit: int = Query(DEFAULT_SORT_LIMIT, ge=10, le=2000),
):
    try:
        series = climate_timeseries(metric=metric, year=year, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"metric": metric, "series": series}


def _default_start_node():
    soil_grouped = app.state.soil_grouped
    if soil_grouped is None or soil_grouped.empty:
        return None
    return soil_grouped.iloc[0].distrito


@app.get("/algorithms/divide-and-conquer")
async def divide_and_conquer(partitions: int = Query(4, ge=1, le=16)):
    climate_df = app.state.climate_df
    result = await asyncio.to_thread(algorithms.run_divide_and_conquer, climate_df, partitions)
    return result


@app.get("/algorithms/sort")
async def sort_series(
    dataset: str = Query("climate", description="climate|soil"),
    metric: str = Query("TT"),
    method: str = Query("quicksort", description="quicksort"),
    year: Optional[int] = Query(None),
    limit: int = Query(DEFAULT_SORT_LIMIT, ge=10, le=5000),
    reverse: bool = Query(False),
):
    dataset = dataset.lower()
    method = method.lower()
    if method != "quicksort":
        raise HTTPException(status_code=400, detail="Método inválido, usa quicksort")

    if dataset == "climate":
        series = climate_timeseries(metric=metric, year=year, limit=limit)
        items = [
            {"label": f"{s['year']}-{s['month']:02d}", "value": s["value"]}
            for s in series
            if s["value"] is not None
        ]
    elif dataset == "soil":
        zones = soil_zones(limit=limit)
        if metric not in zones[0]:
            raise HTTPException(status_code=400, detail=f"Métrica {metric} no existe en suelo")
        items = [{"label": z["distrito"], "value": z.get(metric)} for z in zones if z.get(metric) is not None]
    else:
        raise HTTPException(status_code=400, detail="Dataset inválido, usa climate o soil")

    if not items:
        return {"items": []}

    sorted_items = await asyncio.to_thread(algorithms.run_sort, items, "value", method, reverse)
    return {"dataset": dataset, "metric": metric, "method": method, "items": sorted_items}


@app.get("/algorithms/kmeans")
async def kmeans(k: int = Query(DEFAULT_KMEANS_K, ge=2, le=12)):
    soil_grouped = app.state.soil_grouped
    norm_meta = app.state.norm_meta
    result = await asyncio.to_thread(algorithms.run_kmeans, soil_grouped, norm_meta, k)
    return result


@app.get("/algorithms/bellman-ford")
async def bellman_ford(
    start: Optional[str] = Query(None),
    feature_weight: float = Query(FEATURE_WEIGHT, ge=0.0, le=1.0, description="Peso similitud de suelo"),
    geo_weight: float = Query(GEO_WEIGHT, ge=0.0, le=1.0, description="Peso distancia geográfica"),
):
    if feature_weight + geo_weight == 0:
        raise HTTPException(status_code=400, detail="feature_weight + geo_weight debe ser > 0")
    # Recalcula grafo con pesos personalizados (barato: pocos nodos)
    soil_grouped = app.state.soil_grouped
    graph = build_zone_graph(soil_grouped, feature_weight=feature_weight, geo_weight=geo_weight)
    start_node = start or _default_start_node()
    if start_node not in graph.nodes:
        raise HTTPException(status_code=404, detail=f"No se encontró el distrito {start_node}")
    result = await asyncio.to_thread(algorithms.run_bellman_ford, graph, start_node)
    return {
        "feature_weight": feature_weight,
        "geo_weight": geo_weight,
        **result,
    }



@app.get("/")
async def root():
    return {
        "message": "AgroFuturo backend listo",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
