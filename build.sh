#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Create __init__.py for open_deep_research package (submodule lacks it)
touch ./open_deep_research/src/open_deep_research/__init__.py

# Install the local open_deep_research package in editable mode
pip install -e ./open_deep_research

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
