# Why customers bought Duro

You are given, for a set of accounts that **purchased Duro**, the key facts
already extracted from their sales calls: Company Priorities, Urgency, Decision
Criteria, Identified Pain, Value Unlocked (PLM), and Competitors considered.

Determine the MAIN reasons these customers chose Duro, synthesized across the
accounts.

Rules:
- Ground every reason in the provided data. Be specific and concrete, e.g.:
  first-party CAD integrations (SolidWorks / Onshape / NX / Altium); up-and-running
  in days vs. multi-month legacy PLM rollouts; replacing spreadsheets / shared
  drives with a single BOM system of record; change-order / ECO control and
  revision history; modern UX / ease of admin; supplier data (Octopart /
  SiliconExpert); ERP/MES integration (NetSuite / First Resonance); scaling the
  team without data chaos; compliance / traceability (ITAR, AS9100).
- Merge near-duplicates into a single, well-named theme.
- For each theme, count how many of the accounts it applies to and list their names.
- Order themes by count, descending.

Return ONLY JSON (no prose, no code fences):

```json
{
  "themes": [{ "reason": "", "count": 0, "accounts": [""] }],
  "narrative": "2-4 sentence summary of the dominant purchase drivers"
}
```
