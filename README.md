# Chandrayaan-2 TMC-2/OHRC Image Correspondence Pipeline

## Problem Statement
**ID:** 26166  
**Title:** Multi-modal, Sun angle and scale invariant image correspondence using Chandrayaan-2 optical images (OHRC, TMC and IIRS)

This project builds a clean, modular, production-quality lunar image correspondence and registration pipeline for Chandrayaan-2 TMC-2 and OHRC imagery.

## Architecture Highlights
- **No ORB Usage:** We explicitly reject ORB as it is forbidden per architectural guidelines.
- **Coordinate Tracking:** Operations trace strictly back to native TMC-2 and OHRC pixel geometries.
- **Geospatial Pre-processing:** Initial geographic overlap ensures visual matching focuses on intersections.
- **Illumination Handling:** Uses independent contrast normalization and structural gradients.
- **Robust Loading:** HuggingFace -> Local -> GUI Fallback execution flow.

## Installation
```bash
pip install -r requirements.txt
```

## Configuration & HF Authentication
All settings live in `config/local.yaml`.
**DO NOT** store the HuggingFace token in the YAML. Use environment variables:

Windows:
```powershell
$env:HF_TOKEN="your_token_here"
```

Linux/macOS:
```bash
export HF_TOKEN="your_token_here"
```

## Running the Pipeline
```bash
python main.py
```

## Outputs
Outputs are saved in `./outputs/pair_id/` and include registered images, raw/inlier/final CSV matches, and a `metrics.json` file detailing Sub-pixel RMSE and match coverage.
