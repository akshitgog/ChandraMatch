#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements-render.txt
