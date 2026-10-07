export type TestStep = {
  testCaseId: string;
  scenario: string;
  stepNo: number;
  step: string;
  expected: string;
  testData?: string;
  role?: string;
  metadata: Record<string, string>;
};

export type TestCase = {
  id: string;
  scenario: string;
  steps: TestStep[];
  metadata: Record<string, string>;
};