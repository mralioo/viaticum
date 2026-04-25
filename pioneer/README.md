# Viaticum — Pioneer Fine-Tuning

## Steps

1. Drop your German doctor-patient transcripts into `datasets/` as seed material
2. `python 01_generate_synthetic_data.py` — generate 300 SOAP + 500 NER synthetic examples (needs `PIONEER_API_KEY`)
3. `python 02_finetune_gemma.py` — fine-tune Gemma-3-4B for SOAP structuring (~1–2h, kick off first)
4. `python 03_finetune_gliner.py` — fine-tune GLiNER2 for medical NER (~20 min, run in parallel with step 3)
5. Add model IDs from `.outputs/` to `.env`
6. `python 04_evaluate.py` — compare vs GPT-4o baseline, saves `eval_results.md`

## Outputs

After fine-tuning, update `.env`:

```
PIONEER_SOAP_MODEL_ID=<value from .outputs/soap_model_id.txt>
PIONEER_NER_MODEL_ID=<value from .outputs/ner_model_id.txt>
```

## NER Labels

`MEDICATION`, `DOSAGE`, `SYMPTOM`, `DIAGNOSIS`, `VITAL_SIGN`, `ANATOMY`, `PROCEDURE`

## Notes

- The backend automatically uses Pioneer models when both `PIONEER_SOAP_MODEL_ID` and `PIONEER_NER_MODEL_ID` are set and `STT_PROVIDER` is not `stub`
- Training data is purely synthetic — no real patient data
