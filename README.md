# ChandraMatch

Automated correspondence pipeline for co-registering **Chandrayaan-2 TMC-2** (5m/px) and **OHRC** (0.25m/px) lunar imagery captured under drastically different solar illumination (160° azimuth difference).

## Problem

ISRO Problem Statement #26166 — establishing sub-pixel correspondences between two sensors with a 21.6x resolution ratio and near-opposite sun angles, where traditional feature matchers fail due to reversed shadow/highlight patterns.

## Pipeline Overview

```
PDS4 Binary Images → Metadata Extraction → Geographic Crop Alignment
    → CLAHE + Gradient Representations → Multi-scale Matching
    → RANSAC Affine Verification → Registration → Evaluation
```

### Matching Backends

| Backend | Method | GPU Required | Best For |
|---------|--------|-------------|----------|
| `sift` | SIFT keypoints + Lowe's ratio test | No | Fast baseline, CPU-only deployment |
| `loftr` | LoFTR transformer (kornia) | No (CPU fallback) | Dense matching on textured regions |
| `lightglue` | SuperPoint + LightGlue | No (CPU fallback) | High-precision sparse matching |
| `ensemble` | SIFT + LoFTR combined | No (CPU fallback) | **Best overall** — highest inlier count and coverage |

### Results on pair_01 (TMC-2 vs OHRC, 160° solar difference)

| Metric | Ensemble (SIFT+LoFTR) | LightGlue+SuperPoint |
|--------|----------------------|---------------------|
| Raw matches | 1,574 | 184 |
| Inliers | 31 | 5 |
| RMSE (OHRC px) | 36.68 | 11.75 |
| RMSE (meters) | 9.17m | 2.94m |
| Spatial coverage | 15.6% | 6.2% |
| Affine determinant | 1.057 | 0.898 |

## Setup

### Prerequisites

- Python 3.11+
- CUDA GPU (optional, CPU fallback available)

### Install

```bash
git clone https://github.com/akshitgog/ChandraMatch.git
cd ChandraMatch
pip install -r requirements.txt
```

For LightGlue support (optional):

```bash
pip install git+https://github.com/cvg/LightGlue.git
```

### Dataset

Place the Chandrayaan-2 PDS4 data under a local directory and update `config/local.yaml`:

```yaml
dataset:
  local:
    root_dir: "/path/to/your/dataset/triplet_1"
  pairs:
    pair_01:
      tmc2_xml: "ch2_tmc_.../ch2_tmc_..._d18.xml"
      tmc2_img: "ch2_tmc_.../ch2_tmc_..._d18.img"
      ohrc_xml: "ch2_ohr_.../ch2_ohr_..._d18.xml"
      ohrc_img: "ch2_ohr_.../ch2_ohr_..._d18.img"
      pointing_offset_x: 200
      pointing_offset_y: -625
```

The pipeline reads PDS4 `.xml` metadata files and memory-maps the `.img` binary rasters to avoid RAM crashes on the full 295234x4000 (TMC-2) and 93693x12000 (OHRC) arrays.

## Usage

### Run the CLI Pipeline

```bash
python main.py
```

This runs the full pipeline on all pairs defined in `config/local.yaml` and writes results to `./outputs/`.

### Choose a Backend

Edit `config/local.yaml`:

```yaml
matching:
  backend: "ensemble"    # or: sift, loftr, lightglue
```

### Run the API Server (Local)

```bash
python app.py
```

Starts a FastAPI server on `http://localhost:8000`.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Health check |
| `GET` | `/api/backends` | List available matching backends |
| `POST` | `/api/match` | Upload two images, run matching, get results |

**Example — match two images via API:**

```bash
curl -X POST http://localhost:8000/api/match \
  -F "source=@tmc2_crop.png" \
  -F "reference=@ohrc_crop.png" \
  -F "backend=ensemble"
```

**Query parameters for `/api/match`:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `backend` | `sift` | Matching backend to use |
| `source_resolution` | `5.0` | Source image GSD (m/px) |
| `reference_resolution` | `0.25` | Reference image GSD (m/px) |

