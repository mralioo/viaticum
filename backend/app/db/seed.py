"""
Seed two demo patients on first startup if the table is empty.

Patient A — Ivana Slivovitz:  full consultation (Fibromyalgie intake transcript)
Patient B — Klaus Müller:     basic demographics only, no consultation
"""
import json
import logging
from datetime import date, datetime, timezone
from pathlib import Path

from backend.app.db.connection import get_pool

logger = logging.getLogger(__name__)

_TRANSCRIPT_DIR = Path(__file__).parent.parent.parent.parent / "data" / "transcripts"


async def seed_if_empty() -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM patients")
        if count == 0:
            logger.info("Seeding demo patients …")
            await _seed_patient_a()
            await _seed_patient_b()
            logger.info("Seed complete")
        else:
            logger.info("DB already seeded (%d patients)", count)

    # Always ensure OpenSearch has patient-001's transcript correctly tagged
    await _ensure_opensearch_patient_a()


async def _seed_patient_a() -> None:
    pool = get_pool()

    # Load the latest transcript text if available
    txts = sorted(_TRANSCRIPT_DIR.glob("*.txt"), reverse=True)
    transcript_text = txts[0].read_text(encoding="utf-8") if txts else None
    jsons = sorted(_TRANSCRIPT_DIR.glob("*.json"), reverse=True)
    entities: list = []
    if jsons:
        try:
            raw = json.loads(jsons[0].read_text(encoding="utf-8"))
            # Try to extract entities from the JSON if they were saved
            entities = raw.get("entities", [])
        except Exception:
            pass

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO patients
              (id, name, dob, sex, station, room, bed, admit_at, los_days,
               primary_dx, secondary_dx, allergies, attending, nurse,
               severity, insurance, vitals, dnr, aufnahmeart, has_consultation)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            ON CONFLICT (id) DO NOTHING
            """,
            "patient-001",
            "Slivovitz, Ivana",
            date(1981, 3, 15),
            "w",
            "Innere-3",
            "302",
            "A",
            datetime(2026, 4, 26, 8, 0, tzinfo=timezone.utc),
            1,
            "M79.70 — Fibromyalgie",
            ["K58.9 — Reizdarmsyndrom", "F41.1 — Generalisierte Angststörung"],
            ["Penicillin (Exanthem)", "NSAR — mit Vorsicht"],
            "Dr. Ziegler",
            "Schwester Anna",
            "stable",
            {"type": "GKV", "name": "AOK Bayern", "number": "A987654321"},
            {"hr": 76, "sys": 118, "dia": 74, "spo2": 98, "temp": 36.7, "rr": 14},
            False,
            "Elektiv",
            True,
        )

        # Consultation linked to Patient A
        await conn.execute(
            """
            INSERT INTO consultations (patient_id, soap, entities, transcript, provider)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
            """,
            "patient-001",
            {
                "S": "Patientin berichtet seit mehreren Monaten über diffuse Schmerzen im Bereich "
                     "Nacken, Rücken und Oberkörper. Zusätzlich Bauchschmerzen, Blähungen, "
                     "Verstopfung und Durchfall im Wechsel. Ausgeprägte Erschöpfung und Schlafstörungen. "
                     "Episodisch Luftnot und Herzrasen ohne kardialen Befund.",
                "O": "AZ reduziert, HF 76/min, RR 118/74 mmHg, SpO₂ 98 %. "
                     "Druckdolenz über multiplen Tender-Points. Abdomen weich, "
                     "diffus druckempfindlich, kein Loslaßschmerz.",
                "A": "Fibromyalgie-Syndrom (M79.70). Reizdarmsyndrom (K58.9). "
                     "Generalisierte Angststörung (F41.1).",
                "P": "Multimodales Therapieprogramm: Physiotherapie, kognitiv-behaviorale Therapie. "
                     "Ibuprofen 400 mg bei Bedarf (max. 3×/d), Paracetamol 500 mg Bedarfsmedikation. "
                     "GI-Vorstellung für Darmspiegelung. Psychiatrisches Konsil für Angsttherapie. "
                     "Verlaufskontrolle in 4 Wochen.",
            },
            entities or [
                {"text": "Ibuprofen 400", "type": "medication", "confidence": 0.95},
                {"text": "Paracetamol", "type": "medication", "confidence": 0.93},
                {"text": "Novalgin", "type": "medication", "confidence": 0.91},
                {"text": "Schmerzen", "type": "symptom", "confidence": 0.97},
                {"text": "Bauchschmerzen", "type": "symptom", "confidence": 0.92},
                {"text": "Luftnot", "type": "symptom", "confidence": 0.88},
                {"text": "Herzrasen", "type": "symptom", "confidence": 0.86},
                {"text": "Fibromyalgie", "type": "diagnosis", "confidence": 0.96},
                {"text": "Durchfall", "type": "diagnosis", "confidence": 0.89},
                {"text": "Verstopfung", "type": "diagnosis", "confidence": 0.87},
                {"text": "Nacken", "type": "anatomy", "confidence": 0.94},
                {"text": "Rücken", "type": "anatomy", "confidence": 0.93},
                {"text": "Mandeloperation", "type": "procedure", "confidence": 0.90},
                {"text": "Darmspiegelung", "type": "procedure", "confidence": 0.88},
            ],
            transcript_text,
            "pioneer+gradium",
        )

    logger.info("Patient A (Ivana Slivovitz) seeded with consultation")


async def _seed_patient_b() -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO patients
              (id, name, dob, sex, station, room, bed, admit_at, los_days,
               primary_dx, secondary_dx, allergies, attending, nurse,
               severity, insurance, vitals, dnr, aufnahmeart, has_consultation)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            ON CONFLICT (id) DO NOTHING
            """,
            "patient-002",
            "Müller, Klaus",
            date(1965, 7, 22),
            "m",
            "CHIR-1",
            "108",
            "B",
            datetime(2026, 4, 26, 14, 30, tzinfo=timezone.utc),
            0,
            "K40.90 — Leistenhernie rechts",
            ["I10.90 — Arterielle Hypertonie"],
            ["Keine bekannt"],
            "Dr. Bauer",
            "Pfleger Thomas",
            "stable",
            {"type": "GKV", "name": "Techniker Krankenkasse", "number": "T123456789"},
            {"hr": 72, "sys": 138, "dia": 86, "spo2": 99, "temp": 36.5, "rr": 15},
            False,
            "Elektiv — OP geplant",
            False,
        )

    logger.info("Patient B (Klaus Müller) seeded — basic info only, no consultation")


