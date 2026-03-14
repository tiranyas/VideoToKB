#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Configuration ──────────────────────────────────────────

const API_KEY = process.env.KBIFY_API_KEY;
const BASE_URL = process.env.KBIFY_URL || "https://video-to-kb.vercel.app";

if (!API_KEY) {
  console.error("Error: KBIFY_API_KEY environment variable is required");
  console.error("Get your API key from: Settings > API in the KBify app");
  process.exit(1);
}

// ── HTTP Client ────────────────────────────────────────────

async function apiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── MCP Server ─────────────────────────────────────────────

const server = new McpServer({
  name: "KBify",
  version: "1.0.0",
});

// Tool: generate_article
server.tool(
  "generate_article",
  "Generate a structured KB article from a video URL (YouTube, Loom, Google Drive) or a raw transcript. " +
    "Returns markdown and optionally platform-specific HTML (HelpJuice, Notion, etc.). " +
    "The article is saved to the user's KBify account automatically.",
  {
    videoUrl: z
      .string()
      .optional()
      .describe(
        "URL of a YouTube, Loom, or Google Drive video to transcribe and convert to an article"
      ),
    transcript: z
      .string()
      .optional()
      .describe(
        "Raw transcript text to convert into an article (alternative to videoUrl)"
      ),
    articleType: z
      .string()
      .optional()
      .describe(
        "Article type ID to use (e.g. 'screen-overview'). Defaults to user's preference."
      ),
    platform: z
      .string()
      .optional()
      .describe(
        "Platform profile ID for output format (e.g. 'helpjuice', 'notion', 'markdown-only'). Defaults to user's preference."
      ),
  },
  async ({ videoUrl, transcript, articleType, platform }) => {
    if (!videoUrl && !transcript) {
      return {
        content: [
          {
            type: "text" as const,
            text: 'Error: Either "videoUrl" or "transcript" is required. Provide a Loom/Google Drive URL or paste a transcript.',
          },
        ],
      };
    }

    const body: Record<string, unknown> = {};
    if (videoUrl) body.videoUrl = videoUrl;
    if (transcript) body.transcript = transcript;
    if (articleType) body.articleType = articleType;
    if (platform) body.platform = platform;

    const { ok, data } = await apiRequest("POST", "/api/v1/generate", body);

    if (!ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${data.error || "Failed to generate article"}`,
          },
        ],
        isError: true,
      };
    }

    // Build a nice response
    const parts: string[] = [];
    parts.push(`# ${data.title}`);
    parts.push("");
    parts.push(`**Article ID:** ${data.id}`);
    parts.push(`**Article Type:** ${data.articleType}`);
    parts.push(`**Platform:** ${data.platform}`);
    parts.push("");
    parts.push("---");
    parts.push("");
    parts.push(data.markdown as string);

    if (data.html) {
      parts.push("");
      parts.push("---");
      parts.push("");
      parts.push("## Platform Output");
      parts.push("");
      parts.push("```html");
      parts.push(data.html as string);
      parts.push("```");
    }

    return {
      content: [{ type: "text" as const, text: parts.join("\n") }],
    };
  }
);

// Tool: list_articles
server.tool(
  "list_articles",
  "List recent articles from the user's KBify account. Returns article IDs, titles, and metadata.",
  {},
  async () => {
    // Use the Supabase REST API through the app's api-keys endpoint
    // Since we don't have a dedicated list endpoint via API key, we'll note this limitation
    return {
      content: [
        {
          type: "text" as const,
          text:
            "To list articles, visit your KBify dashboard or use the sidebar in the app. " +
            "The API currently supports article generation. " +
            "Use generate_article to create new articles from video URLs or transcripts.",
        },
      ],
    };
  }
);

// ── Start Server ───────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start KBify MCP server:", err);
  process.exit(1);
});
