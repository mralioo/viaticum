import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routers import chat, entities, ingest, omi, soap, transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Viaticum backend starting — STT_PROVIDER=%s", os.getenv("STT_PROVIDER", "stub"))
    yield
    logger.info("Viaticum backend shutting down")


app = FastAPI(title="Viaticum Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for _router in [transcribe.router, soap.router, entities.router, chat.router, ingest.router, omi.router]:
    app.include_router(_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": {
            "stt": os.getenv("STT_PROVIDER", "stub"),
            "soap": "pioneer" if os.getenv("PIONEER_SOAP_MODEL_ID") else "stub",
            "ner": "pioneer" if os.getenv("PIONEER_NER_MODEL_ID") else "stub",
            "omi": "live" if os.getenv("OMI_API_KEY") else "stub",
        },
    }
