# Test Plan — Job Search Automation System

Test each step in isolation before running the full workflow. Use n8n's "Execute Node" feature
(right-click any node → "Execute Node") to test individual steps.

---

## Phase 1 — Credential Verification

### Test 1.1 — Apify API Token
**Goal:** Confirm Apify credentials work and can start an actor run.

In n8n, create a test HTTP Request node:
```
Method: GET
URL: https://api.apify.com/v2/users/me
Auth: HTTP Query Auth (Apify API Token)
```
**Expected:** JSON response with your Apify user info (`{ "data": { "username": "...", ... } }`)

---

### Test 1.2 — Anthropic API Key
**Goal:** Confirm Claude API works with a minimal request.

In n8n, create a test HTTP Request node:
```
Method: POST
URL: https://api.anthropic.com/v1/messages
Auth: HTTP Header Auth (Anthropic API Key) — field: x-api-key
Headers: anthropic-version: 2023-06-01, Content-Type: application/json
Body (raw JSON):
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 50,
  "messages": [{"role": "user", "content": "Reply with the word CONFIRMED only."}]
}
```
**Expected:** `{ "content": [{ "text": "CONFIRMED" }], ... }`

---

### Test 1.3 — Google Sheets OAuth2
**Goal:** Confirm Sheets credentials work.

In n8n, use a Google Sheets node in "Read" mode on your Job Tracker sheet with only 1 row to read.
**Expected:** Returns the header row.

---

### Test 1.4 — Slack
**Goal:** Confirm Slack bot can post to your channel.

In n8n, use a Slack node to post "Test message from n8n" to your channel.
**Expected:** Message appears in Slack.

---

### Test 1.5 — Apollo API
**Goal:** Confirm Apollo credentials work.

In n8n, create a test HTTP Request:
```
Method: POST
URL: https://api.apollo.io/v1/people/search
Body: {"api_key": "YOUR_KEY", "q_organization_name": "Stripe", "per_page": 1}
```
**Expected:** JSON with `people` array containing at least one result.

---

### Test 1.6 — ZeroBounce
**Goal:** Confirm ZeroBounce works.

```
Method: GET
URL: https://api.zerobounce.net/v2/validate
Params: api_key=YOUR_KEY, email=test@example.com, ip_address=
```
**Expected:** `{ "status": "do_not_mail", ... }` — any valid API response.

---

### Test 1.7 — Gmail OAuth2
**Goal:** Confirm Gmail can send email.

Use the Gmail node in n8n to send a test email to yourself.
**Expected:** Email arrives in your inbox.

---

## Phase 2 — Workflow 1 Step-by-Step Testing

### Test 2.1 — Apify Hiring.cafe Scrape (Step 1)
**Goal:** Confirm the actor starts, runs, and returns job data.

1. Open `workflow1_steps1-4` in n8n
2. Manually trigger the workflow
3. Click on the "Apify: Start Hiring.cafe Scrape" node after execution
4. Check the output JSON

**Expected:**
```json
{
  "data": {
    "id": "run-id-string",
    "status": "SUCCEEDED",
    "defaultDatasetId": "dataset-id-string"
  }
}
```
**If failed:** Check that `APIFY_HIRING_CAFE_ACTOR_ID` variable is set correctly and the actor exists in your Apify account.

---

### Test 2.2 — Apify Fetch Hiring.cafe Dataset (Step 1 continued)
**Goal:** Confirm dataset fetch returns job items.

After Test 2.1, click "Apify: Fetch Hiring.cafe Dataset" node output.

**Expected:** Array of job objects. Even if the CSS selectors don't perfectly match Hiring.cafe's layout, you should see some raw data.

**If empty:** Hiring.cafe may have changed its HTML structure. Update the CSS selectors in the `pageFunction` inside the actor input body of the "Apify: Start Hiring.cafe Scrape" node.

---

### Test 2.3 — Apify LinkedIn Scrape (Step 2)
Same as 2.1/2.2 but for the LinkedIn scraper.

**Expected:** Array with fields like `title`, `company`, `description`, `applyUrl`.

