# Sales Call Transcript Analysis

Analyze the following sales call transcripts for a prospect account. Extract information for three frameworks: Account Discovery (7 questions), Value Map (the PLM product × 3 dimensions), and MEDDPICC (8 categories).

## About Duro (the seller)

Duro is a cloud-native product lifecycle management (PLM) platform for engineering-led hardware companies. It centralizes the bill of materials, change orders, sourcing data, revision history, and supplier integrations into a single system of record — letting multidisciplinary teams (mechanical, electrical, firmware, supply chain, manufacturing) collaborate on product data without spreadsheets, shared drives, or the multi-month rollouts that legacy PLM typically requires.

Duro's ideal customer profile centers on venture-backed deep-tech and mid-market hardware companies in industries like Aerospace & Defense, Space & Satellite, Robotics, Industrial Automation, EV & Energy, and Sensors — the "complex electromechanical" segment. The SMB sweet spot is 10–75-employee companies with 5–30 engineers; the broader mid-market ICP extends to ~1,000-employee organizations.

Duro positions against legacy PLM (Arena, Teamcenter, Propel, Upchain) on speed, manageability, and modern UX (e.g., a change order takes ~7 clicks in Duro vs. ~35 in Arena; "up and running in a day" vs. six-month implementations). Differentiators include first-party CAD integrations (SolidWorks, Onshape, NX, Altium Designer), supplier data via Octopart and SiliconExpert, ERP via NetSuite, and MES via First Resonance, Tulip, and Stoke Fusion. Duro was acquired by Altium (a Renesas subsidiary) and is being integrated into Altium's Agile Teams platform as the system of record for hardware product information.

When analyzing, keep this context in mind — the "competitive environment" should focus on the non-Duro tools the prospect uses today (spreadsheets, shared drives, Arena, Teamcenter, Oracle Agile, Propel, Upchain, etc.).

## Critical Rules

1. **Prospect-only focus**: Every answer must be about the PROSPECT/CUSTOMER company, never about the selling team. The following people are Duro sales representatives — do NOT reference them as champions, economic buyers, decision-makers, personas, or in any other framework answer:
   - Blake O'Connor, Reese Fairchild (Duro sales team)
   - Anyone with an @durolabs.co, @altium.com, or @renesas.com email address
   - Do NOT include: Duro reps presenting features, Duro employees demonstrating products, or any actions taken by the Duro team

2. **Answer the question or leave blank**: Each field must directly answer its specific question. If the transcript does not contain information relevant to that specific question, use an empty string "". Do not fill a field with tangentially related information. A good test: if you removed the field label, would a reader know which question the answer belongs to?

3. **No fabrication**: Only include information clearly stated or directly implied in the transcripts. Do not speculate or infer beyond what was discussed.

4. **Ground in specifics**: Prefer concrete details from the conversation over abstract summaries. Reference specific names, numbers, tools, timelines, and situations the prospect mentioned. For example, instead of "interested in improving collaboration," write "need to share the BOM between Austin and Shanghai offices (5 engineers each)."

5. **Multi-call synthesis**: When multiple call transcripts are provided, synthesize them into the most current and complete picture. If information from a later call updates or contradicts an earlier call, use the most recent information. Do not repeat the same point from different calls.

6. **Mark stated vs. implied**: When a point was explicitly stated by the prospect, present it directly. When something is reasonably implied but not directly said, prefix it with "[Implied]" so the reader knows the confidence level. Example: "• [Implied] Budget cycle: fiscal year likely ends in December based on timeline discussion"

## Formatting

Use bullet points (with "• " prefix) for multiple items. Each bullet item should have a short label followed by a colon, then the detail (e.g., "• Cost reduction: aiming to cut BOM rework by 20%"). Do NOT use bold text or markdown formatting (no ** markers). If no relevant information exists for a field, use an empty string "".

---

## Framework 1: Account Discovery

**companyPriorities**: What business goals is the customer or prospect aiming to achieve (e.g., 20% reduction in costs, double production volume, hit a launch date)? Only include goals stated by prospect employees.

**competitiveEnvironment**: Which non-Duro tools is the PROSPECT currently using or evaluating for managing their BOM, change orders, and product data? Focus on these primary competitive options:
- Enterprise PLMs (Teamcenter, Windchill, Oracle Agile, 3DEXPERIENCE)
- Arena PLM
- Spreadsheets and manual processes (Excel, Google Sheets)
- Shared drives and cloud storage (SharePoint, Google Drive, Dropbox, OneDrive)

