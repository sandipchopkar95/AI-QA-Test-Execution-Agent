import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type CaseReport = {
  testCaseId: string;
  scenario: string;
  mode: "demo" | "live";
  status: "PASS" | "FAIL" | "DEMO";
  steps: Array<{
    stepNo: number;
    step: string;
    expected: string;
    status: "PASS" | "FAIL" | "DEMO";
    evidence: string;
    turns: number;
  }>;
};

export async function writeReports(reports: CaseReport[]) {
  const dir = join(process.cwd(), "reports");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = join(dir, `execution-${stamp}.json`);
  const htmlPath = join(dir, `execution-${stamp}.html`);

  await writeFile(jsonPath, JSON.stringify(reports, null, 2));

  const isDemo = reports.every(report => report.mode === "demo");
  const rows = reports.flatMap(r => r.steps.map(s => `
    <tr>
      <td>${escapeHtml(r.testCaseId)}</td>
      <td>${s.stepNo}</td>
      <td>${escapeHtml(s.step)}</td>
      <td>${escapeHtml(s.expected)}</td>
      <td><b>${s.status}</b></td>
      <td><pre>${escapeHtml(s.evidence)}</pre></td>
    </tr>`)).join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>AI QA Execution Report</title>
<style>
body{font-family:Arial,sans-serif;margin:24px} table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;vertical-align:top} th{background:#f3f3f3}
pre{white-space:pre-wrap;margin:0} .summary{margin-bottom:20px}
</style></head><body>
<h1>AI QA Execution Report</h1>
<div class="summary">
${isDemo ? "<p><b>DEMO MODE:</b> No browser actions were performed and expected results were not verified.</p>" : ""}
<p>Total cases: ${reports.length}</p>
<p>Passed: ${reports.filter(r => r.status === "PASS").length}</p>
<p>Failed: ${reports.filter(r => r.status === "FAIL").length}</p>
<p>Demo (unverified): ${reports.filter(r => r.status === "DEMO").length}</p>
</div>
<table><thead><tr><th>TC</th><th>Step</th><th>Test Step</th><th>Expected</th><th>Status</th><th>Evidence / Notes</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

  await writeFile(htmlPath, html);
  return { jsonPath, htmlPath };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]!));
}