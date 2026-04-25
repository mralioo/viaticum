"""
Generates synthetic German doctor-patient datasets via Pioneer API.
Outputs:
  pioneer/.outputs/soap_dataset_id.txt
  pioneer/.outputs/ner_dataset_id.txt
Requires: PIONEER_API_KEY
"""
import os
import time
from pathlib import Path

import requests

PIONEER_KEY = os.environ["PIONEER_API_KEY"]
HEADERS = {"X-API-Key": PIONEER_KEY, "Content-Type": "application/json"}
OUTPUTS = Path(__file__).parent / ".outputs"
OUTPUTS.mkdir(exist_ok=True)


def generate(description: str, task: str, n: int, system_prompt: str | None = None) -> str:
    payload = {"task": task, "description": description, "num_samples": n, "language": "de"}
    if system_prompt:
        payload["system_prompt"] = system_prompt
    r = requests.post(
        "https://api.pioneer.ai/synthetic-data",
        headers=HEADERS,
        json=payload,
        timeout=300,
    )
    r.raise_for_status()
    return r.json()["dataset_id"]


if __name__ == "__main__":
    print("Generating 300 SOAP pairs...")
    soap_id = generate(
        description=(
            "German doctor-patient dialogue → SOAP JSON {S,O,A,P}. "
            "Formal Arztbrief. Cardiology, internal medicine, emergency."
        ),
        task="chat",
        n=300,
        system_prompt=(
            "Du bist eine medizinische Dokumentationsassistenz. "
            "Strukturiere das Gespräch als JSON {S,O,A,P}. Antworte nur mit JSON."
        ),
    )
    (OUTPUTS / "soap_dataset_id.txt").write_text(soap_id)
    print(f"SOAP dataset: {soap_id}")

    print("Generating 500 NER examples...")
    ner_id = generate(
        description=(
            "German medical NER. Labels: MEDICATION, DOSAGE, SYMPTOM, DIAGNOSIS, "
            "VITAL_SIGN, ANATOMY, PROCEDURE. Include spoken numbers, abbreviations, Latin."
        ),
        task="ner",
        n=500,
    )
    (OUTPUTS / "ner_dataset_id.txt").write_text(ner_id)
    print(f"NER dataset:  {ner_id}")
    print("Review datasets before running step 2 and 3.")
