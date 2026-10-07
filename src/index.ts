import { readTestCases } from "./excel/reader.js";
import { PlaywrightMcpClient } from "./mcp/client.js";
import { TestExecutor } from "./agent/executor.js";
import { writeReports, CaseReport } from "./reporting/reporter.js";
import { config } from "./utils/config.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file") || "test-data/sample-test-cases.xlsx";
  const onlyTc = arg("--tc");

  console.log(`Reading test cases: ${file}`);
  const all = await readTestCases(file);
  const cases = onlyTc ? all.filter(tc => tc.id === onlyTc) : all;

  if (!cases.length) throw new Error("No matching test cases found.");

  console.log(`Loaded ${cases.length} test case(s).`);

  if (process.argv.includes("--demo")) {
    console.log("Demo mode: OpenAI and browser execution are disabled; results are not verified.");
    const reports: CaseReport[] = cases.map(tc => ({
      testCaseId: tc.id,
      scenario: tc.scenario,
      mode: "demo",
      status: "DEMO",
      steps: tc.steps.map(step => ({
        stepNo: step.stepNo,
        step: step.step,
        expected: step.expected,
        status: "DEMO",
        evidence: "Not executed: offline demo mode does not interact with a browser or verify the expected result.",
        turns: 0
      }))
    }));

    for (const report of reports) {
      console.log(`\n=== ${report.testCaseId}: ${report.scenario} ===`);
      for (const step of report.steps) {
        console.log(`[DEMO] Step ${step.stepNo}: ${step.step}`);
      }
    }

    const paths = await writeReports(reports);
    console.log("\nDemo reports written:");
    console.log(paths.jsonPath);
    console.log(paths.htmlPath);
    return;
  }

  if (!config.openaiApiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY (or run with --demo).");
  }

  console.log(`Connecting to Playwright MCP (${config.mcpPackage})...`);

  const mcp = new PlaywrightMcpClient();
  await mcp.connect();

  const executor = new TestExecutor(mcp);
  const reports: CaseReport[] = [];

  try {
    for (const tc of cases) {
      console.log(`\n=== ${tc.id}: ${tc.scenario} ===`);
      const steps = await executor.execute(tc);
      const status = steps.length === tc.steps.length && steps.every(s => s.status === "PASS") ? "PASS" : "FAIL";

      for (const s of steps) {
        console.log(`[${s.status}] Step ${s.stepNo}: ${s.step}`);
      }

      reports.push({
        testCaseId: tc.id,
        scenario: tc.scenario,
        mode: "live",
        status,
        steps
      });
    }
  } finally {
    await mcp.close();
  }

  const paths = await writeReports(reports);
  console.log(`\nReports written:`);
  console.log(paths.jsonPath);
  console.log(paths.htmlPath);
}

main().catch(error => {
  console.error("\nExecution failed:");
  console.error(error);
  process.exit(1);
});