**Common issue:** LinkedIn scraping requires a proxy. Confirm `"useApifyProxy": true` is set in the actor input. If still failing, check that your Apify plan includes proxy access.

---

### Test 2.4 — Normalize and Deduplicate (Step 3)
**Goal:** Confirm jobs from both sources are normalized to a common schema and duplicates removed.

After running both Apify steps, click on "Normalize and Deduplicate Jobs" output.

**Expected:** Array of items each with:
```json
{
  "title": "...",
  "company": "...",
  "description": "...",
  "salary": "...",
  "applicationUrl": "...",
  "source": "hiring.cafe|linkedin",
  "scrapedAt": "2026-04-13T07:00:00.000Z"
}
```

**Debugging tips:**
- If `title` or `company` is empty for many items, the field name mapping in the Code node needs adjustment. Check what field names the Apify actors actually return.
- Open one raw item from the Apify fetch node and note the exact field names, then update the normalization code.

---

### Test 2.5 — Claude Scoring (Step 4)
**Goal:** Confirm Claude returns valid JSON scores.

For testing without running the full pipeline, use a manual trigger with a hardcoded test job:

1. Add a "Set" node before "Prepare Claude Scoring Request" with test data:
```json
{
  "title": "Senior Director of Product, Compliance Technology",
  "company": "Stripe",
  "description": "We are looking for a Senior Director of Product to lead our compliance and regulatory technology platform. You will own the product strategy for AML, KYC, and sanctions screening systems processing billions of transactions. Requirements: 10+ years PM experience, deep regulatory technology expertise, experience with ML-powered compliance systems, MBA preferred.",
  "salary": "$280,000 - $320,000",
  "applicationUrl": "https://stripe.com/jobs/test",
  "source": "test"
}
```

2. Run from the Set node through "Filter: Score >= 7"

**Expected:**
- "Prepare Claude Scoring Request" outputs a valid `_claudeRequestBody` JSON string
- "Claude API: Score Job Fit" returns HTTP 200 with `content[0].text` containing valid JSON
- "Parse Claude Score Response" outputs `score` of 8-10, `fitReasons` array, `gaps` array, `summary` string
- "Filter: Score >= 7" passes the item through (it should score 9-10 for this test case)

**If Claude returns non-JSON text:** Check that the system prompt correctly instructs returning only JSON. The `cleaned` variable in the parse node strips code fences.

---

### Test 2.6 — Full Workflow 1 Steps 1-4 End-to-End
**Goal:** Run the complete pipeline with live data.

1. Use the Manual Test Trigger
2. Monitor each node's execution time and output
3. Expected total runtime: 5-15 minutes (Apify scraping takes time)

**Expected final output at "High Score Jobs - Ready for Steps 5-7":** 3-15 job items with score >= 7.

---

## Phase 3 — Workflow 1 Steps 5-7 Testing

### Test 3.1 — Resume Tailoring (Step 5)
Use the same test job from Test 2.5 as input to the Manual Trigger in `workflow1_steps5-7`.

**Expected:** Claude returns a valid JSON with `headline`, `summary`, `coinbaseBullets`, `goldmanBullets`.

---

### Test 3.2 — Google Sheets Write (Step 6)
After Test 3.1, check your Google Sheet.

**Expected:** A new row appears with all 19 columns populated. Verify:
- Score is a number (not text)
- Application URL is clickable
- `Outreach Sent` column contains "No"

---

### Test 3.3 — Slack Message (Step 7)
After Test 3.2, check your Slack channel.

**Expected:** A formatted message with the job title, company, score, and fit reasons. The "Apply" button should link to the application URL.

---

## Phase 4 — Workflow 2 Testing

### Test 4.1 — Apollo Contact Discovery (Step 2)
Pre-populate your test Google Sheet row with `Score=8` and `Outreach Sent=No` for `Company=Ramp`.

Run the Manual Test Trigger in Workflow 2 through just the Apollo node.

**Expected:** Returns a contact with `email`, `first_name`, `last_name`, `title` fields.

**Common issue:** Apollo's free tier may return contacts without emails. Upgrade to Basic or use the "Reveal" credits.

---

