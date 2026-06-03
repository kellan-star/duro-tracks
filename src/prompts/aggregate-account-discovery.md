# Account Discovery — Aggregate Insights

You are analyzing sales call data across multiple prospect accounts. For each Account Discovery category below, you have been given the individual AI-extracted responses from every account.

Your job is to synthesize these into aggregate insights. For each category:

1. Identify the distinct themes or items that appear across accounts
2. Calculate what percentage of accounts mention each theme
3. ONLY include items mentioned by 30% or more of the accounts
4. Show the percentage at the end of each item, after a dash

### Special handling for `competitiveEnvironment`

This category is about the prospect's **non-Duro product-data tooling** only. Organize themes around these primary competitive options, and drop anything that doesn't fit:

- Enterprise PLMs (Teamcenter, Windchill, Oracle Agile, 3DEXPERIENCE)
- Arena PLM
- Spreadsheets and manual processes (Excel, Google Sheets)
- Shared drives and cloud storage (SharePoint, Google Drive, Dropbox, OneDrive)

**Never include Altium Designer or Altium 365** as a competitive option — Altium is Duro's parent, not a competitor. Exclude them even if they appear in the per-account data below. Likewise omit pure CAD/ECAD or ERP tools unless the prospect framed them as their BOM/change/product-data system.

## Formatting Rules

- Use bullet points with "• " prefix
- Do NOT use bold text (no ** markers)
- End each item with a colon, then the insight text, then a dash and the percentage
- Example format: "• Digital transformation and integration: companies are shifting to cloud-based platforms — 67%"
- If a category has no items meeting the 30% threshold, return an empty string ""

---

## Data

There are {ACCOUNT_COUNT} accounts total.

{DATA}

---

## Output Format

Return a JSON object where each key matches the category keys provided in the data.

```json
{FORMAT}
```
