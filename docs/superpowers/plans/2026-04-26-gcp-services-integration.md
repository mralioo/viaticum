# GCP Services Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Pioneer NER + SOAP, Parakeet-DE-Med STT (remote GCE VM), and Firestore patient records into the Viaticum FastAPI backend, and extend `setup_gcp.sh` to provision the new infrastructure.

**Architecture:** The FastAPI backend (Cloud Run) calls Pioneer's external API for NER/SOAP and the Parakeet STT VM (internal VPC) for transcription, all via async `httpx`. Patient records land in Firestore; transcripts also go to OpenSearch for RAG. A new `stt_server/` FastAPI app runs on the GCE GPU VM and wraps the NeMo model.

**Tech Stack:** Python 3.11, FastAPI, httpx (async HTTP), google-cloud-firestore, NeMo ASR, Docker (CUDA base for STT server), gcloud CLI, bash.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/pyproject.toml` | Modify | Add `google-cloud-firestore`, `httpx` already present |
| `backend/app/services/gliner_extractor.py` | **Implement** | Pioneer NER HTTP call |
| `backend/app/services/soap_structurer.py` | **Implement** | Pioneer SOAP HTTP call |
| `backend/app/services/stt_parakeet.py` | **Implement** | HTTP call to remote STT VM |
| `backend/app/services/firestore_client.py` | **Create** | Firestore CRUD (patients, consultations) |
| `backend/app/routers/entities.py` | Modify | Gate on `PIONEER_NER_MODEL_ID` not `STT_PROVIDER` |
| `backend/app/routers/soap.py` | Modify | Gate on `PIONEER_SOAP_MODEL_ID` not `STT_PROVIDER` |
| `backend/app/routers/ingest.py` | Modify | Write consultation to Firestore after RAG ingest |
| `backend/app/routers/patients.py` | **Create** | `GET /patients`, `GET /patients/{id}/consultations` |
| `backend/app/main.py` | Modify | Register patients router |
| `backend/tests/test_pioneer_ner.py` | **Create** | Unit tests for Pioneer NER service |
| `backend/tests/test_pioneer_soap.py` | **Create** | Unit tests for Pioneer SOAP service |
| `backend/tests/test_parakeet_remote.py` | **Create** | Unit tests for remote STT call |
| `backend/tests/test_firestore.py` | **Create** | Unit tests for Firestore client |
| `backend/tests/test_patients.py` | **Create** | Integration tests for patients router |
| `stt_server/main.py` | **Create** | FastAPI NeMo model server |
| `stt_server/Dockerfile` | **Create** | CUDA-based container |
| `stt_server/requirements.txt` | **Create** | NeMo + FastAPI deps |
| `docker-compose.yml` | Modify | Add `stt_server` service (CPU stub for local dev) |
| `.env.example` | Modify | Add `PARAKEET_URL`, `FIRESTORE_PROJECT_ID` note |
| `scripts/setup_gcp.sh` | Modify | Add Parakeet VM + Firestore steps |

---

## Task 1: Add google-cloud-firestore dependency

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add dependency**

In `backend/pyproject.toml`, add `"google-cloud-firestore>=2.16"` to the `dependencies` list:

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "viaticum-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "httpx>=0.27",
    "pydantic>=2.7",
    "python-multipart>=0.0.9",
    "websockets>=12",
    "chromadb>=0.5",
    "opensearch-py>=2.4",
    "sentence-transformers>=3",
    "python-dotenv>=1.0",
    "google-cloud-firestore>=2.16",
]

[project.optional-dependencies]
test = ["pytest>=8", "pytest-asyncio>=0.23", "httpx>=0.27"]

[tool.setuptools.packages.find]
where = [".."]
include = ["backend*"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 2: Install the new dependency**

```bash
cd /home/alioo/Desktop/viaticum-ltd/viaticum
.venv/bin/pip install -e backend/ -q
```

Expected: `Successfully installed google-cloud-firestore-...` (or "already satisfied" if cached)

- [ ] **Step 3: Commit**

```bash
git add backend/pyproject.toml
git commit -m "chore: add google-cloud-firestore dependency"
```

---

## Task 2: Implement Pioneer NER (`gliner_extractor.py`)

**Files:**
- Modify: `backend/app/services/gliner_extractor.py`
- Create: `backend/tests/test_pioneer_ner.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_pioneer_ner.py`:

```python
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def pioneer_env(monkeypatch):
    monkeypatch.setenv("PIONEER_API_KEY", "test-key")
    monkeypatch.setenv("PIONEER_NER_MODEL_ID", "test-model-id")
    monkeypatch.setenv("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")


def _mock_pioneer_response(entities):
    resp = MagicMock()
    resp.json.return_value = {"entities": entities}
    resp.raise_for_status = MagicMock()
    return resp


async def test_extract_entities_maps_pioneer_response(pioneer_env):
    mock_resp = _mock_pioneer_response([
        {"text": "Ramipril", "type": "medication", "confidence": 0.97,
         "span": {"start": 0, "end": 8}},
        {"text": "Brustschmerzen", "type": "symptom", "confidence": 0.99,
         "span": {"start": 10, "end": 24}},
    ])
    mock_client = AsyncMock()
    mock_client.post.return_value = mock_resp

    import importlib, sys
    sys.modules.pop("backend.app.services.gliner_extractor", None)
    from backend.app.services import gliner_extractor

    with patch("httpx.AsyncClient") as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await gliner_extractor.extract_entities("Ramipril bei Brustschmerzen")

    assert len(result) == 2
    assert result[0]["text"] == "Ramipril"
    assert result[0]["type"] == "medication"
    assert result[0]["confidence"] == 0.97
    assert result[0]["start"] == 0
    assert result[0]["end"] == 8


