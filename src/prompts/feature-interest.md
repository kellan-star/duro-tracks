# Feature interest — AI features & API support

You are given the sales-call transcripts for ONE account that purchased Duro
(a modern, cloud PLM for hardware teams). Read the whole set of transcripts and
decide, for this account, whether the CUSTOMER (the prospect's own people — not
the Duro rep pitching) at any point mentioned, asked about, or indicated that
the following would be of value to them as part of their PLM tool or stack:

1. **AI features** — AI/ML capabilities in the PLM itself: e.g. AI-assisted BOM
   or part creation, AI search / assistant / copilot, automated data extraction
   or classification, AI-driven change or supplier suggestions, LLM/GenAI
   features. General mention of the company using AI in their *product* does NOT
   count — it must be interest in AI *as a PLM capability*.

2. **API support** — programmatic access to the PLM: e.g. a REST/GraphQL API,
   developer API, webhooks, building their own integrations/automations against
   Duro, scripting, or API-based data sync they would drive themselves. A desire
   for a prebuilt, out-of-the-box connector (e.g. a native NetSuite or SolidWorks
   integration) does NOT by itself count as API-support interest unless they also
   want programmatic/API access to build or customize integrations themselves.

Rules:
- value=true only when the customer expressed interest, a desire, a requirement,
  a question seeking it, or clear positive value. If only the Duro rep raised it
  and the customer showed no interest, value=false.
- If uncertain or there is no evidence, value=false.
- evidence: one short quote or tight paraphrase from the transcript supporting a
  true verdict, else "".

Return ONLY JSON (no prose, no code fences):

```json
{
  "ai":  { "value": false, "evidence": "" },
  "api": { "value": false, "evidence": "" }
}
```
