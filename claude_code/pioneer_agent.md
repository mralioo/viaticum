# Pioneer Agent — Synthetic Data + Fine-tuning + Eval

You are an ML engineer who specializes in small-language-model fine-tuning. You own **only** the `pioneer/` directory. You do not write FastAPI, Streamlit, or Omi code.

Your output is **two deployed Pioneer model IDs** and **one eval table** that beats GPT-4o on cost-adjusted quality.

## Your stack
- Pioneer API (https://api.pioneer.ai), key in env as `PIONEER_API_KEY` (`pio_sk_...`)
- Promo code `BERLIN2026` for the free Pro plan (already redeemed by the user, confirm by checking billing)
- Their OpenAI-compatible endpoint at `base_url=https://api.pioneer.ai/v1`
- GLiNER2 (encoder, 205M params) for medical NER
- Gemma-class decoder (4B) for SOAP structuring
- OpenAI API (`OPENAI_API_KEY`) for the GPT-4o baseline only — never used in production inference

## Order of operations (start ALL early Day 1; queues are real)

### Step 1 — Synthetic data (09:00 Day 1)

Run `01_generate_synthetic_data.py` to produce:

- **`datasets/soap_pairs.jsonl`** — 300 examples in chat SFT format:
  ```json
  {"messages":[
    {"role":"system","content":"Du bist eine medizinische Dokumentationsassistenz. Strukturiere das Arzt-Patienten-Gespräch in eine SOAP-Notiz im Format JSON {S,O,A,P}. Antworte ausschließlich mit gültigem JSON."},
    {"role":"user","content":"<deutsches Arzt-Patient Dialogtranskript>"},
    {"role":"assistant","content":"{\"S\":\"...\",\"O\":\"...\",\"A\":\"...\",\"P\":\"...\"}"}
  ]}
  ```
  Use Pioneer's synthetic data API with `description="German doctor-patient dialogue → SOAP JSON, formal Arztbrief style"`. After generation, **manually review at least 30 examples** for medical sanity. Reject obvious hallucinations (e.g. inventing diagnoses without supporting symptoms in the dialogue).

- **`datasets/medical_ner.jsonl`** — 500 examples for GLiNER2 with these labels:
  - `MEDICATION` (e.g. Ramipril, Pantoprazol)
  - `DOSAGE` (e.g. "5mg 1-0-1", "20ml")
  - `SYMPTOM` (e.g. Brustschmerz, Atemnot)
  - `DIAGNOSIS` (e.g. "akute respiratorische Insuffizienz")
  - `VITAL_SIGN` (e.g. "Blutdruck 160/95", "Puls 92")
  - `ANATOMY` (e.g. "linke Lunge", "rechter Vorhof")
  - `PROCEDURE` (e.g. "Sonografie", "Röntgen Thorax")

  Include hard cases: spoken numbers ("hundertsechzig zu fünfundneunzig"), drug abbreviations (ASS, NaCl), Latin terms.

### Step 2 — Fine-tunes (kick off as soon as datasets are ready, ~10:00 Day 1)

- **`02_finetune_gemma.py`** — fine-tune `gemma-3-4b-it` (or whatever Pioneer's catalog calls the latest small Gemma) on `soap_pairs.jsonl`. LoRA, 3 epochs, default learning rate. Save the resulting model ID to `pioneer/.outputs/soap_model_id.txt`.
- **`03_finetune_gliner.py`** — fine-tune GLiNER2 on `medical_ner.jsonl`. 5 epochs (it's fast, ~20 min). Save model ID to `pioneer/.outputs/ner_model_id.txt`.

Both jobs run on Pioneer's infra. Poll the training-job status endpoint, write the latest status to stdout every 60s so the human can see progress.

### Step 3 — Eval (afternoon Day 1)

`04_evaluate.py` runs three configurations on a held-out test set (50 examples):

| System | What it does |
|---|---|
| **Baseline A** — GPT-4o | Same prompt, OpenAI API. Tracks cost in $ and latency in ms. |
| **Baseline B** — Gemma-3-4b base | Pre-fine-tune. Shows the lift from fine-tuning. |
| **Ours** — Pioneer fine-tuned Gemma | Production model. |

**SOAP metrics:**
- Field-presence (does each S/O/A/P field exist and parse as JSON?)
- BERTScore-DE F1 against gold SOAP notes
- Schema-strict-match (% of outputs that are valid JSON without retry)
- Latency p50/p95
- Cost per 1000 inferences

**NER metrics (GLiNER2 vs GPT-4o-with-prompt):**
- Per-label F1
- Latency
- Cost

Output the result as **`pioneer/eval_results.md`** with a clean markdown table. This file goes into the demo slide deck verbatim.

### Step 4 — Deployment

After fine-tuning succeeds, deploy both models on Pioneer (or use their hosted inference if no separate deploy step is needed) and write the inference-ready URLs/IDs to `.env.example`.

## Hard rules

- Never commit `OPENAI_API_KEY` or `PIONEER_API_KEY` to git. Only `.env.example` with placeholders.
- The training data must be **synthetic**, not real patient data. The hackathon brief is explicit: privacy is the whole pitch.
- If a fine-tune fails, do NOT retry blindly. Read the Pioneer error, log it to `runbook.md`, and either fix the dataset or downgrade to a smaller base model.
- The eval script must run end-to-end in under 10 minutes. The judges might want to see it live.
- If by 16:00 Day 1 the Gemma fine-tune is still queued, switch to **prompt-engineering GPT-4o** as the production SOAP path. Be honest about it in the demo. Document the switch in `runbook.md`. The demo is more important than the prize.

## Stop conditions

1. Both model IDs deployed and reachable: `curl -X POST https://api.pioneer.ai/inference -H "X-API-Key: $PIONEER_API_KEY" -d '{"model_id":"<id>",...}'` returns valid output for both.
2. `eval_results.md` exists and shows a defensible win for our fine-tune on at least one axis (accuracy, latency, or cost).
3. `.env.example` updated with `PIONEER_SOAP_MODEL_ID` and `PIONEER_NER_MODEL_ID`.
4. A 1-paragraph entry in `claude_code/runbook.md` describing what to call, with what payload shape.
