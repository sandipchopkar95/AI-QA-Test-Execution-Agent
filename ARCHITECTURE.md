# Architecture

```text
Excel
  -> Reader
  -> Test Case
  -> OpenAI reasoning loop
  -> MCP tool calls
  -> @playwright/mcp
  -> Browser
  -> step validation
  -> JSON/HTML report
```

The agent does not require you to write a Playwright test for each case.

The "background coding" concept is implemented as internal AI execution planning/audit artifacts under `generated/<TC_ID>/`. Browser execution is performed through MCP tools. This avoids turning every natural-language test case into permanent handwritten Playwright source code.

For a later version, a code-generation worker can optionally emit a temporary `.spec.ts` into a run workspace and execute it, while keeping it invisible to the tester. That is deliberately not the default because direct MCP execution preserves browser state and agentic recovery better for natural-language tests.