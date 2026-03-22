#!/bin/sh
# Seed /app/data from /app/data-seed for any files not yet present in the volume.
# This ensures new seed files (branches, etc.) are always available after a rebuild,
# while existing runtime data (users, companies, leaves, etc.) is never overwritten.

SEED_DIR="/app/data-seed"
DATA_DIR="/app/data"

if [ -d "$SEED_DIR" ]; then
  for src in "$SEED_DIR"/*.json; do
    fname=$(basename "$src")
    dest="$DATA_DIR/$fname"
    if [ ! -f "$dest" ]; then
      echo "[entrypoint] Seeding $fname into $DATA_DIR"
      cp "$src" "$dest"
    fi
  done

  # Always overwrite branches.json from seed so new branches are picked up on rebuild
  if [ -f "$SEED_DIR/branches.json" ]; then
    echo "[entrypoint] Refreshing branches.json from seed"
    cp "$SEED_DIR/branches.json" "$DATA_DIR/branches.json"
  fi
fi

exec node server.js