async def test_extract_entities_returns_empty_when_no_model_id(monkeypatch):
    monkeypatch.setenv("PIONEER_API_KEY", "test-key")
    monkeypatch.delenv("PIONEER_NER_MODEL_ID", raising=False)

    import sys
    sys.modules.pop("backend.app.services.gliner_extractor", None)
    from backend.app.services import gliner_extractor

    result = await gliner_extractor.extract_entities("some text")
    assert result == []
```

- [ ] **Step 2: Run to confirm failure**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_pioneer_ner.py -v 2>&1 | tail -10
```

Expected: `FAILED` — `NotImplementedError`

- [ ] **Step 3: Implement `gliner_extractor.py`**

```python
"""
Medical NER via Pioneer fine-tuned GLiNER2 (205M).
Env vars: PIONEER_API_KEY, PIONEER_NER_MODEL_ID, PIONEER_BASE_URL
"""
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_ENTITY_LABELS = [
    "medication", "dosage", "symptom", "diagnosis",
    "vital_sign", "anatomy", "procedure",
]
_RELATION_LABELS = ["prescribed_for", "treats", "indicates", "measured_at"]


async def extract_entities(text: str) -> list[dict[str, Any]]:
    """Return [{"text", "type", "confidence", "start", "end"}]. Empty list if unconfigured."""
    api_key = os.environ.get("PIONEER_API_KEY", "")
    model_id = os.environ.get("PIONEER_NER_MODEL_ID", "")
    base_url = os.environ.get("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")

    if not api_key or not model_id:
        logger.info("Pioneer NER not configured — returning empty entity list")
        return []

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": text}],
                "schema": {
                    "entities": _ENTITY_LABELS,
                    "relations": _RELATION_LABELS,
                    "include_confidence": True,
                    "include_spans": True,
                },
            },
        )
    resp.raise_for_status()
    data = resp.json()

    result = []
    for entity in data.get("entities", []):
        span = entity.get("span", {})
        result.append({
            "text": entity.get("text", ""),
            "type": entity.get("type", ""),
            "confidence": float(entity.get("confidence", 0.9)),
            "start": int(span.get("start", 0)),
            "end": int(span.get("end", len(entity.get("text", "")))),
        })
    return result
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_pioneer_ner.py -v
```

Expected:
```
PASSED backend/tests/test_pioneer_ner.py::test_extract_entities_maps_pioneer_response
PASSED backend/tests/test_pioneer_ner.py::test_extract_entities_returns_empty_when_no_model_id
2 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gliner_extractor.py backend/tests/test_pioneer_ner.py
git commit -m "feat: implement Pioneer NER via chat completions API"
```

---

## Task 3: Implement Pioneer SOAP (`soap_structurer.py`)

**Files:**
- Modify: `backend/app/services/soap_structurer.py`
- Create: `backend/tests/test_pioneer_soap.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_pioneer_soap.py`:

```python
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def soap_env(monkeypatch):
    monkeypatch.setenv("PIONEER_API_KEY", "test-key")
    monkeypatch.setenv("PIONEER_SOAP_MODEL_ID", "soap-model-id")
    monkeypatch.setenv("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")


async def test_structure_soap_from_structures_field(soap_env):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "structures": {
            "soap_note": {
                "S": "Patient klagt über Brustschmerzen.",
                "O": "Blutdruck 160/95.",
                "A": "V.a. NSTEMI.",
                "P": "EKG, Troponin.",
            }
        }
    }
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.post.return_value = mock_resp

    sys.modules.pop("backend.app.services.soap_structurer", None)
    from backend.app.services import soap_structurer

    with patch("httpx.AsyncClient") as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await soap_structurer.structure_soap("Patient klagt über Brustschmerzen.")

    for field in ("S", "O", "A", "P"):
        assert field in result
        assert len(result[field]) > 0


async def test_structure_soap_fallback_to_content_json(soap_env):
    """Handles models that return JSON in the message content instead of structures."""
    import json
    soap_json = json.dumps({
        "S": "Brustschmerzen seit 2 Tagen.",
        "O": "BD 150/90.",
        "A": "Hypertonie.",
        "P": "Ramipril 5mg.",
    })
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": soap_json}}]
    }
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.post.return_value = mock_resp

    sys.modules.pop("backend.app.services.soap_structurer", None)
    from backend.app.services import soap_structurer

    with patch("httpx.AsyncClient") as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await soap_structurer.structure_soap("Brustschmerzen seit 2 Tagen.")

    assert result["S"] == "Brustschmerzen seit 2 Tagen."
    assert result["P"] == "Ramipril 5mg."
```

- [ ] **Step 2: Run to confirm failure**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_pioneer_soap.py -v 2>&1 | tail -5
```

Expected: `FAILED` — `NotImplementedError`

- [ ] **Step 3: Implement `soap_structurer.py`**

```python
"""
SOAP structuring via Pioneer fine-tuned model.
Env vars: PIONEER_API_KEY, PIONEER_SOAP_MODEL_ID, PIONEER_BASE_URL
Prompt: backend/app/prompts/soap_de.txt
"""
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "soap_de.txt"


