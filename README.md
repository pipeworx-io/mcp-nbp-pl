# mcp-nbp-pl

Narodowy Bank Polski (National Bank of Poland) Web API MCP. Keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `exchange_rate_table` | Full NBP exchange-rate table of PLN rates for many currencies at once. Pick a table: A = major currencies (mid-rate), B = other/minor currencies (mid-rate), C = bid/ask trading rates for the major set. Rates are PLN per 1 unit of each currency (per 100 for some minor units). Defaults to the latest published table; optionally pass a single date (YYYY-MM-DD) or last_n for the N most recent tables. Weekends/Polish holidays have no data (404). |
| `currency_rate` | PLN exchange rate for one currency over time. Specify the table (A/B for mid-rate, C for bid/ask) and a 3-letter ISO 4217 code (e.g. USD, EUR, GBP, CHF, JPY). Defaults to the latest rate; optionally pass a single date, last_n recent points, or a start_date/end_date window (max ~93 days, working days only). Use this for one currency; use exchange_rate_table for the whole list. |
| `gold_price` | NBP accounting price of gold (cena złota): PLN per 1 gram of pure gold (1000 fineness). Defaults to the latest published price; optionally pass a single date, last_n recent points, or a start_date/end_date window (max ~93 days, working days only). Weekends/Polish holidays have no data (404). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "nbp-pl": {
      "url": "https://gateway.pipeworx.io/nbp-pl/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/nbp-pl/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Nbp Pl data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
