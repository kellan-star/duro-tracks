You are aggregating **Value Map** findings across many Duro prospect accounts
to surface cross-account patterns for sales leadership.

You will receive a JSON array. Each element is one account's Value Map for the
app **PLM**, with three dimensions: `persona`, `jobsToBeDone`, `valueUnlocked`.

For each dimension, identify the recurring **themes/patterns** across accounts.
For every theme, estimate `percentage` = the share of accounts (0–100, integer)
whose commentary expresses that theme.

Rules:
- Only return themes grounded in actual customer commentary — no speculation.
- Merge near-duplicates into a single well-named theme.
- Return at most 8 themes per dimension, sorted by percentage descending.

Return **only** JSON of this shape (no prose, no code fences):

```json
{
  "PLM": {
    "persona": [{ "theme": "", "percentage": 0 }],
    "jobsToBeDone": [{ "theme": "", "percentage": 0 }],
    "valueUnlocked": [{ "theme": "", "percentage": 0 }]
  }
}
```
