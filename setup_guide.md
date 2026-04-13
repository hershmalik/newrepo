# Setup Guide — Job Search Automation System

## Overview

This system runs two n8n workflows daily:
- **Workflow 1** (7 AM): Scrape jobs → score with Claude → tailor resumes → log to Google Sheets → Slack alert
- **Workflow 2** (8 AM): Read sheet → find decision maker email via Apollo → validate via ZeroBounce → generate cold email with Claude → send via Gmail

---

## Step 1 — Required API Keys

### 1.1 Apify (Job Scraping)
**Where to get it:** https://console.apify.com/account/integrations

1. Create a free Apify account
2. Go to **Settings → Integrations → API token**
3. Copy your personal API token
4. **Actor IDs you need:**
   - **LinkedIn Jobs:** Search the Apify Store for `hrishikesh1990/linkedin-jobs-scraper` — copy the actor ID (format: `hrishikesh1990~linkedin-jobs-scraper`)
   - **Hiring.cafe:** Search the Apify Store for a Hiring.cafe scraper, or use `apify/web-scraper` with the custom page function already embedded in the workflow. Actor ID: `apify~web-scraper`

**Note:** Apify free tier gives 5 actor runs/month. You need at least the **Starter plan ($49/mo)** for daily runs. Alternatively, use the Pay-Per-Event model.

---

### 1.2 Anthropic (Claude API)
**Where to get it:** https://console.anthropic.com/settings/keys

1. Create an Anthropic account and add billing
2. Go to **API Keys → Create Key**
3. Copy the key (starts with `sk-ant-`)
4. **Expected monthly cost:** ~$5-15 for daily scoring + resume tailoring + email generation (depending on job volume). The workflow uses `claude-sonnet-4-20250514`.

---

### 1.3 Apollo.io (Contact Discovery)
**Where to get it:** https://app.apollo.io/#/settings/integrations/api

1. Create an Apollo account (free tier allows limited searches)
2. Go to **Settings → Integrations → API**
3. Copy your API key
4. **Recommended plan:** Basic ($49/mo) for up to 250 email exports/month, which covers ~12 days of 20-email outreach days

---

### 1.4 ZeroBounce (Email Validation)
**Where to get it:** https://www.zerobounce.net/

1. Create a ZeroBounce account
2. Go to **Dashboard → API Key**
3. Copy your API key
4. **Cost:** $16 for 2,000 validations — enough for months of daily use

---

### 1.5 Gmail OAuth2 (Email Sending)
**Where to get it:** Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create a new project or use an existing one
3. Enable the **Gmail API** under APIs & Services → Library
4. Create OAuth2 credentials:
   - Application type: **Web application**
   - Authorized redirect URIs: Add your n8n OAuth callback URL: `https://YOUR_N8N_URL/rest/oauth2-credential/callback`
5. Download client ID and secret
6. In n8n, create a Gmail OAuth2 credential with those values and authorize it

---

### 1.6 Google Sheets OAuth2
Same Google Cloud project as Gmail — the Sheets API needs to be enabled:
1. Enable the **Google Sheets API** in your Google Cloud project
2. The same OAuth2 client can be reused in n8n if you add the Sheets scope
3. Or create a separate credential in n8n (type: "Google Sheets OAuth2")

---

### 1.7 Slack
**Where to get it:** https://api.slack.com/apps

1. Create a new Slack App for your workspace
2. Go to **OAuth & Permissions** and add the `chat:write` bot scope
3. Install to your workspace and copy the **Bot User OAuth Token** (starts with `xoxb-`)
4. In n8n: create a Slack credential using the API token type

---

## Step 2 — n8n Credential Setup

In your n8n instance, create the following credentials:

| Credential Name | Type | Field | Value |
|----------------|------|-------|-------|
| `Apify API Token (Query)` | HTTP Query Auth | `token` | Your Apify API token |
| `Anthropic API Key` | HTTP Header Auth | `x-api-key` | Your Anthropic API key |
| `Apollo API Key` | HTTP Header Auth | `x-api-key` | Your Apollo API key |
| `ZeroBounce API Key` | HTTP Query Auth | `api_key` | Your ZeroBounce API key |
| `Gmail OAuth2` | Gmail OAuth2 | — | Authorize via Google |
| `Google Sheets OAuth2` | Google Sheets OAuth2 | — | Authorize via Google |
| `Slack API` | Slack API | Token | Your `xoxb-` bot token |

---

## Step 3 — Google Sheet Setup

Create a new Google Sheet named **"Job Search Tracker"** with one sheet tab named **"Job Tracker"**.

