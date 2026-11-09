# Pre-registration

Committed before any model call. The commit hash of this file is quoted in PROOF.md.

## Questions

1. On real photos of single-pointer dial instruments that nobody on this project chose, how often is
   the value right when the model is asked to read it (arm A)?
2. When the model is asked only to point (centre, needle tip, lowest mark, highest mark) and code
   computes the value (arm B), how often is an answered value right?
3. How often does arm B refuse a dial that arm A read correctly (the cost of refusing)?
4. How often does arm B give a wrong value without refusing (the cost that reaches a person)?

## Fixed in advance

- Dataset: FlagEval/MeasureBench, split real_world, licence CC BY-SA 4.0.
- Filter: design contains "dial", image type not clock or watch.
- Selection: seed 20261109, n 200, selection hash in eval/SELECTION.txt.
- Model: gemini-2.5-flash, temperature 0, one call per image per arm, no retries on content.
- Correct means: the value lies inside MeasureBench's own accepted interval for that image.
- Arm B uses the model's printed scale labels (no round card exists for these photos).
- Every result is published, including the arm that loses.

## What would count against us

- Arm B accuracy when answered is not higher than arm A accuracy.
- Arm B refuses more than half of the dials arm A read correctly.

Either outcome is reported in the README's "Measured" section as found.
