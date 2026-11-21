/**
 * Contract between the RecycleIQ assistant's tools (server) and the chat clients (dashboard, app).
 * Analytics tools return their data plus a `chart` hint; clients render it with their own components.
 */
export type AssistantMode = 'citizen' | 'municipal';

export type AssistantChart =
  | { type: 'bar'; title: string; unit?: string; items: { label: string; value: number; color?: string; hint?: string }[] }
  | { type: 'line'; title: string; unit?: string; points: { x: string; y: number }[] }
  | { type: 'kpis'; title: string; items: { label: string; value: string; hint?: string }[] }
  | { type: 'table'; title: string; columns: string[]; rows: (string | number)[][] }
  | { type: 'map-list'; title: string; items: { id: string; label: string; detail?: string; status?: string }[] };

/** Every tool output may carry a chart and says which bin data it used. */
export interface AssistantToolOutput {
  chart?: AssistantChart;
  /** 'synthetic' demo data, or 'osm' for real bins from OpenStreetMap. Activity data is always demo. */
  dataSource?: 'synthetic' | 'osm';
  [key: string]: unknown;
}

/** Tools that change something: the clients must show an approve / deny step for these. */
export const ASSISTANT_ACTION_TOOLS = ['reportFullBin', 'requestBulkyPickup', 'acknowledgeAlerts', 'resolveAlerts', 'setRuleEnabled'] as const;
export type AssistantActionTool = (typeof ASSISTANT_ACTION_TOOLS)[number];

/** Readable tool names for the "working…" chips in the chat. */
export const ASSISTANT_TOOL_LABELS: Record<string, { el: string; en: string }> = {
  findItems: { el: 'Αναζήτηση αντικειμένου', en: 'Looking up the item' },
  whereDoesItGo: { el: 'Κανόνες του Δήμου', en: 'Municipal rules' },
  listNeighbourhoods: { el: 'Γειτονιές', en: 'Neighbourhoods' },
  nearestBins: { el: 'Κοντινοί κάδοι', en: 'Nearest bins' },
  kpis: { el: 'Δείκτες', en: 'Key figures' },
  scansPerDay: { el: 'Σαρώσεις ανά ημέρα', en: 'Scans per day' },
  categoryMix: { el: 'Κατηγορίες', en: 'Categories' },
  topItems: { el: 'Συχνότερα αντικείμενα', en: 'Top items' },
  neighbourhoodRanking: { el: 'Κατάταξη γειτονιών', en: 'Neighbourhood ranking' },
  binsByKind: { el: 'Κάδοι ανά τύπο', en: 'Bins by type' },
  environmentImpact: { el: 'Όφελος για το περιβάλλον', en: 'Environmental benefit' },
  openAlerts: { el: 'Γεμάτοι κάδοι', en: 'Full bins' },
  bulkyPickups: { el: 'Παραλαβές ογκωδών', en: 'Bulky pickups' },
  neighbourhoodStories: { el: 'Ιστορίες γειτονιάς', en: 'Neighbourhood stories' },
  leaderboard: { el: 'Κατάταξη', en: 'Leaderboard' },
  listRules: { el: 'Κανόνες', en: 'Rules' },
  cityRequestStatus: { el: 'Κατάσταση αιτήματος', en: 'Request status' },
  reportFullBin: { el: 'Αναφορά γεμάτου κάδου', en: 'Full-bin report' },
  requestBulkyPickup: { el: 'Αίτημα παραλαβής ογκωδών', en: 'Bulky pickup request' },
  acknowledgeAlerts: { el: 'Ανάληψη αναφορών', en: 'Take on reports' },
  resolveAlerts: { el: 'Επίλυση αναφορών', en: 'Resolve reports' },
  setRuleEnabled: { el: 'Αλλαγή κανόνα', en: 'Change a rule' },
};
