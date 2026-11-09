"""Export a pre-registered sample of real-world DIAL images from MeasureBench (CC BY-SA 4.0).

Run once, from the repo root:
    python -m pip install --break-system-packages datasets pillow
    python eval/prep_measurebench.py --n 200 --seed 20261109

Writes eval/data/images/<question_id>.jpg and eval/data/items.jsonl. The image files are NOT
committed (they stay under eval/data/, which is gitignored); items.jsonl and the selection hash are.
Inspect the printed field samples first: if 'design' or 'evaluator_kwargs' differ from what this
script expects, fix the filter and the interval parser here before running the evaluation, and
commit that fix BEFORE any model call (pre-registration).
"""
import argparse
import hashlib
import json
import os
import random

from datasets import load_dataset


def is_dial(row):
    design = str(row.get("design", "")).lower()
    itype = str(row.get("image_type", "")).lower()
    if "dial" not in design:
        return False
    # clocks have two or three hands and a 12 or 24 hour ambiguity; a ship's round has none
    if "clock" in itype or "watch" in itype:
        return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=20261109)
    args = ap.parse_args()

    ds = load_dataset("FlagEval/MeasureBench", split="real_world")
    print("fields:", ds.column_names)
    for i in range(3):
        r = ds[i]
        print({k: (str(v)[:120] if k != "image" else "<image>") for k, v in r.items()})

    pool = [i for i in range(len(ds)) if is_dial(ds[i])]
    print(f"real_world rows: {len(ds)}, dial rows after filter: {len(pool)}")
    rnd = random.Random(args.seed)
    rnd.shuffle(pool)
    pick = sorted(pool[: args.n])

    os.makedirs("eval/data/images", exist_ok=True)
    with open("eval/data/items.jsonl", "w", encoding="utf-8") as f:
        for i in pick:
            r = ds[i]
            qid = str(r["question_id"])
            img = r["image"].convert("RGB")
            path = f"eval/data/images/{qid}.jpg"
            img.save(path, "JPEG", quality=92)
            f.write(
                json.dumps(
                    {
                        "question_id": qid,
                        "question": r.get("question", ""),
                        "image_type": r.get("image_type", ""),
                        "design": r.get("design", ""),
                        "evaluator": r.get("evaluator", ""),
                        "evaluator_kwargs": r.get("evaluator_kwargs", None),
                        "width": img.width,
                        "height": img.height,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
    h = hashlib.sha256(",".join(str(ds[i]["question_id"]) for i in pick).encode()).hexdigest()
    with open("eval/SELECTION.txt", "w", encoding="utf-8") as f:
        f.write(f"dataset FlagEval/MeasureBench split real_world\nfilter design contains dial, not clock or watch\n")
        f.write(f"seed {args.seed}\nn {len(pick)}\nselection_sha256 {h}\n")
    print("selection sha256", h)


if __name__ == "__main__":
    main()
