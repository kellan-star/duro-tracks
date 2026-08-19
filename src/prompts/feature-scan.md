# Feature scan — AI features, API support, build-your-own PLM

You are given the sales-call transcripts for ONE account (a prospect or customer of
Duro, a modern cloud PLM for hardware teams). Read the whole set of transcripts and
decide, for this account, whether the CUSTOMER (the prospect's own people — not the
Duro rep pitching) at any point mentioned, asked about, or indicated the following:

1. **AI features** (`ai`) — interest in AI/ML capabilities inside the PLM itself: e.g.
   AI-assisted BOM or part creation, AI search / assistant / copilot, automated data
   extraction or classification, AI-driven change or supplier suggestions, LLM/GenAI
   features, natural-language search. General mention of the company using AI in their
   own *product* does NOT count — it must be interest in AI *as a PLM capability*.

2. **API support** (`api`) — interest in programmatic access to the PLM: a REST/GraphQL
   API, developer API, webhooks, building their own integrations/automations against
   Duro, scripting, or API-based data sync they would drive themselves. Wanting only a
   prebuilt, out-of-the-box connector (e.g. a native NetSuite or SolidWorks integration)
   does NOT by itself count unless they also want programmatic/API access to build or
   customize integrations themselves.

3. **Build-your-own PLM with AI** (`buildOwn`) — the customer indicated they would, are,
   or were seriously considering BUILDING THEIR OWN PLM / BOM management system in-house
   (rather than buying one), especially using AI/LLM tools, code generation, scripts, or
   internal engineering effort. Signals include: "we could just build this ourselves,"
   an active build-vs-buy evaluation, a homegrown/in-house system they already built or
   started, or using AI tools to generate their own PLM tooling. Simply using spreadsheets
   or shared drives does NOT count unless they framed it as building/maintaining their own
   PLM system. Merely using AI elsewhere does NOT count.

Rules:
- value=true only when the customer expressed interest, a desire, a requirement, a
  question seeking it, or clear positive value / active consideration. If only the Duro
  rep raised it and the customer showed no interest, value=false.
- If uncertain or there is no evidence, value=false.
- evidence: one short quote or tight paraphrase supporting a true verdict, else "".

Return ONLY JSON (no prose, no code fences):

```json
{
  "ai":       { "value": false, "evidence": "" },
  "api":      { "value": false, "evidence": "" },
  "buildOwn": { "value": false, "evidence": "" }
}
```