async def _ensure_opensearch_patient_a() -> None:
    """Ensure patient-001's transcript is in OpenSearch with the correct patient_id tag."""
    try:
        from backend.app.services.opensearch_rag import (
            count_patient_docs,
            ingest,
            migrate_empty_patient_id,
        )

        # Migrate any legacy docs that have an empty patient_id → assign to patient-001
        fixed = await migrate_empty_patient_id("patient-001")
        if fixed:
            logger.info("OpenSearch: migrated %d legacy docs → patient-001", fixed)

        # If patient-001 already has docs, nothing more to do
        existing = await count_patient_docs("patient-001")
        if existing > 0:
            logger.info("OpenSearch: patient-001 already has %d docs", existing)
            return

        # Fresh index — ingest from the most recent transcript JSON
        jsons = sorted(_TRANSCRIPT_DIR.glob("*.json"), reverse=True)
        if not jsons:
            logger.warning("OpenSearch seed: no transcript JSON found, skipping")
            return

        data = json.loads(jsons[0].read_text(encoding="utf-8"))
        segments = data.get("segments", [])
        if segments:
            ingested = await ingest(segments, patient_id="patient-001")
            logger.info("OpenSearch: seeded %d segments for patient-001", ingested)
    except Exception as exc:
        logger.warning("OpenSearch seeding failed (non-fatal): %s", exc)
