import os
import io
import json
import base64
import tempfile
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.config.loader import load_config
from src.utils.logging import logger
from src.data.pair import ImagePair, SensorMetadata

app = FastAPI(
    title="ChandraMatch API",
    description="Chandrayaan-2 TMC-2/OHRC Correspondence Pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_PATH = os.environ.get("CHANDRAMATCH_CONFIG", "config/render.yaml")


def _load_image_from_upload(upload: UploadFile) -> np.ndarray:
    contents = upload.file.read()
    arr = np.frombuffer(contents, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {upload.filename}")
    if img.ndim == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img


def _encode_image(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


@app.get("/")
def health():
    return {"status": "ok", "service": "ChandraMatch"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/match")
async def match_images(
    source: UploadFile = File(..., description="Source image (TMC-2 crop, grayscale PNG/TIFF)"),
    reference: UploadFile = File(..., description="Reference image (OHRC crop, grayscale PNG/TIFF)"),
    backend: str = Query("sift", description="Matching backend: sift, loftr, lightglue, ensemble"),
    source_resolution: float = Query(5.0, description="Source GSD in meters/pixel"),
    reference_resolution: float = Query(0.25, description="Reference GSD in meters/pixel"),
):
    try:
        config = load_config(CONFIG_PATH)
    except Exception:
        config = load_config("config/local.yaml")

    config["matching"]["backend"] = backend

    src_img = _load_image_from_upload(source)
    ref_img = _load_image_from_upload(reference)

    t_meta = SensorMetadata(resolution_m=source_resolution, dimensions_native=src_img.shape[:2])
    o_meta = SensorMetadata(resolution_m=reference_resolution, dimensions_native=ref_img.shape[:2])

    pair = ImagePair(
        pair_id="api_upload",
        tmc2_image=src_img,
        tmc2_native_shape=src_img.shape[:2],
        tmc2_metadata=t_meta,
        tmc2_filepath="upload",
        ohrc_image=ref_img,
        ohrc_native_shape=ref_img.shape[:2],
        ohrc_metadata=o_meta,
        ohrc_filepath="upload",
    )

    from src.pipeline import ChandraMatchPipeline
    pipeline = ChandraMatchPipeline(config)

    try:
        metrics = pipeline.process_pair(pair)
    except Exception as e:
        logger.exception("Pipeline failed")
        raise HTTPException(status_code=500, detail=str(e))

    pair_out = Path(config["output"]["root_dir"]) / "api_upload"

    viz = {}
    for name in ["overlay.png", "inlier_matches.png", "checkerboard.png"]:
        path = pair_out / "visualization" / name
        if path.exists():
            img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
            if img is not None:
                viz[name.replace(".png", "")] = _encode_image(img)

    return JSONResponse({
        "metrics": metrics,
        "visualizations": viz,
    })


@app.get("/api/backends")
def list_backends():
    return {
        "backends": [
            {"id": "sift", "name": "SIFT", "gpu_required": False},
            {"id": "loftr", "name": "LoFTR (Transformer)", "gpu_required": False, "note": "CPU fallback available"},
            {"id": "lightglue", "name": "LightGlue+SuperPoint", "gpu_required": False, "note": "CPU fallback available"},
            {"id": "ensemble", "name": "Ensemble (SIFT+LoFTR)", "gpu_required": False, "note": "CPU fallback available"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