async def structure_soap(transcript: str, entities: list[dict] | None = None) -> dict[str, Any]:
    """Return {"S": str, "O": str, "A": str, "P": str}."""
    api_key = os.environ.get("PIONEER_API_KEY", "")
    model_id = os.environ.get("PIONEER_SOAP_MODEL_ID", "")
    base_url = os.environ.get("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")

    if not api_key or not model_id:
        raise RuntimeError("PIONEER_API_KEY and PIONEER_SOAP_MODEL_ID must be set")

    prompt = _PROMPT_PATH.read_text().replace("{transcript}", transcript)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "schema": {
                    "structures": {
                        "soap_note": {
                            "fields": [
                                {"name": "S", "dtype": "str"},
                                {"name": "O", "dtype": "str"},
                                {"name": "A", "dtype": "str"},
                                {"name": "P", "dtype": "str"},
                            ]
                        }
                    }
                },
            },
        )
    resp.raise_for_status()
    data = resp.json()

    # Prefer structured output
    structures = data.get("structures", {})
    if "soap_note" in structures:
        note = structures["soap_note"]
        if all(k in note for k in ("S", "O", "A", "P")):
            return note

    # Fallback: parse JSON from message content
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
        if all(k in parsed for k in ("S", "O", "A", "P")):
            return parsed
    except json.JSONDecodeError:
        pass

    logger.warning("Pioneer SOAP response missing expected fields: %s", data)
    raise ValueError(f"Pioneer SOAP response did not contain S/O/A/P structure: {data}")
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_pioneer_soap.py -v
```

Expected:
```
PASSED backend/tests/test_pioneer_soap.py::test_structure_soap_from_structures_field
PASSED backend/tests/test_pioneer_soap.py::test_structure_soap_fallback_to_content_json
2 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/soap_structurer.py backend/tests/test_pioneer_soap.py
git commit -m "feat: implement Pioneer SOAP structuring via chat completions API"
```

---

## Task 4: Fix router gates (entities + soap)

**Files:**
- Modify: `backend/app/routers/entities.py`
- Modify: `backend/app/routers/soap.py`

Currently both routers gate on `STT_PROVIDER == "stub"` which ties NER/SOAP activation to the transcription provider. They should check their own model ID env vars.

- [ ] **Step 1: Update `entities.py`**

Replace the full content of `backend/app/routers/entities.py`:

```python
import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.entities import Entity, EntityResponse, EntityType

router = APIRouter(prefix="/entities", tags=["entities"])


class EntityRequest(BaseModel):
    text: str


_STUB_ENTITIES = [
    Entity(text="Ramipril", type=EntityType.MEDICATION, confidence=0.97, start=0, end=8),
    Entity(text="5mg 1-0-0", type=EntityType.DOSAGE, confidence=0.94, start=9, end=18),
    Entity(text="Brustschmerzen", type=EntityType.SYMPTOM, confidence=0.99, start=40, end=54),
    Entity(text="160/95 mmHg", type=EntityType.VITAL_SIGN, confidence=0.96, start=60, end=71),
    Entity(text="NSTEMI", type=EntityType.DIAGNOSIS, confidence=0.92, start=80, end=86),
]


@router.post("", response_model=EntityResponse)
async def extract_entities(req: EntityRequest):
    """Extract medical entities from German text using Pioneer NER."""
    if not os.getenv("PIONEER_NER_MODEL_ID"):
        return EntityResponse(entities=_STUB_ENTITIES, provider="stub")
    from backend.app.services.gliner_extractor import extract_entities as _extract
    raw = await _extract(req.text)
    entities = [Entity(**e) for e in raw] if raw else _STUB_ENTITIES
    return EntityResponse(entities=entities, provider="pioneer")
```

- [ ] **Step 2: Update `soap.py`**

Replace the full content of `backend/app/routers/soap.py`:

```python
import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.soap import SOAPNote, SOAPResponse

router = APIRouter(prefix="/soap", tags=["soap"])


class SOAPRequest(BaseModel):
    transcript: str
    entities: list[dict] | None = None


_STUB_NOTE = SOAPNote(
    S="Patient berichtet über anhaltende Brustschmerzen seit 2 Tagen, Ausstrahlung in den linken Arm.",
    O="Blutdruck 160/95 mmHg, Puls 88/min, Temperatur 36.8°C, SpO2 97%.",
    A="Verdacht auf akutes Koronarsyndrom (NSTEMI). ICD: I21.4",
    P="12-Kanal-EKG sofort, Troponin I + T, kardiologisches Konsil, Bettruhe.",
)


@router.post("", response_model=SOAPResponse)
async def create_soap(req: SOAPRequest):
    """Structure a German transcript into a SOAP note."""
    if not os.getenv("PIONEER_SOAP_MODEL_ID"):
        return SOAPResponse(note=_STUB_NOTE, provider="stub")
    from backend.app.services.soap_structurer import structure_soap
    note_dict = await structure_soap(req.transcript, req.entities)
    return SOAPResponse(note=SOAPNote(**note_dict), provider="pioneer")
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_entities.py backend/tests/test_soap.py -v
```

Expected:
```
PASSED backend/tests/test_entities.py::test_entities_returns_list
PASSED backend/tests/test_entities.py::test_entity_confidence_in_range
PASSED backend/tests/test_soap.py::test_soap_returns_all_fields
3 passed
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/entities.py backend/app/routers/soap.py
git commit -m "fix: gate entities/soap on model ID env vars, not STT_PROVIDER"
```

---

## Task 5: Implement Parakeet remote call (`stt_parakeet.py`)

**Files:**
- Modify: `backend/app/services/stt_parakeet.py`
- Create: `backend/tests/test_parakeet_remote.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_parakeet_remote.py`:

```python
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def parakeet_env(monkeypatch):
    monkeypatch.setenv("PARAKEET_URL", "http://10.0.0.5:8001")


