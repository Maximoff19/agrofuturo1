from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CLIMATE_PATH = ROOT_DIR / "IGP_EstacionEMA_2018-2024_Dataset.xlsx - Worksheet.csv"
SOIL_PATH = ROOT_DIR / "soil_huancayo_sintetico_50kv.2.xlsx - Sheet1.csv"

# Hyperparameters for graph similarity
K_NEIGHBORS = 5
FEATURE_WEIGHT = 0.6
GEO_WEIGHT = 0.4

# Defaults for algorithm endpoints
DEFAULT_KMEANS_K = 4
DEFAULT_SORT_LIMIT = 200

