# AI QA Test Execution Agent

Excel/plain-English test cases -> AI execution planner -> Playwright MCP -> browser -> PASS/FAIL + evidence.

## What this framework does

You do NOT write Playwright test code for individual test cases.

1. Put your test cases in Excel.
2. Run the agent.
3. The AI reads each plain-English step and expected result.
4. The AI uses the official Microsoft `@playwright/mcp` server to operate the browser.
5. The framework captures step results, screenshots when available, execution notes, and a JSON/HTML report.
6. AI-generated execution plans are stored under `generated/` for debugging/audit; they are not required in the Excel file.

The framework is intentionally hybrid:
- Excel = test source of truth
- OpenAI = reasoning/planning + expected-result interpretation
- Playwright MCP = browser control
- This framework = orchestration, test-case management, evidence and reporting

## Prerequisites

- Node.js 20+
- An OpenAI API key
- Network access to your QA environment
- The official Microsoft Playwright MCP package is installed on demand through `npx`

Playwright MCP documentation:
https://playwright.dev/mcp

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env`.

Then:

```bash
npm run run:sample
```

To demonstrate Excel parsing and report generation without an OpenAI key or browser:

```bash
npm run run:sample:demo
```

Demo reports label every case and step as `DEMO`; they are illustrative only and do not represent verified test results.

For your own Excel:

```bash
npm run run -- --file "/absolute/path/to/test-cases.xlsx"
```

Optional:

```bash
npm run run -- --file test-data/sample-test-cases.xlsx --tc TC001
```

## Excel format

The parser supports a practical row-per-step structure:

| Test Case ID | Test Scenario | Step No | Test Step | Expected Result | Test Data | User Role |
|---|---|---:|---|---|---|---|
| TC001 | Verify resident preferences | 1 | Login to PSP as Client Admin | Dashboard is displayed | | CLIENT_ADMIN |
| TC001 | Verify resident preferences | 2 | Navigate to Residences | Residences page is displayed | | CLIENT_ADMIN |
| TC001 | Verify resident preferences | 3 | Search for resident "John Smith" | John Smith is displayed | John Smith | CLIENT_ADMIN |

Header names are normalized, so common variants such as `TC ID`, `Test Case`, `Steps`, `Expected`, etc. are accepted.
QA exports using `ID`, `Scenario`, `Instructions (test step)`, and `Expected results (test step)` are also supported. If a continuation row leaves `ID` blank, it is grouped under the most recent non-empty ID.

## How execution works

For every test case:

```text
Excel
  |
  v
Test Case Parser
  |
  v
AI Execution Planner
  |
  v
MCP Agent Loop
  |
  v
@playwright/mcp
  |
  v
Browser
  |
  +--> step outcome
  +--> recovery attempt
  +--> evidence
  |
  v
Report
```

The agent is given the test step and expected result plus the current browser state. It can call the Playwright MCP tools that are exposed by the local MCP server.

## Important design decision

Do NOT ask the model to return arbitrary Playwright code and execute it blindly.

Instead, the model uses MCP tools such as navigation, snapshot, click, type, form fill, assertions/checks and screenshots. This keeps the browser control structured and auditable.

The `generated/` folder stores the model's internal execution plan/notes so you can inspect why an action was chosen.

## Credentials

For a first local proof of concept, environment variables are supported.

For production:
- use your CI secret variables or a secrets manager;
- never commit `.env`;
- never put passwords in the Excel sheet;
- use role aliases such as `CLIENT_ADMIN`, `CLIENT_VIEWER`, `RESIDENT`.

## Reports

After execution:

```text
reports/
  execution-<timestamp>.json
  execution-<timestamp>.html
```

The JSON report is machine-readable. The HTML report is human-readable.

## Current MVP capabilities

- Excel test-case ingestion
- Multiple test cases in one workbook
- Plain-English steps
- Expected-result interpretation
- Role/test-data context
- OpenAI-driven execution loop
- Local Playwright MCP server
- Browser execution without authoring test code
- Step-level PASS/FAIL
- Agent recovery turns
- JSON + HTML reporting
- Internal AI execution plan/audit files

## Recommended next upgrades

1. Add your existing 21-column QA Excel template mapping.
2. Add login/credential profiles per role.
3. Add Jira integration for failed cases.
4. Add API validation tools for UI + API tests.
5. Add persistent browser/storage state for SSO.
6. Add parallel workers after the single-worker flow is stable.
7. Add a web dashboard.
8. Add a "Generate/Execute/Review" approval mode.

## Troubleshooting

### Browser does not open
Run:
```bash
npx @playwright/mcp@latest
```
by itself once and verify Node/browser setup.

### AI does not act
Check:
- `OPENAI_API_KEY`
- `BASE_URL`
- network access
- MCP server startup
- model availability for your account

### Test fails on a locator
The agent can inspect the current accessibility snapshot and attempt recovery. Keep recovery bounded; do not allow unlimited retries.

## Disclaimer

This is a production-oriented starter framework, not a drop-in guarantee for every application's authentication, CAPTCHA, SSO, iframe, native-dialog, or custom-widget behavior. Those application-specific capabilities should be added as controlled tools/configuration rather than hardcoded into every test.