async def test_transcribe_calls_remote_vm(parakeet_env):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "segments": [
            {"text": "Der Patient klagt über Brustschmerzen.", "speaker": "SPEAKER_00",
             "start": 0.0, "end": 3.2}
        ],
        "duration_s": 3.2,
        "provider": "parakeet",
    }
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.post.return_value = mock_resp

    sys.modules.pop("backend.app.services.stt_parakeet", None)
    from backend.app.services import stt_parakeet

    with patch("httpx.AsyncClient") as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await stt_parakeet.transcribe(b"fake-wav-bytes")

    assert result["provider"] == "parakeet"
    assert len(result["segments"]) == 1
    assert result["segments"][0]["text"] == "Der Patient klagt über Brustschmerzen."

    call_args = mock_client.post.call_args
    assert call_args[0][0] == "http://10.0.0.5:8001/transcribe"


async def test_transcribe_raises_when_no_url(monkeypatch):
    monkeypatch.delenv("PARAKEET_URL", raising=False)
    sys.modules.pop("backend.app.services.stt_parakeet", None)
    from backend.app.services import stt_parakeet

    with pytest.raises(RuntimeError, match="PARAKEET_URL"):
        await stt_parakeet.transcribe(b"fake-wav-bytes")
```

- [ ] **Step 2: Run to confirm failure**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_parakeet_remote.py -v 2>&1 | tail -5
```

Expected: `FAILED` — `NotImplementedError`

- [ ] **Step 3: Implement `stt_parakeet.py`**

```python
"""
Parakeet-DE-Med STT — calls the remote GCE GPU VM over HTTP.
Env var: PARAKEET_URL (e.g. http://10.0.0.5:8001)
The VM runs stt_server/main.py with the NeMo model loaded.
"""
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """POST audio bytes to the remote Parakeet VM and return transcript segments."""
    parakeet_url = os.environ.get("PARAKEET_URL", "")
    if not parakeet_url:
        raise RuntimeError(
            "PARAKEET_URL not set — configure the Parakeet GCE VM and set PARAKEET_URL."
        )
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            parakeet_url + "/transcribe",
            files={"audio": ("audio.wav", audio_bytes, "audio/wav")},
            data={"sample_rate": str(sample_rate)},
        )
    resp.raise_for_status()
    return resp.json()
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_parakeet_remote.py -v
```

Expected:
```
PASSED backend/tests/test_parakeet_remote.py::test_transcribe_calls_remote_vm
PASSED backend/tests/test_parakeet_remote.py::test_transcribe_raises_when_no_url
2 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/stt_parakeet.py backend/tests/test_parakeet_remote.py
git commit -m "feat: implement Parakeet STT as remote HTTP call to GCE VM"
```

---

## Task 6: Create the STT server (`stt_server/`)

**Files:**
- Create: `stt_server/main.py`
- Create: `stt_server/Dockerfile`
- Create: `stt_server/requirements.txt`

This FastAPI app runs on the GPU VM. It is NOT tested by the backend test suite — verify by running it locally with `uvicorn` (CPU, no NeMo) or on the VM.

- [ ] **Step 1: Create `stt_server/requirements.txt`**

```
fastapi>=0.111
uvicorn[standard]>=0.29
python-multipart>=0.0.9
httpx>=0.27
# NeMo requires CUDA — install separately on the VM:
# nemo_toolkit[asr]>=1.23
# soundfile>=0.12
# numpy>=1.24
```

- [ ] **Step 2: Create `stt_server/main.py`**

```python
"""
Parakeet-DE-Med NeMo model server.
Runs on the GCE T4 VM. Exposes POST /transcribe and GET /health.
NeMo and soundfile are runtime dependencies — installed on the VM, not in the image layer.
"""
import logging
import os
import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Parakeet-DE-Med STT Server", version="1.0.0")
_model = None


@app.on_event("startup")
async def load_model():
    global _model
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    if stub:
        logger.info("STT_STUB=true — model not loaded (CPU dev mode)")
        return
    try:
        import nemo.collections.asr as nemo_asr
        _model = nemo_asr.models.ASRModel.from_pretrained(
            "johannhartmann/parakeet_de_med"
        )
        logger.info("Parakeet-DE-Med loaded successfully")
    except Exception as exc:
        logger.error("Failed to load Parakeet model: %s", exc)


@app.get("/health")
def health():
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "stub_mode": stub,
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    sample_rate: str = Form("16000"),
):
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    if stub:
        return {
            "segments": [
                {"text": "Stub: Kein Modell geladen.", "speaker": "SPEAKER_00",
                 "start": 0.0, "end": 1.0}
            ],
            "duration_s": 1.0,
            "provider": "parakeet-stub",
        }

    if _model is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Model not loaded — check startup logs."},
        )

    audio_bytes = await audio.read()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        import soundfile as sf
        import numpy as np

        data, sr = sf.read(tmp_path)
        if sr != 16000:
            import librosa
            data = librosa.resample(data.astype(np.float32), orig_sr=sr, target_sr=16000)
            sf.write(tmp_path, data, 16000)

        texts = _model.transcribe([tmp_path])
        text = texts[0] if texts else ""
    finally:
        os.unlink(tmp_path)

    return {
        "segments": [
            {"text": text, "speaker": "SPEAKER_00", "start": 0.0, "end": 0.0}
        ],
        "duration_s": 0.0,
        "provider": "parakeet",
    }
```

