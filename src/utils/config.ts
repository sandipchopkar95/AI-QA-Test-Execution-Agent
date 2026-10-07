import "dotenv/config";

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.6",
  baseUrl: process.env.BASE_URL || "",
  mcpCommand: process.env.PLAYWRIGHT_MCP_COMMAND || "npx",
  mcpPackage: process.env.PLAYWRIGHT_MCP_PACKAGE || "@playwright/mcp@latest",
  mcpHeadless: process.env.PLAYWRIGHT_MCP_HEADLESS === "true",
  mcpBrowser: process.env.PLAYWRIGHT_MCP_BROWSER || "chromium",
  maxAgentTurns: Number(process.env.MAX_AGENT_TURNS || 40),
  maxRecoveryAttempts: Number(process.env.MAX_RECOVERY_ATTEMPTS || 2),
  stepTimeoutMs: Number(process.env.STEP_TIMEOUT_MS || 45000)
};