Add these column headers in **Row 1** exactly (case and spacing must match):

```
A: Date
B: Company
C: Title
D: Score
E: Fit Reasons
F: Gaps
G: Fit Summary
H: Salary
I: Application URL
J: Source
K: Tailored Headline
L: Tailored Summary
M: Coinbase Bullets
N: Goldman Bullets
O: Resume Status
P: Outreach Sent
Q: Outreach Date
R: Contact Name
S: Contact Email
```

Copy the Google Sheet ID from the URL:
`https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_IS_HERE/edit`

---

## Step 4 — Workflow Configuration

After importing the workflows, update these placeholder values:

### In all workflow files:
| Placeholder | Replace with |
|------------|-------------|
| `REPLACE_APIFY_QUERY_CRED_ID` | Your Apify credential ID from n8n |
| `REPLACE_ANTHROPIC_CRED_ID` | Your Anthropic credential ID from n8n |
| `REPLACE_APOLLO_CRED_ID` | Your Apollo credential ID from n8n |
| `REPLACE_ZEROBOUNCE_CRED_ID` | Your ZeroBounce credential ID from n8n |
| `REPLACE_GMAIL_CRED_ID` | Your Gmail credential ID from n8n |
| `REPLACE_GOOGLE_SHEETS_CRED_ID` | Your Google Sheets credential ID from n8n |
| `REPLACE_SLACK_CRED_ID` | Your Slack credential ID from n8n |
| `REPLACE_WITH_YOUR_GOOGLE_SHEET_ID` | Your Google Sheet ID |
| `REPLACE_WITH_YOUR_SLACK_CHANNEL_ID` | Your Slack channel/DM ID |

### n8n Variables (Settings → Variables):
| Variable | Value |
|----------|-------|
| `APIFY_HIRING_CAFE_ACTOR_ID` | `apify~web-scraper` (or your custom actor) |
| `APIFY_LINKEDIN_ACTOR_ID` | `hrishikesh1990~linkedin-jobs-scraper` |

**How to find your Slack channel ID:**
1. Open Slack in a browser
2. Right-click your personal DM or target channel
3. Click "Copy Link" — the ID is the last segment of the URL (e.g., `D01ABC123XY`)

---

## Step 5 — Import Workflows into n8n

1. Open your n8n instance
2. Click **"New Workflow"** (or the "+" button)
3. Click the **three dots menu** → **"Import from file"**
4. Import `workflow1_steps1-4.json` first
5. Repeat for `workflow1_steps5-7.json` and `workflow2_outreach.json`

**Linking Workflow 1 (Steps 1-4) to Workflow 1 (Steps 5-7):**

In `workflow1_steps1-4.json`, the "High Score Jobs - Ready for Steps 5-7" NoOp node is the handoff point. To connect the two workflows:

1. Replace the NoOp node with an **"Execute Workflow"** node
2. Set the workflow ID to the imported ID of `workflow1_steps5-7`
3. This passes the high-score jobs directly into steps 5-7

Alternatively, run them as a single combined workflow by merging the JSON.

---

## Step 6 — Apify Actor Configuration

### LinkedIn Jobs Actor
The recommended actor is `hrishikesh1990/linkedin-jobs-scraper`. Input parameters used:
```json
{
  "queries": ["principal product manager fintech", "senior director product AI", "TPM fintech compliance", "AI platform product manager"],
  "location": "United States",
  "resultsPerPage": 25,
  "maxResults": 100,
  "proxy": {"useApifyProxy": true}
}
```

### Hiring.cafe Actor
Hiring.cafe uses a search URL format: `https://hiring.cafe/?q=QUERY`
The workflow uses `apify/web-scraper` with a custom page function to extract job cards.
You may need to inspect Hiring.cafe's HTML and update the CSS selectors in the page function if the site layout changes.

**Alternative:** Search the Apify Store for `hiring.cafe` to find a dedicated actor.

---

## Step 7 — Testing

See `test_plan.md` for a step-by-step testing protocol before going live.

---

## Monthly Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| n8n Cloud | Starter | $20/mo |
| Apify | Starter | $49/mo |
| Anthropic | Pay-as-you-go | ~$10/mo |
| Apollo.io | Basic | $49/mo |
| ZeroBounce | 2,000 credits | $16 one-time |
| Gmail / Google Sheets | Free (Google Workspace) | $0-$6/mo |
| Slack | Free tier | $0 |
| **Total** | | **~$145-155/mo** |

This is a fully automated daily pipeline. At $150/month, a single offer at your target salary recoups the cost in under an hour of work.