- [ ] **Step 3: Create `stt_server/Dockerfile`**

```dockerfile
# CUDA 12.2 runtime — matches T4 driver requirements on GCP Debian VMs
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-dev python3-pip \
    libsndfile1 ffmpeg wget curl \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /app
COPY requirements.txt .

# Install FastAPI deps (lightweight)
RUN pip install --no-cache-dir fastapi uvicorn[standard] python-multipart httpx

# Install NeMo ASR (large — cached in a separate layer)
RUN pip install --no-cache-dir "nemo_toolkit[asr]>=1.23" soundfile numpy librosa

COPY main.py .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 4: Verify syntax**

```bash
python3 -c "import ast, pathlib; ast.parse(pathlib.Path('stt_server/main.py').read_text()); print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add stt_server/
git commit -m "feat: add Parakeet STT NeMo model server (stt_server/)"
```

---

## Task 7: Add stt_server to docker-compose (local dev, CPU stub)

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add stt_server service**

In `docker-compose.yml`, add this service after the `backend` service block (before `frontend_react`):

```yaml
  stt_server:
    build:
      context: stt_server
      dockerfile: Dockerfile
    container_name: kis-stt
    ports:
      - "8001:8001"
    environment:
      - STT_STUB=true   # CPU stub — no GPU needed for local dev
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8001/health"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 15s
```

Also add `PARAKEET_URL=http://stt_server:8001` to the `backend` service environment block:

```yaml
  backend:
    ...
    environment:
      - VECTOR_STORE=${VECTOR_STORE:-opensearch}
      - OPENSEARCH_URL=https://opensearch:9200
      - OPENSEARCH_USER=admin
      - OPENSEARCH_PASSWORD=${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}
      - OPENSEARCH_INDEX=${OPENSEARCH_INDEX:-viaticum-transcripts}
      - STT_PROVIDER=${STT_PROVIDER:-stub}
      - PARAKEET_URL=http://stt_server:8001
      - PIONEER_API_KEY=${PIONEER_API_KEY:-}
      - PIONEER_NER_MODEL_ID=${PIONEER_NER_MODEL_ID:-}
      - PIONEER_SOAP_MODEL_ID=${PIONEER_SOAP_MODEL_ID:-}
```

- [ ] **Step 2: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add stt_server stub service to docker-compose for local dev"
```

---

## Task 8: Create Firestore client (`firestore_client.py`)

**Files:**
- Create: `backend/app/services/firestore_client.py`
- Create: `backend/tests/test_firestore.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_firestore.py`:

```python
import sys
from unittest.mock import MagicMock, patch

import pytest


def _make_doc(doc_id, data):
    doc = MagicMock()
    doc.id = doc_id
    doc.exists = True
    doc.to_dict.return_value = data
    return doc


def _mock_firestore_client():
    """Returns a mock google.cloud.firestore.Client."""
    client = MagicMock()
    return client


async def test_list_patients_returns_all(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "test-project")
    sys.modules.pop("backend.app.services.firestore_client", None)

    mock_client = _mock_firestore_client()
    mock_client.collection.return_value.stream.return_value = [
        _make_doc("P001", {"name": "Schneider, Maria", "room": "101"}),
        _make_doc("P002", {"name": "Müller, Hans", "room": "102"}),
    ]

    with patch("google.cloud.firestore.Client", return_value=mock_client):
        from backend.app.services import firestore_client
        result = await firestore_client.list_patients()

    assert len(result) == 2
    assert result[0]["id"] == "P001"
    assert result[0]["name"] == "Schneider, Maria"


async def test_get_patient_returns_none_when_missing(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "test-project")
    sys.modules.pop("backend.app.services.firestore_client", None)

    mock_client = _mock_firestore_client()
    missing_doc = MagicMock()
    missing_doc.exists = False
    mock_client.collection.return_value.document.return_value.get.return_value = missing_doc

    with patch("google.cloud.firestore.Client", return_value=mock_client):
        from backend.app.services import firestore_client
        result = await firestore_client.get_patient("P999")

    assert result is None


async def test_save_consultation_returns_id(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "test-project")
    sys.modules.pop("backend.app.services.firestore_client", None)

    mock_client = _mock_firestore_client()

    with patch("google.cloud.firestore.Client", return_value=mock_client):
        from backend.app.services import firestore_client
        cid = await firestore_client.save_consultation(
            patient_id="P001",
            transcript=[{"text": "Hallo", "speaker": "SPEAKER_00", "start": 0.0, "end": 1.0}],
            soap={"S": "test", "O": "test", "A": "test", "P": "test"},
            entities=[],
        )

    assert isinstance(cid, str) and len(cid) > 0
    mock_client.collection.return_value.document.return_value.set.assert_called_once()
```

- [ ] **Step 2: Run to confirm failure**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_firestore.py -v 2>&1 | tail -5
```

