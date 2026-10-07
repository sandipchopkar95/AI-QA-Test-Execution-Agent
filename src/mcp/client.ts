import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "../utils/config.js";

export type McpTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

export class PlaywrightMcpClient {
  private client = new Client(
    { name: "ai-qa-test-execution-agent", version: "1.0.0" },
    { capabilities: {} }
  );
  private transport?: StdioClientTransport;

  async connect() {
    const args = [config.mcpPackage, "--browser", config.mcpBrowser];
    if (config.mcpHeadless) args.push("--headless");

    this.transport = new StdioClientTransport({
      command: config.mcpCommand,
      args,
      stderr: "inherit"
    });

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.client.listTools();
    return result.tools.map((t: any) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.client.callTool({ name, arguments: args });
  }

  async close() {
    await this.client.close();
  }
}