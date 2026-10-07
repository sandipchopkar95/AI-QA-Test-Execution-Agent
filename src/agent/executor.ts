import OpenAI from "openai";
import { config } from "../utils/config.js";
import { PlaywrightMcpClient, McpTool } from "../mcp/client.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import type { TestCase, TestStep } from "../excel/types.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type StepResult = {
  stepNo: number;
  step: string;
  expected: string;
  status: "PASS" | "FAIL";
  evidence: string;
  turns: number;
};

function openAiTools(tools: McpTool[]) {
  return tools.map(t => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description || t.name,
      parameters: t.inputSchema || { type: "object", properties: {} }
    }
  }));
}

function safeJson(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

export class TestExecutor {
  private openai = new OpenAI({ apiKey: config.openaiApiKey });

  constructor(private mcp: PlaywrightMcpClient) {}

  private async executeStep(testCase: TestCase, step: TestStep, tools: McpTool[]): Promise<StepResult> {
    let messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Application base URL: ${config.baseUrl}
Test Case: ${testCase.id}
Scenario: ${testCase.scenario}
Step number: ${step.stepNo}
Test step: ${step.step}
Expected result: ${step.expected}
User role: ${step.role || "not specified"}
Test data: ${step.testData || "not specified"}

Execute this step and validate the expected result.`
      }
    ];

    let evidence = "";
    let status: "PASS" | "FAIL" = "FAIL";
    let turns = 0;

    for (; turns < config.maxAgentTurns; turns++) {
      const response = await this.openai.chat.completions.create({
        model: config.openaiModel,
        messages,
        tools: openAiTools(tools),
        tool_choice: "auto",
        temperature: 0
      });

      const msg = response.choices[0]?.message;
      if (!msg) throw new Error("OpenAI returned no message.");

      messages.push(msg);

      if (msg.tool_calls?.length) {
        for (const call of msg.tool_calls) {
          const args = JSON.parse(call.function.arguments || "{}");
          let result: unknown;
          try {
            result = await this.mcp.callTool(call.function.name, args);
          } catch (error) {
            result = { error: error instanceof Error ? error.message : String(error) };
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: safeJson(result)
          });
        }
        continue;
      }

      const text = msg.content || "";
      evidence = text;

      const pass = /\bPASS\b/i.test(text) && !/\bFAIL\b/i.test(text);
      status = pass ? "PASS" : "FAIL";
      break;
    }

    return { stepNo: step.stepNo, step: step.step, expected: step.expected, status, evidence, turns };
  }

  async execute(testCase: TestCase): Promise<StepResult[]> {
    const tools = await this.mcp.listTools();
    const results: StepResult[] = [];

    await mkdir(join(process.cwd(), "generated", testCase.id), { recursive: true });
    await writeFile(
      join(process.cwd(), "generated", testCase.id, "execution-context.json"),
      JSON.stringify(testCase, null, 2)
    );

    for (const step of testCase.steps) {
      const result = await this.executeStep(testCase, step, tools);
      results.push(result);

      if (result.status === "FAIL") {
        // Stop the current test case on a hard validation failure.
        break;
      }
    }

    return results;
  }
}