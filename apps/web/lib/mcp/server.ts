import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ASSISTANT_ACTION_TOOLS, ASSISTANT_TOOL_LABELS } from '@recycleiq/engine';
import type { ZodType } from 'zod';
import { buildTools } from '@/lib/assistant/tools';
import type { BinSource } from '@/lib/bins';

const ACTIONS = new Set<string>(ASSISTANT_ACTION_TOOLS);

/**
 * The RecycleIQ MCP server: every tool of the dashboard assistant (municipal mode), for a municipality's own AI.
 * Same code and queries as the dashboard and the in-app assistant (lib/assistant/tools.ts).
 */
export function buildMcpServer(opts: { lang: 'el' | 'en'; binSource: BinSource }) {
  const server = new McpServer(
    { name: 'recycleiq', title: 'RecycleIQ · Δήμος', version: '0.1.0' },
    {
      instructions:
        'RecycleIQ: recycling data and operations for the Municipality of Athens. Use listNeighbourhoods for neighbourhood ids, ' +
        'findItems → whereDoesItGo for "which bin", kpis / scansPerDay / neighbourhoodRanking / topItems / categoryMix / environmentImpact for analytics, ' +
        'openAlerts / bulkyPickups for citizen reports, listRules for municipal rules. Results may include a "chart" object you can draw. ' +
        'Actions (acknowledgeAlerts, resolveAlerts, setRuleEnabled) change real data: confirm with the user first. Dashboard data is synthetic in this demo.',
    },
  );
  const tools = buildTools({ mode: 'municipal', lang: opts.lang, deviceId: null, districtId: null, binSource: opts.binSource }) as Record<
    string,
    { description?: string; inputSchema: unknown; execute?: (input: never, options: never) => unknown }
  >;
  for (const [name, t] of Object.entries(tools)) {
    const action = ACTIONS.has(name);
    server.registerTool(
      name,
      {
        title: ASSISTANT_TOOL_LABELS[name]?.[opts.lang] ?? name,
        description: t.description,
        inputSchema: t.inputSchema as ZodType,
        annotations: { readOnlyHint: !action, destructiveHint: false, idempotentHint: !action, openWorldHint: false },
      },
      async (input: unknown) => {
        try {
          const out = await t.execute!(input as never, { toolCallId: 'mcp', messages: [] } as never);
          return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as Record<string, unknown> };
        } catch (e) {
          return { isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : 'Tool failed' }] };
        }
      },
    );
  }
  return server;
}
