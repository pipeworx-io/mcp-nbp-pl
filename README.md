# mcp-nbp-pl

Narodowy Bank Polski (National Bank of Poland) Web API MCP. Keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Nbp Pl data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
