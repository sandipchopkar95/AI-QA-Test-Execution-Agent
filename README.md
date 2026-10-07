# AI QA Test Execution Agent

Read QA test cases from an Excel workbook, then either run them with an OpenAI model and a Playwright MCP-controlled browser or generate an offline demo report.

## What it does

- Reads the first worksheet of an `.xlsx` workbook.
- Groups step rows into test cases and sorts steps by step number.
- In live mode, sends each step and expected result to the configured OpenAI model. The model can use the tools provided by the Playwright MCP server to interact with the browser.
- Writes timestamped JSON and HTML reports under `reports/`.
- In demo mode, shows the cases and steps and writes reports marked `DEMO`. Demo mode does not call OpenAI, start a browser, or verify expected results.

This project does not generate or execute a separate Playwright test file for each Excel row. Live execution depends on the model, the browser tools, and the target application's availability and state.

## Requirements

- Node.js 20 or later
- npm
- For live execution: a valid OpenAI API key, network access, and an accessible application under test
- For live browser execution: Playwright MCP and a supported browser. The default MCP package is invoked through `npx`.

## Install and configure

```bash
npm install
cp .env.example .env
```

For live execution, edit `.env` and set:

```dotenv
OPENAI_API_KEY=your_valid_openai_api_key
OPENAI_MODEL=gpt-5.6
BASE_URL=https://your-qa-environment.example.com
```

Do not commit `.env` or put passwords in the workbook. `User Role` is passed to the model as test context; this starter project does not implement role-specific login or credential profiles. Ensure the target application and any required test data or authenticated browser state are available to the run.

## Run the sample workbook

### Offline demo (no API key or browser)

```bash
npm run run:sample:demo
```

The command reads `test-data/sample-test-cases.xlsx`, prints each case and step, and creates JSON and HTML reports. Every case and step has status `DEMO`; these are not test results and must not be interpreted as PASS or FAIL.

### Live execution

```bash
npm run run:sample
```

Live execution requires a valid OpenAI API key. It starts the configured Playwright MCP server and attempts to execute the sample against the application described in the workbook and `BASE_URL`.

## Run a workbook or selected case

```bash
npm run run -- --file "/absolute/path/to/test-cases.xlsx"
```

To select one exact test case ID:

```bash
npm run run -- --file "/absolute/path/to/test-cases.xlsx" --tc SEN2-27129_001
```

Add `--demo` to either command to generate an offline demo report instead of calling OpenAI or starting the browser:

```bash
npm run run -- --file "/absolute/path/to/test-cases.xlsx" --tc SEN2-27129_001 --demo
```

## Excel workbook format

The reader uses the first worksheet and expects headers in row 1. It requires columns for a case ID, a test step, and an expected result. Header matching ignores case, surrounding whitespace, and differences between underscores, hyphens, and spaces. Supported names include:

| Data | Recognized header examples |
|---|---|
| Test case ID | `Test Case ID`, `TC ID`, `Test Case`, `ID` |
| Scenario | `Test Scenario`, `Scenario`, `Title` |
| Step number | `Step No`, `Step Number`, `Step #` |
| Test step | `Test Step`, `Steps`, `Action`, `Instruction`, `Instructions (test step)` |
| Expected result | `Expected Result`, `Expected`, `Expected Outcome`, `Expected results (test step)` |
| Test data | `Test Data`, `Data` |
| User role | `User Role`, `Role`, `Persona` |

The provided workbook follows a QA-export, row-per-step layout. Its relevant columns are:

| ID | Scenario | Instructions (test step) | Expected results (test step) | User Role |
|---|---|---|---|---|
| `SEN2-27129_001` | Verify Apartments section appears on Resident Overview when resident has multiple apartments | Navigate to the Resident Overview page for the resident with multiple apartments. | The Resident Overview page loads and displays an 'Apartments' section with heading 'Apartments'. | `CLIENT REP` |
| *(blank; continues previous case)* | *(blank)* | Observe the section heading in the Apartments section. | The heading displays exactly 'Apartments'. | *(blank)* |
| `SEN2-27129_002` | Verify no plus icon for adding apartment in Apartments section | Inspect the top-right corner of the Apartments section for a plus icon. | No plus icon is present. | `CLIENT REP` |

When an `ID` cell is blank, the row is grouped under the most recent non-empty ID. Rows without a current or inherited ID, or without test-step text, are skipped. If a step number is absent or not numeric, its position in that case is used. Steps are sorted by step number before execution. Other workbook columns are retained as row metadata in the parsed case data, but are not automatically treated as execution instructions.

You can also use the simpler format below:

| Test Case ID | Test Scenario | Step No | Test Step | Expected Result | Test Data | User Role |
|---|---|---:|---|---|---|---|
| `TC001` | Verify resident preferences | 1 | Navigate to Residences | Residences page is displayed | | `CLIENT_ADMIN` |
| `TC001` | Verify resident preferences | 2 | Search for resident "John Smith" | John Smith is displayed | John Smith | `CLIENT_ADMIN` |

## Configuration

The available environment settings are listed in `.env.example`.

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required for live mode; not needed for `--demo`. |
| `OPENAI_MODEL` | OpenAI model used for live execution. |
| `BASE_URL` | Application URL provided to the model as context. |
| `PLAYWRIGHT_MCP_COMMAND` | MCP launch command; defaults to `npx`. |
| `PLAYWRIGHT_MCP_PACKAGE` | MCP package; defaults to `@playwright/mcp@latest`. |
| `PLAYWRIGHT_MCP_HEADLESS` | Set to `true` to request headless browser mode. |
| `PLAYWRIGHT_MCP_BROWSER` | Browser name; defaults to `chromium`. |
| `MAX_AGENT_TURNS` | Maximum model/tool-loop turns per step. |
| `MAX_RECOVERY_ATTEMPTS` | Reserved execution setting; recovery attempts are not currently implemented. |
| `STEP_TIMEOUT_MS` | Reserved execution setting; per-step timeout is not currently enforced. |

The username and password placeholders in `.env.example` are not currently wired into browser login. Do not rely on them to authenticate a run.

## Reports and generated files

Each run writes:

```text
reports/
  execution-<timestamp>.json
  execution-<timestamp>.html
```

Live reports contain model-reported step evidence and `PASS`/`FAIL` statuses. They do not guarantee that screenshots or other evidence artifacts were captured. Demo reports use `DEMO` statuses and explicitly state that execution and verification did not occur.

Live execution also writes the parsed test-case context under:

```text
generated/<test-case-id>/execution-context.json
```

This is input context for the run, not an AI-generated execution plan.

## Troubleshooting

### Missing or invalid OpenAI API key

Live mode requires a valid key. For parsing and report-format demonstrations without a key, use:

```bash
npm run run:sample:demo
```

### Workbook header error

Check that the first worksheet has its header row in row 1 and includes an ID, test-step, and expected-result column using one of the recognized names above.

### Browser or application is unavailable

Check the MCP command/package and browser settings, network access, and that the application under test is reachable. The model receives `BASE_URL` as context; the project does not automatically configure application-specific login or seed test data.

## Limitations

- Live execution is model-driven and depends on the MCP tools and browser state available at runtime.
- The sample workbook describes application-specific Resident Overview scenarios; it does not provision the application, residents, apartments, or other test data.
- Role names and other unrecognized workbook columns are context/metadata only unless the execution code is extended to use them.
- Demo output is for demonstrating workbook ingestion and report generation only; it is not evidence that any test passed.
