interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Narodowy Bank Polski (National Bank of Poland) Web API MCP. Keyless.
 *
 * Base: https://api.nbp.pl/api
 * - Exchange rate tables: A (major currencies, mid-rate), B (other currencies, mid-rate),
 *   C (bid/ask trading rates). Rates are PLN per 1 unit of the listed currency.
 * - Single-currency series by ISO 4217 code (e.g. USD, EUR, GBP).
 * - Gold price (cena złota): PLN per 1g of pure gold (1000 millesimal fineness).
 *
 * Quirks: dates are YYYY-MM-DD; data goes back to 2002-01-02. NBP publishes rates only on
 * working days — weekends and Polish public holidays return HTTP 404 (no data). Asking for
 * a single non-publication date 404s; ranges silently skip those days.
 */


const BASE = 'https://api.nbp.pl/api';
const UA = 'pipeworx-mcp-nbp-pl/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'exchange_rate_table',
    description:
      'Full NBP exchange-rate table of PLN rates for many currencies at once. Pick a table: A = major currencies (mid-rate), B = other/minor currencies (mid-rate), C = bid/ask trading rates for the major set. Rates are PLN per 1 unit of each currency (per 100 for some minor units). Defaults to the latest published table; optionally pass a single date (YYYY-MM-DD) or last_n for the N most recent tables. Weekends/Polish holidays have no data (404).',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table letter: "A" (major mid), "B" (other mid), or "C" (bid/ask). Default "A".' },
        date: { type: 'string', description: 'Single publication date, YYYY-MM-DD, e.g. "2026-05-29". Must be a working day or it 404s.' },
        last_n: { type: 'integer', description: 'Return the N most recent tables instead of just today. Ignored if date is given.' },
      },
    },
  },
  {
    name: 'currency_rate',
    description:
      'PLN exchange rate for one currency over time. Specify the table (A/B for mid-rate, C for bid/ask) and a 3-letter ISO 4217 code (e.g. USD, EUR, GBP, CHF, JPY). Defaults to the latest rate; optionally pass a single date, last_n recent points, or a start_date/end_date window (max ~93 days, working days only). Use this for one currency; use exchange_rate_table for the whole list.',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table letter: "A" or "B" (mid-rate) or "C" (bid/ask). Default "A".' },
        code: { type: 'string', description: 'ISO 4217 currency code, e.g. "USD", "EUR", "GBP".' },
        date: { type: 'string', description: 'Single date, YYYY-MM-DD. Must be a working day or it 404s.' },
        last_n: { type: 'integer', description: 'Return the N most recent rates. Ignored if date or start_date is given.' },
        start_date: { type: 'string', description: 'Window start, YYYY-MM-DD. Pair with end_date. Max range ~93 days.' },
        end_date: { type: 'string', description: 'Window end, YYYY-MM-DD. Used with start_date.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'gold_price',
    description:
      'NBP accounting price of gold (cena złota): PLN per 1 gram of pure gold (1000 fineness). Defaults to the latest published price; optionally pass a single date, last_n recent points, or a start_date/end_date window (max ~93 days, working days only). Weekends/Polish holidays have no data (404).',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Single date, YYYY-MM-DD. Must be a working day or it 404s.' },
        last_n: { type: 'integer', description: 'Return the N most recent prices. Ignored if date or start_date is given.' },
        start_date: { type: 'string', description: 'Window start, YYYY-MM-DD. Pair with end_date. Max range ~93 days.' },
        end_date: { type: 'string', description: 'Window end, YYYY-MM-DD. Used with start_date.' },
      },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'exchange_rate_table': {
      const table = tableLetter(args.table);
      return nbpGet(`/exchangerates/tables/${table}${pathSuffix(args, false)}`);
    }
    case 'currency_rate': {
      const table = tableLetter(args.table);
      const code = reqStr(args, 'code', '"USD"').toUpperCase();
      return nbpGet(`/exchangerates/rates/${table}/${encodeURIComponent(code)}${pathSuffix(args, true)}`);
    }
    case 'gold_price':
      return nbpGet(`/cenyzlota${pathSuffix(args, true)}`);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function nbpGet(path: string): Promise<unknown> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}format=json`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`NBP: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

/**
 * Build the path suffix selecting today / a date / last_n / a date range.
 * Priority: date > start_date+end_date > last_n > today.
 * The /cenyzlota family uses /last/{n} (no trailing slash); exchangerates uses /last/{n}/.
 */
function pathSuffix(args: Record<string, unknown>, allowRange: boolean): string {
  const date = trimmed(args.date);
  if (date) return `/${date}`;

  if (allowRange) {
    const start = trimmed(args.start_date);
    const end = trimmed(args.end_date);
    if (start && end) return `/${start}/${end}`;
    if (start) throw new Error('start_date requires end_date (a YYYY-MM-DD window).');
  }

  const lastN = args.last_n;
  if (lastN != null) {
    const n = Math.trunc(Number(lastN));
    if (!Number.isFinite(n) || n < 1) throw new Error('last_n must be a positive integer.');
    return `/last/${n}`;
  }

  return '';
}

function tableLetter(v: unknown): string {
  const t = (typeof v === 'string' && v.trim() ? v.trim() : 'A').toUpperCase();
  if (t !== 'A' && t !== 'B' && t !== 'C') throw new Error('table must be "A", "B", or "C".');
  return t;
}

function trimmed(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
