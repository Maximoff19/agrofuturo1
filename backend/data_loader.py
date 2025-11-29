from __future__ import annotations

import logging
from functools import lru_cache
from typing import Dict, List, Tuple

import pandas as pd

from .config import CLIMATE_PATH, SOIL_PATH

logger = logging.getLogger(__name__)


def _normalize_columns(df: pd.DataFrame, cols: List[str]) -> Dict[str, Tuple[float, float]]:
    """Add *_norm columns and return min/max metadata."""
    meta: Dict[str, Tuple[float, float]] = {}
    for col in cols:
        min_v = df[col].min()
        max_v = df[col].max()
        span = max_v - min_v
        if span == 0:
            df[f"{col}_norm"] = 0.0
            meta[col] = (min_v, max_v)
            continue
        df[f"{col}_norm"] = (df[col] - min_v) / span
        meta[col] = (min_v, max_v)
    return meta


@lru_cache(maxsize=1)
def load_climate():
    """Read and enrich the climate dataset."""
    if not CLIMATE_PATH.exists():
        raise FileNotFoundError(f"No se encontró el dataset de clima en {CLIMATE_PATH}")

    df = pd.read_csv(CLIMATE_PATH)
    numeric_cols = ["TT", "HR", "RR", "PP", "FF", "DD"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Build datetime index
    df["YY"] = pd.to_numeric(df["YY"], errors="coerce")
    df["MM"] = pd.to_numeric(df["MM"], errors="coerce")
    df["DY"] = pd.to_numeric(df["DY"], errors="coerce")
    df["HH"] = pd.to_numeric(df["HH"], errors="coerce")
    df["datetime"] = pd.to_datetime(
        dict(year=df["YY"], month=df["MM"], day=df["DY"], hour=df["HH"]),
        errors="coerce",
        utc=True,
    )
    df = df.dropna(subset=["datetime"])
    df["year"] = df["datetime"].dt.year
    df["month"] = df["datetime"].dt.month

    monthly = (
        df.groupby(["year", "month"])
        .agg(
            temp_avg=("TT", "mean"),
            humidity_avg=("HR", "mean"),
            rain_total=("RR", "sum"),
            pressure_avg=("PP", "mean"),
            wind_avg=("FF", "mean"),
        )
        .reset_index()
        .sort_values(["year", "month"])
    )

    logger.info("Clima cargado: %s filas, rango años %s-%s", len(df), df["year"].min(), df["year"].max())
    return df, monthly


@lru_cache(maxsize=1)
def load_soil():
    """Read and aggregate the soil dataset at district level."""
    if not SOIL_PATH.exists():
        raise FileNotFoundError(f"No se encontró el dataset de suelo en {SOIL_PATH}")

    df = pd.read_csv(SOIL_PATH)
    numeric_cols = [
        "lat",
        "lon",
        "arena_pct",
        "limo_pct",
        "arcilla_pct",
        "MO_pct",
        "pH",
        "CE_dS_m",
        "densidad_aparente_g_cm3",
        "CEC_cmol_kg",
        "N_total_pct",
        "P_disponible_mg_kg",
        "K_intercambiable_mg_kg",
        "pendiente_pct",
        "profundidad_efectiva_cm",
        "indice_calidad_suelo",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["fecha_muestra"] = pd.to_datetime(df["fecha_muestra"], errors="coerce")

    grouped = (
        df.groupby("distrito")
        .agg(
            provincia=("provincia", "first"),
            lat=("lat", "mean"),
            lon=("lon", "mean"),
            muestras=("distrito", "count"),
            arena_pct=("arena_pct", "mean"),
            limo_pct=("limo_pct", "mean"),
            arcilla_pct=("arcilla_pct", "mean"),
            MO_pct=("MO_pct", "mean"),
            pH=("pH", "mean"),
            CE_dS_m=("CE_dS_m", "mean"),
            densidad_aparente_g_cm3=("densidad_aparente_g_cm3", "mean"),
            CEC_cmol_kg=("CEC_cmol_kg", "mean"),
            N_total_pct=("N_total_pct", "mean"),
            P_disponible_mg_kg=("P_disponible_mg_kg", "mean"),
            K_intercambiable_mg_kg=("K_intercambiable_mg_kg", "mean"),
            pendiente_pct=("pendiente_pct", "mean"),
            profundidad_efectiva_cm=("profundidad_efectiva_cm", "mean"),
            indice_calidad_suelo=("indice_calidad_suelo", "mean"),
        )
        .reset_index()
    )

    feature_cols = [
        "pH",
        "MO_pct",
        "CEC_cmol_kg",
        "N_total_pct",
        "P_disponible_mg_kg",
        "K_intercambiable_mg_kg",
        "pendiente_pct",
        "indice_calidad_suelo",
    ]
    norm_meta = _normalize_columns(grouped, feature_cols)
    grouped["soil_score"] = grouped[[f"{c}_norm" for c in feature_cols]].mean(axis=1)
    grouped = grouped.sort_values("soil_score", ascending=False)

    logger.info("Suelo cargado: %s filas crudas, %s distritos", len(df), len(grouped))
    return df, grouped, norm_meta


def dataset_summary() -> Dict:
    climate_df, monthly = load_climate()
    soil_df, soil_grouped, norm_meta = load_soil()

    return {
        "climate": {
            "rows": int(len(climate_df)),
            "years": {"min": int(climate_df["year"].min()), "max": int(climate_df["year"].max())},
            "monthly_records": int(len(monthly)),
            "ubigeos": climate_df["UBIGEO"].nunique(),
        },
        "soil": {
            "rows": int(len(soil_df)),
            "distritos": int(soil_grouped["distrito"].nunique()),
            "provincia": soil_grouped["provincia"].unique().tolist(),
            "feature_norms": {k: {"min": float(v[0]), "max": float(v[1])} for k, v in norm_meta.items()},
        },
    }


def climate_timeseries(metric: str, year: int | None = None, limit: int = 500) -> List[Dict]:
    climate_df, _ = load_climate()
    metric = metric.upper()
    if metric not in climate_df.columns:
        raise ValueError(f"Metric {metric} no existe en el dataset de clima")

    df = climate_df
    if year:
        df = df[df["year"] == year]
    df = df.sort_values("datetime")
    records = (
        df[["datetime", metric, "UBIGEO", "year", "month"]]
        .head(limit)
        .assign(timestamp=lambda x: x["datetime"].astype("int64") // 10**9)
    )
    return [
        {
            "timestamp": int(row.timestamp),
            "value": float(getattr(row, metric)) if pd.notna(getattr(row, metric)) else None,
            "ubigeo": getattr(row, "UBIGEO"),
            "year": int(getattr(row, "year")),
            "month": int(getattr(row, "month")),
        }
        for row in records.itertuples(index=False)
    ]


def soil_zones(limit: int = 50) -> List[Dict]:
    _, grouped, _ = load_soil()
    records = grouped.head(limit)
    cols = [
        "distrito",
        "provincia",
        "lat",
        "lon",
        "muestras",
        "pH",
        "MO_pct",
        "CEC_cmol_kg",
        "N_total_pct",
        "P_disponible_mg_kg",
        "K_intercambiable_mg_kg",
        "pendiente_pct",
        "indice_calidad_suelo",
        "soil_score",
    ]
    cleaned: List[Dict] = []
    for row in records[cols].itertuples(index=False):
        item: Dict = {}
        for idx, col in enumerate(cols):
            val = row[idx]
            if col in ("distrito", "provincia"):
                item[col] = val
            else:
                item[col] = float(val) if pd.notna(val) else None
        cleaned.append(item)
    return cleaned
