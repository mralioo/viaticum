"""
Fine-tunes GLiNER2 on medical NER examples via Pioneer (~20 min).
Reads:  pioneer/.outputs/ner_dataset_id.txt
Writes: pioneer/.outputs/ner_model_id.txt
Requires: PIONEER_API_KEY
"""
import os
import time
from pathlib import Path

import requests

PIONEER_KEY = os.environ["PIONEER_API_KEY"]
HEADERS = {"X-API-Key": PIONEER_KEY, "Content-Type": "application/json"}
OUTPUTS = Path(__file__).parent / ".outputs"


def start(dataset_id: str) -> str:
    r = requests.post(
        "https://api.pioneer.ai/felix/training-jobs",
        headers=HEADERS,
        json={"base_model": "gliner2-205m", "dataset_id": dataset_id, "method": "full", "epochs": 5},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["job_id"]


def poll(job_id: str) -> str:
    while True:
        r = requests.get(
            f"https://api.pioneer.ai/felix/training-jobs/{job_id}",
            headers=HEADERS,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        print(f"[{time.strftime('%H:%M:%S')}] {data['status']}")
        if data["status"] == "completed":
            return data["model_id"]
        if data["status"] == "failed":
            raise RuntimeError(f"Fine-tune failed: {data.get('error')}")
        time.sleep(60)


if __name__ == "__main__":
    dataset_id = (OUTPUTS / "ner_dataset_id.txt").read_text().strip()
    print(f"Starting GLiNER2 NER fine-tune on {dataset_id}...")
    model_id = poll(start(dataset_id))
    (OUTPUTS / "ner_model_id.txt").write_text(model_id)
    print(f"Done. PIONEER_NER_MODEL_ID={model_id}")