Expected: `ERROR` — `ModuleNotFoundError` or `ImportError` (file doesn't exist yet)

- [ ] **Step 3: Create `firestore_client.py`**

```python
"""
Firestore CRUD for patients and consultations.
Env var: GCP_PROJECT_ID
Collections:
  patients/{patient_id}              — patient demographics
  consultations/{consultation_id}    — transcript + SOAP + entities
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_db = None


def _get_db():
    global _db
    if _db is None:
        from google.cloud import firestore
        _db = firestore.Client(project=os.environ.get("GCP_PROJECT_ID"))
    return _db


async def list_patients() -> list[dict[str, Any]]:
    docs = _get_db().collection("patients").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


async def get_patient(patient_id: str) -> dict[str, Any] | None:
    doc = _get_db().collection("patients").document(patient_id).get()
    if not doc.exists:
        return None
    return {"id": doc.id, **doc.to_dict()}


async def save_consultation(
    patient_id: str,
    transcript: list[dict],
    soap: dict | None,
    entities: list[dict],
) -> str:
    """Persist a consultation and return its ID."""
    consultation_id = str(uuid.uuid4())
    _get_db().collection("consultations").document(consultation_id).set({
        "patient_id": patient_id,
        "transcript": transcript,
        "soap": soap or {},
        "entities": entities,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info("Saved consultation %s for patient %s", consultation_id, patient_id)
    return consultation_id


async def list_consultations(patient_id: str) -> list[dict[str, Any]]:
    docs = (
        _get_db()
        .collection("consultations")
        .where("patient_id", "==", patient_id)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/test_firestore.py -v
```

Expected:
```
PASSED backend/tests/test_firestore.py::test_list_patients_returns_all
PASSED backend/tests/test_firestore.py::test_get_patient_returns_none_when_missing
PASSED backend/tests/test_firestore.py::test_save_consultation_returns_id
3 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/firestore_client.py backend/tests/test_firestore.py
git commit -m "feat: add Firestore client for patient and consultation CRUD"
```

---

## Task 9: Create patients router + update ingest

**Files:**
- Create: `backend/app/routers/patients.py`
- Modify: `backend/app/routers/ingest.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_patients.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_patients.py`:

```python
import sys
from unittest.mock import AsyncMock, patch


async def test_list_patients_endpoint(client):
    mock_data = [
        {"id": "P001", "name": "Schneider, Maria", "room": "101"},
        {"id": "P002", "name": "Müller, Hans", "room": "102"},
    ]
    with patch(
        "backend.app.services.firestore_client.list_patients",
        new_callable=lambda: lambda: AsyncMock(return_value=mock_data),
    ):
        r = client.get("/patients")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["id"] == "P001"


async def test_get_patient_not_found(client):
    with patch(
        "backend.app.services.firestore_client.get_patient",
        new_callable=lambda: lambda: AsyncMock(return_value=None),
    ):
        r = client.get("/patients/PXXX")
    assert r.status_code == 404


async def test_get_patient_consultations(client):
    mock_consultations = [
        {"id": "c1", "patient_id": "P001", "soap": {"S": "test"}, "created_at": "2026-04-26"},
    ]
    with patch(
        "backend.app.services.firestore_client.list_consultations",
        new_callable=lambda: lambda: AsyncMock(return_value=mock_consultations),
    ):
        r = client.get("/patients/P001/consultations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["id"] == "c1"
```

- [ ] **Step 2: Create `backend/app/routers/patients.py`**

```python
from fastapi import APIRouter, HTTPException

from backend.app.services.firestore_client import (
    get_patient,
    list_consultations,
    list_patients,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("")
async def get_all_patients():
    """List all patients from Firestore."""
    return await list_patients()


@router.get("/{patient_id}")
async def get_single_patient(patient_id: str):
    """Get a single patient record."""
    patient = await get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/consultations")
async def get_consultations(patient_id: str):
    """Get all consultations for a patient, newest first."""
    return await list_consultations(patient_id)
```

- [ ] **Step 3: Register patients router in `main.py`**

In `backend/app/main.py`, change the import line from:

```python
from backend.app.routers import chat, entities, ingest, omi, soap, transcribe
```

to:

```python
from backend.app.routers import chat, entities, ingest, omi, patients, soap, transcribe
```

And change the router registration from:

```python
for _router in [transcribe.router, soap.router, entities.router, chat.router, ingest.router, omi.router]:
```

to:

```python
for _router in [transcribe.router, soap.router, entities.router, chat.router, ingest.router, omi.router, patients.router]:
```

- [ ] **Step 4: Update ingest router to write to Firestore**

Replace the full content of `backend/app/routers/ingest.py`:

```python
import logging
import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.rag_router import ingest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    segments: list[dict]
    soap: dict | None = None
    entities: list[dict] | None = None
    patient_id: str | None = None


class IngestResponse(BaseModel):
    chunks_added: int
    store: str
    consultation_id: str | None = None


@router.post("", response_model=IngestResponse)
async def ingest_conversation(req: IngestRequest):
    """Ingest transcript into vector store (OpenSearch/ChromaDB) and Firestore."""
    store = os.getenv("VECTOR_STORE", "opensearch")
    count = await ingest(req.segments, req.soap, req.patient_id)

    consultation_id = None
    if req.patient_id and os.getenv("GCP_PROJECT_ID"):
        try:
            from backend.app.services.firestore_client import save_consultation
            consultation_id = await save_consultation(
                patient_id=req.patient_id,
                transcript=req.segments,
                soap=req.soap,
                entities=req.entities or [],
            )
        except Exception as exc:
            logger.warning("Firestore write failed (non-fatal): %s", exc)

    return IngestResponse(chunks_added=count, store=store, consultation_id=consultation_id)
```

- [ ] **Step 5: Run all backend tests**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/ -v
```

Expected: all existing tests pass + new patients tests pass (patients tests will need patching — if they fail due to mock setup, adjust the patch path to `backend.app.routers.patients.list_patients` etc.)

Note: if `test_patients.py` tests fail because `list_patients` import path doesn't match, change the patch target in `test_patients.py` to:
```python
patch("backend.app.routers.patients.list_patients", ...)
patch("backend.app.routers.patients.get_patient", ...)
patch("backend.app.routers.patients.list_consultations", ...)
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/patients.py backend/app/routers/ingest.py \
        backend/app/main.py backend/tests/test_patients.py
git commit -m "feat: add patients router + Firestore write on ingest"
```

---

## Task 10: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add new variables**

Add these lines to `.env.example` after the existing `PIONEER_BASE_URL` line:

```bash
# ─── Parakeet STT VM (set after GCE VM is created by setup_gcp.sh) ───────────
PARAKEET_URL=http://<parakeet-internal-ip>:8001
```

The `GCP_PROJECT_ID` already covers Firestore — no extra variable needed.

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add PARAKEET_URL to .env.example"
```

---

## Task 11: Update `setup_gcp.sh` (Parakeet VM + Firestore)

**Files:**
- Modify: `scripts/setup_gcp.sh`

- [ ] **Step 1: Add new variables at the top of the script**

After the existing variable declarations (after `OS_INDEX=...`), add:

```bash
STT_INSTANCE="${STT_INSTANCE:-parakeet-stt}"
STT_ZONE="${STT_ZONE:-${REGION}-b}"
STT_MACHINE="${STT_MACHINE:-n1-standard-4}"
STT_DISK="${STT_DISK:-parakeet-disk}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
```

- [ ] **Step 2: Add Firestore + GPU API enablement**

Find the existing step 2 "Enabling required GCP APIs" and add `firestore.googleapis.com` and `compute.googleapis.com` (already there) to the list:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  cloudresourcemanager.googleapis.com \
  firestore.googleapis.com \
  --quiet
ok "APIs enabled"
```

- [ ] **Step 3: Add Firestore database creation step**

After the existing "Artifact Registry" step and before "Build and push images", add:

```bash
# ── Firestore ─────────────────────────────────────────────────────────────────
step "Creating Firestore database (native mode, europe-west1)"
if ! gcloud firestore databases describe --project="$PROJECT" &>/dev/null 2>&1; then
  gcloud firestore databases create \
    --project="$PROJECT" \
    --location="$REGION" \
    --type=firestore-native \
    --quiet
  ok "Firestore database created"
else
  ok "Firestore database already exists"
fi
```

- [ ] **Step 4: Add Parakeet STT VM creation step**

After the OpenSearch VM step, add:

```bash
# ── Parakeet STT VM ───────────────────────────────────────────────────────────
step "Creating Parakeet STT VM: $STT_INSTANCE (n1-standard-4 + T4, zone $STT_ZONE)"

STT_STARTUP=$(cat <<'STTEOF'
#!/bin/bash
set -e
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
# Install NVIDIA drivers + container toolkit
distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update -qq
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
STTEOF
)

if ! gcloud compute instances describe "$STT_INSTANCE" --zone="$STT_ZONE" &>/dev/null; then
  gcloud compute instances create "$STT_INSTANCE" \
    --zone="$STT_ZONE" \
    --machine-type="$STT_MACHINE" \
    --accelerator="type=nvidia-tesla-t4,count=1" \
    --maintenance-policy=TERMINATE \
    --restart-on-failure \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-balanced \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --tags=parakeet-stt \
    --scopes=cloud-platform \
    --metadata="startup-script=${STT_STARTUP}"
  ok "Created STT VM: $STT_INSTANCE"

  if ! gcloud compute firewall-rules describe "allow-parakeet-internal" &>/dev/null; then
    gcloud compute firewall-rules create "allow-parakeet-internal" \
      --direction=INGRESS \
      --action=ALLOW \
      --rules=tcp:8001 \
      --target-tags=parakeet-stt \
      --source-ranges=10.0.0.0/8 \
      --description="Allow Cloud Run backend to reach Parakeet STT on :8001"
    ok "Firewall rule created: allow-parakeet-internal"
  fi

  printf "  Waiting 60s for VM to boot…"
  sleep 60
  printf " done\n"
else
  ok "STT VM already exists: $STT_INSTANCE"
fi

STT_INTERNAL_IP=$(gcloud compute instances describe "$STT_INSTANCE" \
  --zone="$STT_ZONE" --format="value(networkInterfaces[0].networkIP)")
ok "Parakeet STT internal IP: $STT_INTERNAL_IP"
```

- [ ] **Step 5: Add PARAKEET_URL to the Cloud Run backend deployment**

Find the existing `gcloud run deploy kis-backend` command and add `PARAKEET_URL` to `--set-env-vars`:

```bash
gcloud run deploy kis-backend \
  --image="${REGISTRY}/kis-backend:latest" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=120 \
  --set-env-vars="VECTOR_STORE=opensearch,\
OPENSEARCH_URL=${OPENSEARCH_URL_INTERNAL},\
OPENSEARCH_USER=admin,\
OPENSEARCH_INDEX=${OS_INDEX},\
STT_PROVIDER=${STT_PROVIDER:-parakeet},\
PARAKEET_URL=http://${STT_INTERNAL_IP}:8001,\
GCP_PROJECT_ID=${PROJECT},\
PIONEER_NER_MODEL_ID=${PIONEER_NER_MODEL_ID:-},\
PIONEER_SOAP_MODEL_ID=${PIONEER_SOAP_MODEL_ID:-}" \
  --set-secrets="OPENSEARCH_PASSWORD=kis-opensearch-password:latest,\
PIONEER_API_KEY=kis-pioneer-api-key:latest"
```

- [ ] **Step 6: Add STT VM to the summary printout**

Find the summary `printf` block at the end and add:

```bash
printf "  Parakeet STT : http://%s:8001  (internal VPC)\n" "$STT_INTERNAL_IP"
```

- [ ] **Step 7: Verify shell syntax**

```bash
bash -n scripts/setup_gcp.sh && echo "syntax OK"
```

Expected: `syntax OK`

- [ ] **Step 8: Commit**

```bash
git add scripts/setup_gcp.sh .env.example
git commit -m "feat: add Parakeet STT VM + Firestore provisioning to setup_gcp.sh"
```

---

## Task 12: Full test suite verification

- [ ] **Step 1: Run all backend tests**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/ -v
```

Expected (all pass):
```
PASSED backend/tests/test_chat.py::test_chat_returns_answer
PASSED backend/tests/test_entities.py::test_entities_returns_list
PASSED backend/tests/test_entities.py::test_entity_confidence_in_range
PASSED backend/tests/test_health.py::test_health_returns_ok
PASSED backend/tests/test_omi.py::test_omi_health_stub_mode
PASSED backend/tests/test_omi.py::test_omi_conversations_returns_list
PASSED backend/tests/test_soap.py::test_soap_returns_all_fields
PASSED backend/tests/test_transcribe.py::test_transcribe_returns_segments
PASSED backend/tests/test_pioneer_ner.py::test_extract_entities_maps_pioneer_response
PASSED backend/tests/test_pioneer_ner.py::test_extract_entities_returns_empty_when_no_model_id
PASSED backend/tests/test_pioneer_soap.py::test_structure_soap_from_structures_field
PASSED backend/tests/test_pioneer_soap.py::test_structure_soap_fallback_to_content_json
PASSED backend/tests/test_parakeet_remote.py::test_transcribe_calls_remote_vm
PASSED backend/tests/test_parakeet_remote.py::test_transcribe_raises_when_no_url
PASSED backend/tests/test_firestore.py::test_list_patients_returns_all
PASSED backend/tests/test_firestore.py::test_get_patient_returns_none_when_missing
PASSED backend/tests/test_firestore.py::test_save_consultation_returns_id
17 passed
```

- [ ] **Step 2: Verify health endpoint reflects new providers**

```bash
STT_PROVIDER=parakeet PIONEER_NER_MODEL_ID=f9ebf6b0 PIONEER_SOAP_MODEL_ID=f9ebf6b0 \
  .venv/bin/python -c "
import os, asyncio
os.environ['STT_PROVIDER'] = 'parakeet'
os.environ['PIONEER_NER_MODEL_ID'] = 'f9ebf6b0'
os.environ['PIONEER_SOAP_MODEL_ID'] = 'f9ebf6b0'
from fastapi.testclient import TestClient
from backend.app.main import app
c = TestClient(app)
import json; print(json.dumps(c.get('/health').json(), indent=2))
"
```

Expected:
```json
{
  "status": "ok",
  "models_loaded": {
    "stt": "parakeet",
    "soap": "pioneer",
    "ner": "pioneer",
    "omi": "stub"
  }
}
```

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "chore: GCP services integration complete — 17 tests passing"
```

---

## Deployment Walkthrough (after all tasks complete)

```bash
# 1. Fill in .env with real values
cp .env.example .env
# Edit: GCP_PROJECT_ID, PIONEER_API_KEY, PIONEER_NER_MODEL_ID=f9ebf6b0-...,
#        PIONEER_SOAP_MODEL_ID=<soap-model-id>, OPENSEARCH_ADMIN_PASSWORD

# 2. Authenticate
gcloud auth login
gcloud auth application-default login
gcloud auth configure-docker europe-west1-docker.pkg.dev

# 3. Run the full GCP bootstrap (idempotent)
chmod +x scripts/setup_gcp.sh
./scripts/setup_gcp.sh
# Takes ~5 min. Prints URLs at the end.

# 4. Deploy Parakeet model on the VM (SSH in and run the container)
STT_VM_IP=$(gcloud compute instances describe parakeet-stt \
  --zone=europe-west1-b --format="value(networkInterfaces[0].networkIP)")

gcloud compute ssh parakeet-stt --zone=europe-west1-b -- "
  docker pull europe-west1-docker.pkg.dev/\$PROJECT/kis-docker/kis-stt:latest || true
  docker run -d --gpus all --name kis-stt --restart=always \
    -p 8001:8001 \
    europe-west1-docker.pkg.dev/\$PROJECT/kis-docker/kis-stt:latest
"

# 5. Verify
curl http://\$STT_VM_IP:8001/health
# {"status":"ok","model_loaded":true,"stub_mode":false}

curl https://<backend-cloud-run-url>/health
# {"status":"ok","models_loaded":{"stt":"parakeet","soap":"pioneer","ner":"pioneer",...}}
```
