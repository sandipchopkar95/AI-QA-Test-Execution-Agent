import ExcelJS from "exceljs";
import type { TestCase, TestStep } from "./types.js";

const aliases: Record<string, string[]> = {
  testCaseId: ["test case id", "tc id", "testcase id", "test case", "tc", "id"],
  scenario: ["test scenario", "scenario", "title"],
  stepNo: ["step no", "step number", "step", "step #"],
  step: ["test step", "steps", "test steps", "action", "instruction", "instructions (test step)"],
  expected: ["expected result", "expected results (test step)", "expected", "expected outcome"],
  testData: ["test data", "data"],
  role: ["user role", "role", "persona"]
};

function normalize(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findColumn(headers: string[], names: string[]): number {
  const normalized = headers.map(normalize);
  for (const name of names) {
    const index = normalized.indexOf(normalize(name));
    if (index >= 0) return index;
  }
  return -1;
}

export async function readTestCases(filePath: string): Promise<TestCase[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no worksheets.");

  const headerRow = sheet.getRow(1);
  const headers = headerRow.values.slice(1).map((v: any) => String(v ?? ""));

  const columns = {
    testCaseId: findColumn(headers, aliases.testCaseId),
    scenario: findColumn(headers, aliases.scenario),
    stepNo: findColumn(headers, aliases.stepNo),
    step: findColumn(headers, aliases.step),
    expected: findColumn(headers, aliases.expected),
    testData: findColumn(headers, aliases.testData),
    role: findColumn(headers, aliases.role)
  };

  if (columns.testCaseId < 0 || columns.step < 0 || columns.expected < 0) {
    throw new Error("Excel must contain Test Case ID, Test Step and Expected Result columns.");
  }

  const cases = new Map<string, TestCase>();
  let previousTestCaseId = "";

  for (let r = 2; r <= sheet.rowCount; r++) {
    const values = sheet.getRow(r).values.slice(1) as any[];
    const get = (index: number) => index >= 0 ? String(values[index] ?? "").trim() : "";

    const currentTestCaseId = get(columns.testCaseId);
    if (currentTestCaseId) previousTestCaseId = currentTestCaseId;
    const id = currentTestCaseId || previousTestCaseId;
    const step = get(columns.step);
    const expected = get(columns.expected);
    if (!id || !step) continue;

    const metadata: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) metadata[h] = String(values[i] ?? "").trim();
    });

    const item: TestStep = {
      testCaseId: id,
      scenario: get(columns.scenario),
      stepNo: Number(get(columns.stepNo)) || (cases.get(id)?.steps.length ?? 0) + 1,
      step,
      expected,
      testData: get(columns.testData),
      role: get(columns.role),
      metadata
    };

    if (!cases.has(id)) {
      cases.set(id, { id, scenario: item.scenario || id, steps: [], metadata });
    }
    cases.get(id)!.steps.push(item);
  }

  return [...cases.values()].map(tc => ({
    ...tc,
    steps: tc.steps.sort((a, b) => a.stepNo - b.stepNo)
  }));
}