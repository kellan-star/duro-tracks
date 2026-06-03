# Value Map — Aggregate Insights

You are analyzing sales call data across multiple prospect accounts. For each Value Map cell below (the PLM product × dimension), you have been given the individual AI-extracted responses from every account.

Your job is to surface actual customer commentary about Duro PLM — what prospects actually said about using or needing a single system of record for their BOM, change orders, revision history, sourcing, and manufacturing handoffs. Focus on what customers actually said — not speculation or inferred analysis.

## Rules

1. Surface the most common themes for each cell — include any theme mentioned by **2 or more accounts** (or ≥10% of accounts, whichever is lower). Do NOT apply a high threshold; Value Map commentary is diverse, so err toward showing the top themes.
2. Return up to 5 themes per cell, ordered most-common first. If at least one account said anything for a cell, include at least the top theme.
3. Ground every theme in direct customer commentary — what prospects actually said about persona, the job to be done, or the value unlocked. No speculation.
4. Show the percentage of accounts mentioning each theme, after a dash.

## Formatting Rules

- Use bullet points with "• " prefix
- Do NOT use bold text (no ** markers)
- End each item with a dash and the percentage of accounts
- Example: "• Engineering teams need real-time BOM cost visibility during design — 18%"
- Only return an empty string "" for a cell if NO account said anything relevant to it

---

## Data

There are {ACCOUNT_COUNT} accounts total.

{DATA}

---

## Output Format

Return a JSON object where each key matches the category keys provided in the data (using "appKey.columnKey" format, e.g. "plm.persona").

```json
{FORMAT}
```