**Response:**

```json
{
  "metrics": {
    "candidate_match_count": 1574,
    "inlier_count": 31,
    "rmse_pixels": 36.68,
    "rmse_meters": 9.17,
    "spatial_coverage_ratio": 0.156
  },
  "visualizations": {
    "overlay": "<base64 PNG>",
    "inlier_matches": "<base64 PNG>",
    "checkerboard": "<base64 PNG>"
  }
}
```

## Deploy on Render (Free Tier)

The repo includes Render deployment config. No GPU needed — PyTorch runs on CPU.

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render auto-detects `render.yaml`
4. Set environment variable `HF_TOKEN` if using HuggingFace datasets
5. Deploy

**What happens:**
- `build.sh` installs CPU-only PyTorch (no CUDA bloat)
- `config/render.yaml` is used (defaults to SIFT backend, outputs to `/tmp`)
- The API accepts image uploads — no local PDS4 dataset needed on Render

**Render files:**

| File | Purpose |
|------|---------|
| `render.yaml` | Render blueprint (service definition) |
| `build.sh` | Render build script (CPU-only torch) |
| `requirements-render.txt` | CPU-only dependencies |
| `config/render.yaml` | Server-side config (no local dataset, SIFT default) |

## Configuration Reference

All parameters live in `config/local.yaml`. Key sections:

```yaml
preprocessing:
  clahe:
    clip_limit: 3.0        # CLAHE contrast limit
    tile_size: 8            # CLAHE grid size

scale:
  pyramid:
    scales: [1.0, 0.75, 0.5]  # Multi-scale pyramid levels

matching:
  backend: "ensemble"          # sift | loftr | lightglue | ensemble
  confidence_threshold: 0.3    # Min match confidence
  dedup_radius: 3.0            # Pixel radius for deduplication

geometric_verification:
  model: "affine"
  ransac:
    threshold: 3.0             # RANSAC reprojection threshold (px)
    max_iters: 10000
    confidence: 0.999
  sanity:
    min_determinant: 0.1       # Reject degenerate transforms
    min_inliers: 5
```

## Output Structure

```
outputs/pair_01/
├── metadata.json                    # Pair metadata
├── matches/
│   ├── matches_raw.csv              # All candidate matches
│   └── matches_inliers.csv          # RANSAC-verified inliers
├── registration/
│   ├── transform.json               # Affine/homography matrix
│   └── registered.tif               # TMC-2 warped to OHRC space
├── visualization/
│   ├── inlier_matches.png           # Side-by-side match plot
│   ├── overlay.png                  # Blended registration overlay
│   └── checkerboard.png             # Checkerboard alignment view
└── metrics.json                     # RMSE, coverage, inlier stats
```

## Project Structure

```
ChandraMatch/
├── main.py                          # CLI entry point
├── app.py                           # FastAPI server
├── config/
│   ├── local.yaml                   # Local development config
│   └── render.yaml                  # Render deployment config
├── src/
│   ├── pipeline.py                  # Main pipeline orchestrator
│   ├── config/loader.py             # YAML config loader
│   ├── data/
│   │   ├── pair.py                  # ImagePair + SensorMetadata dataclasses
│   │   ├── dataset_loader.py        # PDS4 binary loading via memmap
│   │   └── metadata.py              # PDS4 XML metadata parser
│   ├── correspondence/
│   │   ├── base.py                  # Abstract CorrespondenceMethod interface
│   │   ├── sift.py                  # SIFT matcher
│   │   ├── loftr.py                 # LoFTR transformer matcher
│   │   ├── lightglue_matcher.py     # LightGlue+SuperPoint matcher
│   │   └── ensemble.py              # Multi-method ensemble
│   └── utils/
│       ├── logging.py               # Logger setup
│       └── exceptions.py            # Custom exceptions
├── render.yaml                      # Render blueprint
├── build.sh                         # Render build script
├── requirements.txt                 # Local dependencies
└── requirements-render.txt          # CPU-only dependencies for Render
```