Capture which of these (or other PLM tools such as Propel, Upchain, Fusion 360 Manage) the prospect uses or is evaluating, including editions/versions if mentioned. **IMPORTANT: Altium Designer and Altium 365 are NOT competitors — never list them here** (Altium is Duro's parent). This field is about the prospect's current/alternative product-data tooling only.

**urgency**: Why does the PROSPECT need to make a change now? What business event, deadline, funding milestone, audit, or consequence is driving their timeline? If no urgency was expressed, leave blank — do not invent urgency.

**span**: How many people at the PROSPECT are involved in design, development, and production? Include specific team sizes, disciplines (mechanical, electrical, firmware, supply chain, manufacturing), office locations, and roles if mentioned.

**financialImpact**: What is the cost of the prospect's current approach? Include specific numbers if mentioned: time wasted, rework costs, scrap, compliance risks, recall costs, delays between teams. Do NOT include Duro pricing or licensing costs here — this is about the cost of the status quo.

**commonBarriers**: What obstacles at the PROSPECT could prevent or delay adoption? Budget constraints, change resistance, IT/security policies, competing priorities, incumbent-tool lock-in. Only include barriers the prospect has actually raised or that are clearly implied.

**counterStrategy**: Has the prospect discussed how they would justify or prove the value of a new PLM internally? What evidence or results would they need to convince skeptics at their company?

---

## Framework 2: Value Map

For the single product **PLM**, fill the three cells below from what the PROSPECT actually said. Ground every answer in the prospect's own words/context; do NOT fill a cell from what a Duro rep pitched. Use a cell's empty string only if the call genuinely contains nothing for it.

- **persona**: Who is the specific stakeholder at the PROSPECT who owns this problem? Name the role/title (e.g., Procurement Manager, Systems Architect, Hardware Engineering Lead, Operations / Supply Chain Lead) and their actual name if mentioned. Do NOT list Duro employees.
- **jobsToBeDone**: What specific task is the prospect failing at today because of manual processes or their current tools — described in their own context? Be concrete (e.g., "checking lead times across 500+ components manually," "reconciling BOM revisions across Excel files between mechanical and electrical").
- **valueUnlocked**: The specific value the prospect would gain by solving it with PLM, as a financial or KPI outcome where possible (e.g., time saved per change order, fewer BOM/scrap errors, faster release cycles, reduced rework). Use their words and numbers when available.

### Product:

**plm**: Duro PLM — the single system of record for hardware product data: managing the bill of materials, change orders / ECOs, revision history, sourcing and supplier data, releases, and manufacturing/ERP/MES handoffs across multidisciplinary teams.

---

## Framework 3: MEDDPICC

**metrics**: KPIs or performance metrics relevant to the PROSPECT'S business: their current values or targets, who at the prospect company owns each metric, trends, and whether they met expectations. Do NOT include Duro's metrics or sales targets.

**economicBuyer**: Key individuals AT THE PROSPECT COMPANY responsible for making or approving the purchase decision. Include their name, title, and role in the decision if mentioned. Never list Duro sales reps here. The economic buyer is the person who controls the budget — do not confuse them with the person the rep is selling to.

**decisionCriteria**: Key features, capabilities, or requirements the PROSPECT said the decision will be based on. What are their must-haves vs. nice-to-haves (e.g., specific CAD integration, ERP integration, ITAR/compliance support)? Only include criteria the prospect stated or clearly implied — not features the Duro rep pitched.

**decisionProcess**: The steps the PROSPECT will follow to make a final decision: evaluation stages, internal approvals needed, stakeholders who must sign off, timeline, and any blockers. Leave blank if the prospect hasn't described their process.

**paperProcess**: Steps the PROSPECT described for procurement, legal review, or contract approval. Who at their company is involved, expected timelines, and any current delays or complications. Leave blank if not discussed.

**identifyPain**: Specific problems and frustrations the PROSPECT is experiencing in their current workflow, tools, or processes (e.g., BOM errors, version conflicts, slow change orders, manufacturing miscommunication). Use their words when possible. Do NOT include pain points that the Duro rep suggested — only ones the prospect acknowledged.

**champion**: An advocate for Duro INSIDE THE PROSPECT COMPANY (not a Duro employee). This must be someone at the prospect who is actively pushing for adoption. Include their name, role, influence level, and specific actions they've taken (e.g., "organized an internal demo," "got budget approval from VP Eng"). If no clear champion at the prospect has been identified, use an empty string. Do NOT list: Duro sales reps, people who merely attended a demo, or contacts who haven't taken advocacy actions.

**competitors**: Competing PLM products or vendors the PROSPECT mentioned they are evaluating, currently using, or comparing against (e.g., Arena, Teamcenter, Propel, Upchain, or staying on spreadsheets). Include perceived strengths/weaknesses the prospect expressed. Do NOT list Duro as a competitor.

---

## Output Format

Return a single JSON object with three top-level keys. Use empty string "" for fields with no relevant information.

```json
{
  "accountDiscovery": {
    "companyPriorities": "",
    "competitiveEnvironment": "",
    "urgency": "",
    "span": "",
    "financialImpact": "",
    "commonBarriers": "",
    "counterStrategy": ""
  },
  "valueMap": {
    "plm": { "persona": "", "jobsToBeDone": "", "valueUnlocked": "" }
  },
  "meddpicc": {
    "metrics": "",
    "economicBuyer": "",
    "decisionCriteria": "",
    "decisionProcess": "",
    "paperProcess": "",
    "identifyPain": "",
    "champion": "",
    "competitors": ""
  }
}
```

Only include information clearly supported by the transcripts. Do not infer or fabricate details.
