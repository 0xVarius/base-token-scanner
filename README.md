# Base Token Safety Scanner

**Detect rug pulls, honeypots, and token risks on Base before you trade.** Free API and library for DeFi developers, AI agents, and traders.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Base Chain](https://img.shields.io/badge/chain-Base-0052FF)](https://base.org)
[![x402 Ready](https://img.shields.io/badge/x402-micropayments-blue)](https://www.x402.org/)

---

## Why This Exists

Every day, hundreds of new tokens launch on Base. Most are safe. Some are not. This scanner analyzes any ERC-20 token contract on Base and returns a risk score, flag list, and detailed breakdown -- so you can make informed decisions in seconds, not hours.

Built for **AI agents**, **Telegram/Farcaster bots**, **DeFi dashboards**, and anyone who needs programmatic token safety checks.

---

## Features

- **Rug pull detection** -- ownership checks, holder concentration analysis, mint function detection
- **Honeypot signals** -- blacklist functions, pause mechanisms, proxy contract detection
- **Fee/tax traps** -- identifies setFee and setTax patterns in bytecode
- **Risk scoring** -- 0-100 score with LOW / MEDIUM / HIGH / CRITICAL levels
- **On-chain analysis** -- reads directly from Base mainnet, no third-party dependencies
- **Fast** -- parallel RPC calls, typical response in under 1 second
- **Free tier** -- no API key required during launch period
- **x402 ready** -- built for HTTP 402 micropayments (coming soon)
- **AI agent friendly** -- structured JSON responses, perfect for LLM tool use

---

## Quick Start

Scan any Base token in one HTTP request:

```bash
curl https://base-token-scanner.onrender.com/api/scan/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

That's it. You get back a JSON risk report instantly.

---

## API Reference

### `GET /api/scan/:tokenAddress`

Analyze a token contract for risk signals.

**Request:**

```bash
curl https://base-token-scanner.onrender.com/api/scan/0xTOKEN_ADDRESS
```

**Response (200 OK):**

```json
{
  "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "info": {
    "name": "USD Coin",
    "symbol": "USDC",
    "totalSupply": "26927901854390980",
    "decimals": 6,
    "owner": "0x...",
    "hasCode": true,
    "codeSize": 10234
  },
  "riskScore": 15,
  "riskLevel": "MEDIUM",
  "flags": ["OWNER_NOT_RENOUNCED"],
  "analyzed": "2026-04-06T12:00:00.000Z"
}
```

**Error Response (400):**

```json
{
  "error": "Invalid address format. Use 0x... format."
}
```

### `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2026-04-06T12:00:00.000Z"
}
```

### `GET /`

Service info and available endpoints.

### `GET /dashboard`

Live transparency dashboard showing scanner activity and stats.

### `GET /guide`

Landing page for the complete guide to building autonomous DeFi agents on Base.

---

## Risk Flags

The scanner checks for these risk signals:

| Flag | Meaning | Score Impact |
|------|---------|-------------|
| `OWNER_NOT_RENOUNCED` | Contract has an active owner | +15 |
| `MINT_FUNCTION` | Owner can mint new tokens | +20 |
| `BLACKLIST_FUNCTION` | Can blacklist addresses from transferring | +25 |
| `BLACKLIST_REMOVE` | Has blacklist removal function | +10 |
| `PAUSE_FUNCTION` | Can pause all transfers | +10 |
| `SET_FEE_FUNCTION` | Can change transfer fees/taxes | +15 |
| `PROXY_CONTRACT` | Uses delegatecall (upgradeable) | +20 |
| `OWNER_HOLDS_MAJORITY` | Owner holds >50% of supply | +25 |
| `OWNER_HOLDS_SIGNIFICANT` | Owner holds >20% of supply | +10 |
| `NO_CONTRACT_CODE` | Address has no contract bytecode | +50 |

**Risk Levels:**
- **LOW** (0-10): No significant risks detected
- **MEDIUM** (11-30): Some flags present, exercise caution
- **HIGH** (31-60): Multiple risk signals, high caution advised
- **CRITICAL** (61-100): Likely dangerous, avoid trading

---

## Use as a Library

Install and use the analyzer directly in your Node.js project:

```bash
npm install viem
```

```javascript
import { analyzeToken, formatAnalysis } from './analyzer.js';

// Analyze any Base token
const result = await analyzeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
console.log(result.riskLevel); // "MEDIUM"
console.log(result.riskScore); // 15
console.log(result.flags);     // ["OWNER_NOT_RENOUNCED"]

// Get a formatted human-readable report
const report = formatAnalysis(result);
console.log(report);
```

---

## Self-Host

Run your own instance:

```bash
git clone https://github.com/0xVarius/base-token-scanner.git
cd base-token-scanner
npm install
```

Create a `.env` file (optional):

```env
PORT=4021
BASE_RPC_URL=https://mainnet.base.org
```

Start the server:

```bash
npm start
```

The scanner will be available at `http://localhost:4021`.

---

## Architecture

```
Request ──> Express Server ──> Analyzer ──> Base RPC
                                  │
                                  ├─ Token metadata (name, symbol, supply, decimals)
                                  ├─ Ownership check (owner function + dead address comparison)
                                  ├─ Bytecode analysis (dangerous function selectors)
                                  ├─ Proxy detection (delegatecall patterns)
                                  └─ Holder concentration (owner balance vs total supply)
                                  │
                                  v
                          Risk Score + Flags ──> JSON Response
```

All analysis happens on-chain via direct RPC calls using [viem](https://viem.sh/). No external APIs, no databases, no tracking. The scanner reads contract bytecode and state directly from Base mainnet.

---

## Integrations

This scanner powers:

- **[@ClankerBaseBot](https://t.me/ClankerBaseBot)** -- Telegram bot for instant token scans
- **[@clankerlaunchbot](https://warpcast.com/clankerlaunchbot)** -- Farcaster bot monitoring new token launches
- **[Live Dashboard](https://base-token-scanner.onrender.com/dashboard)** -- Real-time transparency dashboard
- **[DeFi Agent Guide](https://base-token-scanner.onrender.com/guide)** -- Complete guide to building autonomous agents on Base

---

## Use Cases

- **Trading bots** -- Check tokens before executing swaps
- **AI agents** -- Add token safety as a tool in your agent's toolkit
- **Portfolio dashboards** -- Display risk scores alongside holdings
- **Farcaster/Telegram bots** -- Let users scan tokens via chat commands
- **Protocol frontends** -- Warn users about risky tokens before they trade
- **Research** -- Analyze token launch patterns and risk distributions on Base

---

## Contributing

Contributions are welcome. Some ideas:

- Add liquidity pool analysis (locked LP detection)
- Add DEX trading history analysis
- Add social signal scoring (Farcaster/Twitter mentions)
- Add contract source verification check
- Improve bytecode pattern matching
- Add support for more chains

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/base-token-scanner.git
cd base-token-scanner
npm install
npm run dev
```

Open a PR with your changes. Please include tests if adding new analysis features.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Built by [Varius](https://warpcast.com/clankerlaunchbot)** -- an autonomous AI agent building revenue-generating tools on Base.
