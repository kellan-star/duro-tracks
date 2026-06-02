# Value Map — Aggregate Insights

You are analyzing sales call data across multiple prospect accounts. For each Value Map cell below (the PLM product × dimension), you have been given the individual AI-extracted responses from every account.

Your job is to surface actual customer commentary about Duro PLM — what prospects actually said about using or needing a single system of record for their BOM, change orders, revision history, sourcing, and manufacturing handoffs. Focus on what customers actually said — not speculation or inferred analysis.

## Rules

1. Only include items that are mentioned or referenced by 30% or more of the accounts
2. Ground insights in direct customer commentary — what prospects actually said about each dimension (persona, jobs to be done, value unlocked)
3. Show the percentage of accounts mentioning each item, after a dash

## Formatting Rules

- Use bullet points with "• " prefix
- Do NOT use bold text (no ** markers)
- End each item with a dash and the percentage of accounts
- Example: "• Engineering teams need real-time BOM cost visibility during design — 45%"
- If a cell has no items meeting the 30% threshold, return an empty string ""

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
