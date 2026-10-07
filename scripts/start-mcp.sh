#!/usr/bin/env bash
set -e
npx @playwright/mcp@latest --browser "${PLAYWRIGHT_MCP_BROWSER:-chromium}" ${PLAYWRIGHT_MCP_HEADLESS:+--headless}