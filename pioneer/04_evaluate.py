"""
Evaluates Pioneer fine-tuned Gemma vs GPT-4o baseline on held-out SOAP test set.
Writes: pioneer/eval_results.md
Requires: PIONEER_API_KEY, PIONEER_SOAP_MODEL_ID, OPENAI_API_KEY
"""
import json
import os
import statistics
import time
from pathlib import Path

PIONEER_KEY = os.environ["PIONEER_API_KEY"]
OPENAI_KEY = os.environ["OPENAI_API_KEY"]
SOAP_MODEL = os.environ["PIONEER_SOAP_MODEL_ID"]
DATASETS = Path(__file__).parent / "datasets"
PROMPT = (Path(__file__).parent.parent / "backend" / "app" / "prompts" / "soap_de.txt").read_text()


def pioneer_soap(transcript: str) -> tuple[dict, float]:
    import requests
    t0 = time.time()
    r = requests.post(
        "https://api.pioneer.ai/v1/chat/completions",
        headers={"X-API-Key": PIONEER_KEY},
        json={
            "model": SOAP_MODEL,
            "messages": [
                {"role": "system", "content": PROMPT.replace("{transcript}", "")},
                {"role": "user", "content": transcript},
            ],
        },
        timeout=60,
    )
    return json.loads(r.json()["choices"][0]["message"]["content"]), (time.time() - t0) * 1000


def gpt4o_soap(transcript: str) -> tuple[dict, float]:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_KEY)
    t0 = time.time()
    r = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "German medical SOAP JSON only: {S,O,A,P}"},
            {"role": "user", "content": transcript},
        ],
    )
    return json.loads(r.choices[0].message.content), (time.time() - t0) * 1000


def field_presence(pred: dict) -> float:
    return sum(1 for k in ("S", "O", "A", "P") if k in pred and pred[k]) / 4.0


if __name__ == "__main__":
    examples = [
        json.loads(line)
        for line in (DATASETS / "soap_pairs.jsonl").read_text().splitlines()
        if line.strip()
    ]
    test_set = examples[-50:]

    p_scores, g_scores, p_lat, g_lat = [], [], [], []
    for ex in test_set:
        transcript = ex["messages"][1]["content"]
        try:
            pred, lat = pioneer_soap(transcript)
            p_scores.append(field_presence(pred))
            p_lat.append(lat)
        except Exception as e:
            print(f"Pioneer error: {e}")
            p_scores.append(0.0)
        try:
            pred, lat = gpt4o_soap(transcript)
            g_scores.append(field_presence(pred))
            g_lat.append(lat)
        except Exception as e:
            print(f"GPT-4o error: {e}")
            g_scores.append(0.0)

    md = f"""# Viaticum — Pioneer Fine-Tune Eval

| Metric | Pioneer Gemma-3-4B (fine-tuned) | GPT-4o |
|--------|----------------------------------|--------|
| SOAP field presence | {statistics.mean(p_scores):.1%} | {statistics.mean(g_scores):.1%} |
| Latency p50 (ms) | {statistics.median(p_lat):.0f} | {statistics.median(g_lat):.0f} |
| Latency p95 (ms) | {sorted(p_lat)[int(.95 * len(p_lat))]:.0f} | {sorted(g_lat)[int(.95 * len(g_lat))]:.0f} |
| Test examples | {len(test_set)} | {len(test_set)} |

*Generated {time.strftime('%Y-%m-%d %H:%M')} — synthetic data only, no real patient records*
"""
    out = Path(__file__).parent / "eval_results.md"
    out.write_text(md)
    print(md)
    print(f"Saved to {out}")