### Test 4.2 — Email Validation (Step 3)
Using the email from Test 4.1, run through ZeroBounce.

**Expected:** `status: "valid"` for a real business email, or `status: "invalid"/"catch-all"` for others. Only `valid` emails pass the filter.

---

### Test 4.3 — Cold Email Generation (Step 4)
Run a test through "Prepare Email Generation Request" and "Claude API: Generate Cold Email" with:
```
contactName: "Alex Smith"
contactTitle: "Head of Product"
Company: "Ramp"
Title: "Senior Director of Product"
contactOrgSize: 1000
fitReasons: "Fintech infrastructure expertise, compliance tech at Coinbase, production AI experience"
tailoredHeadline: "Fintech Infrastructure Product Leader | Compliance & Payments"
```

**Expected:** Claude returns a subject line and email body under 150 words. Read the email manually — it should:
- Reference something specific about Ramp (procurement automation, spend management)
- Not use any of the banned generic phrases
- Have a natural, non-salesy tone
- Be exactly the format specified in `prompts/cold_email.txt`

---

### Test 4.4 — Gmail Send (Step 5)
**IMPORTANT:** Test this by sending to your own email address first.

In the "Gmail: Send Cold Email" node, temporarily hardcode `sendTo` to your own email, run the test, verify the email renders correctly, then restore the `{{ $json.toEmail }}` expression.

---

### Test 4.5 — Sheet Update (Step 6)
After Test 4.4, verify the Google Sheet row has been updated with:
- `Outreach Sent`: "Yes"
- `Outreach Date`: Today's date
- `Contact Name`: The contact's name
- `Contact Email`: The validated email address

---

## Phase 5 — Go-Live Checklist

Before activating both workflows on a schedule:

- [ ] All 7 credentials verified (Tests 1.1-1.7)
- [ ] Apify actors return valid job data (Tests 2.1-2.3)
- [ ] Claude scoring works end-to-end (Tests 2.4-2.6)
- [ ] Resume tailoring outputs valid JSON (Test 3.1)
- [ ] Google Sheets write is working (Test 3.2)
- [ ] Slack alerts are formatted correctly (Test 3.3)
- [ ] Apollo returns valid contacts (Test 4.1)
- [ ] ZeroBounce validation works (Test 4.2)
- [ ] Email generation produces quality output (Test 4.3 — review manually)
- [ ] Gmail send confirmed with self-test (Test 4.4)
- [ ] Sheet update marks outreach sent (Test 4.5)
- [ ] Workflow 1 and Workflow 2 linked correctly (Steps 1-4 output feeds Steps 5-7)
- [ ] Both workflows set to "Active" in n8n
- [ ] Rate limit of 20 emails/day confirmed in Workflow 2

---

## Ongoing Monitoring

After going live, check these weekly:

1. **Google Sheet** — Are new rows appearing daily? Are scores reasonable?
2. **Slack** — Are daily job reports arriving at 7 AM?
3. **Gmail Sent** — Are cold emails actually sending? Check for bounce notifications.
4. **Apify Usage** — Monitor actor run credits in Apify console.
5. **Anthropic Usage** — Check API usage dashboard to catch runaway costs.
6. **ZeroBounce Credits** — Replenish when low.

---

## Troubleshooting Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Apify run returns `status: FAILED` | Actor input config error | Check actor logs in Apify console |
| Deduplication returns 0 jobs | Field name mismatch in normalization | Log raw Apify output, update field names in Code node |
| Claude returns non-JSON | Prompt injection or model issue | Check raw API response in node output |
| `score` is NaN after parsing | Claude wrapped JSON in code fences | The `replace` in parse node handles this — check for new wrapper format |
| Apollo returns empty `people` | Rate limit or plan restriction | Check Apollo usage dashboard |
| ZeroBounce returns `invalid` for real emails | Catch-all domain | Consider allowing `catch-all` status in the filter |
| Gmail hitting send limits | Google's daily send limit (500 emails/day personal, 2000 Workspace) | Rate is already limited to 20/day — should not be an issue |
| Google Sheets update not matching row | Update uses Company as key — not unique | Add a Row ID column and update by row number instead |
