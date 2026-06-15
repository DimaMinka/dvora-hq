# RLM Analysis Store

Persistent verdict store for the RLM (Recursive Language Model) analysis pattern.

## Contents

- `verdicts/` — per-file JSON verdicts from sub-agent analysis
- `layer1_snapshot.json` — last Layer 1 structural scan
- `last_audit.md` — last full audit report

## Usage

```bash
# Analyse only files changed since last commit:
uv run scripts/rlm_runner.py diff --repo . --since HEAD~1 --output /tmp/rlm_diff.json

# Save new verdicts to store:
uv run scripts/rlm_runner.py store --verdicts-dir /tmp/rlm_verdicts/ --store .rlm/verdicts/
```
