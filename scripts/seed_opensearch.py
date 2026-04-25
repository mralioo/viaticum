#!/usr/bin/env python3
"""
Seed OpenSearch with dummy patient SOAP notes and transcripts
via the backend /ingest endpoint.

Usage:
  BACKEND_URL=http://localhost:8000 python3 scripts/seed_opensearch.py
  BACKEND_URL=https://kis-backend.run.app python3 scripts/seed_opensearch.py
"""
import json
import os
import sys
from pathlib import Path

import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
DATA_DIR = Path(__file__).parent.parent / "data" / "patients"

def ingest(segments: list[dict], patient_id: str) -> dict:
    url = f"{BACKEND_URL}/ingest"
    payload = {"segments": segments, "patient_id": patient_id}
    r = httpx.post(url, json=payload, timeout=60)
    r.raise_for_status()
    return r.json()

def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  [skip] {path} not found")
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def main():
    print(f"Seeding via {BACKEND_URL}")

    # Group by patient_id so each ingest call carries one patient's data
    all_records: list[dict] = (
        load_jsonl(DATA_DIR / "transcripts.jsonl") +
        load_jsonl(DATA_DIR / "soap_history.jsonl")
    )

    by_patient: dict[str, list[dict]] = {}
    for rec in all_records:
        pid = rec.get("patient_id", "unknown")
        by_patient.setdefault(pid, []).append(rec)

    total = 0
    for pid, segments in by_patient.items():
        try:
            result = ingest(segments, pid)
            count = result.get("chunks_added", 0)
            total += count
            print(f"  {pid}: {count} chunks")
        except httpx.HTTPError as e:
            print(f"  ERROR {pid}: {e}", file=sys.stderr)

    print(f"\nDone — {total} chunks ingested across {len(by_patient)} patients")

if __name__ == "__main__":
    main()
