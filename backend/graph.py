from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

import pandas as pd

from .config import FEATURE_WEIGHT, GEO_WEIGHT, K_NEIGHBORS


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km."""
    r = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


@dataclass
class ZoneGraph:
    nodes: Dict[str, Dict[str, float]]
    adjacency: Dict[str, List[Tuple[str, float]]]
    directed: Dict[str, List[Tuple[str, float]]]


def build_zone_graph(
    soil_grouped: pd.DataFrame,
    k_neighbors: int = K_NEIGHBORS,
    feature_weight: float = FEATURE_WEIGHT,
    geo_weight: float = GEO_WEIGHT,
) -> ZoneGraph:
    """Create an undirected + directed graph from district soil features."""
    records = soil_grouped.copy().reset_index(drop=True)
    feature_cols = [c for c in records.columns if c.endswith("_norm")]
    nodes = {
        row.distrito: {
            "lat": float(row.lat),
            "lon": float(row.lon),
            "soil_score": float(row.soil_score),
            **{c: float(getattr(row, c)) for c in feature_cols},
        }
        for row in records.itertuples(index=False)
    }

   
    geo_distances: Dict[Tuple[str, str], float] = {}
    max_geo = 0.0
    for i, row_i in records.iterrows():
        for j, row_j in records.iterrows():
            if i >= j:
                continue
            dist = haversine(row_i.lat, row_i.lon, row_j.lat, row_j.lon)
            geo_distances[(row_i.distrito, row_j.distrito)] = dist
            geo_distances[(row_j.distrito, row_i.distrito)] = dist
            max_geo = max(max_geo, dist)
    max_geo = max_geo or 1.0

    def combined_distance(a: pd.Series, b: pd.Series) -> float:
        feat_dist = 0.0
        for c in feature_cols:
            da = getattr(a, c)
            db = getattr(b, c)
            feat_dist += (da - db) ** 2
        feat_dist = math.sqrt(feat_dist)
        geo_d = geo_distances.get((a.distrito, b.distrito), 0.0) / max_geo
        return feature_weight * feat_dist + geo_weight * geo_d

    adjacency: Dict[str, List[Tuple[str, float]]] = {row.distrito: [] for _, row in records.iterrows()}
    for i, row_i in records.iterrows():
        distances: List[Tuple[str, float]] = []
        for j, row_j in records.iterrows():
            if i == j:
                continue
            score = combined_distance(row_i, row_j)
            distances.append((row_j.distrito, score))
        distances.sort(key=lambda x: x[1])
        adjacency[row_i.distrito] = distances[:k_neighbors]

    # Directed edges: flow from mejor a peor calidad
    directed: Dict[str, List[Tuple[str, float]]] = {k: [] for k in adjacency.keys()}
    for node, neighs in adjacency.items():
        node_score = nodes[node]["soil_score"]
        for neigh, weight in neighs:
            neigh_score = nodes[neigh]["soil_score"]
            if node_score >= neigh_score:
                directed[node].append((neigh, weight))

    return ZoneGraph(nodes=nodes, adjacency=adjacency, directed=directed)
