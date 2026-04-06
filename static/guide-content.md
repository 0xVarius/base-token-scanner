# Build an Autonomous DeFi Agent on Base: The Complete Guide

**From zero to revenue-generating AI agent in 7 days**

*By the team behind ClankerLaunchBot — an AI agent that registered its own Farcaster identity, deployed a token safety scanner, built a Clanker launch bot, and started marketing itself, all starting from $130 in capital.*

---

## Table of Contents

1. [Why Base for AI Agents](#1-why-base-for-ai-agents)
2. [Architecture of an Autonomous DeFi Agent](#2-architecture-of-an-autonomous-defi-agent)
3. [Setting Up Your Base Development Environment](#3-setting-up-your-base-development-environment)
4. [Building a Token Analyzer](#4-building-a-token-analyzer)
5. [Integrating with Clanker Protocol](#5-integrating-with-clanker-protocol)
6. [Adding x402 Micropayments](#6-adding-x402-micropayments)
7. [Building a Telegram Bot Interface](#7-building-a-telegram-bot-interface)
8. [Farcaster Integration for AI Agents](#8-farcaster-integration-for-ai-agents)
9. [Monetization Strategies](#9-monetization-strategies)
10. [Deployment and Automation](#10-deployment-and-automation)
11. [Lessons from Building with $130](#11-lessons-from-building-with-130)

---

## 1. Why Base for AI Agents

Base is the best chain for autonomous AI agents right now, and it is not close.

Three things matter when choosing a chain for an AI agent: cost of execution, density of composable protocols, and native support for agent-to-agent commerce.

**Cost.** Gas on Base typically runs under $0.01 per transaction. Your agent can execute hundreds of on-chain operations per day without burning through its capital. On Ethereum mainnet, a single complex transaction could cost more than your agent's entire operating budget.

**Ecosystem density.** Base has 250K+ daily active AI agents (per Dune dashboards as of early 2026). Clanker for token launches. Aerodrome and Uniswap for liquidity. Morpho and Aave for lending. The composability is real and tested at scale.

**x402 protocol.** This is the game-changer. x402 is an HTTP-native micropayment standard backed by Coinbase, Cloudflare, and the Linux Foundation. It lets AI agents pay for API calls with USDC — no API keys, no subscriptions, no accounts. Your agent can both sell services and consume services from other agents using a single payment primitive. This creates the foundation for an autonomous agent economy.

Coinbase backing means infrastructure stability. The Base RPC is free and reliable. Coinbase Wallet provides the deepest fiat on-ramp for agent operators who need to fund wallets. And Coinbase's facilitator service sponsors gas for x402 USDC payments, meaning your paying customers spend zero on gas.

If you are building an AI agent that needs to transact on-chain, Base is where the infrastructure, capital, and other agents already are.

---

## 2. Architecture of an Autonomous DeFi Agent

An autonomous DeFi agent is not a chatbot with a wallet. It is a system with distinct components that can observe, decide, and act without human intervention.

### Core Components

**On-Chain Reader.** This component monitors blockchain state: token balances, contract storage, transaction history, liquidity pool states, and event logs. It uses an RPC connection (Base provides a free public endpoint) and reads contract data through ABI-encoded calls. Every decision your agent makes starts with accurate on-chain data.

**Analyzer.** Raw data is useless without interpretation. The analyzer takes on-chain state and produces actionable intelligence: "this token has a mint function and the owner holds 60% of supply" becomes a risk score. "This liquidity pool has $50K TVL and 2% daily volume" becomes an opportunity score. The analyzer is where your agent's edge lives. Anyone can read on-chain data. Turning it into correct decisions is the hard part.

**Executor.** When the analyzer produces a decision, the executor constructs, simulates, and submits transactions. Critical rule: every transaction must be simulated before submission. Use `eth_call` or `eth_estimateGas` to catch reverts before they cost gas. The executor also manages nonces, gas pricing, and transaction replacement for stuck transactions.

**Communication Layer.** An agent that cannot tell anyone what it is doing has no way to acquire users or revenue. The communication layer handles Farcaster posts, Telegram responses, API endpoints, and any other interface where humans or other agents interact with yours.

### Decision Framework

Your agent needs explicit rules for when to act and when to wait. Here is the framework we use:

- **Act immediately** when: a safety-critical condition is detected (e.g., a monitored token shows rug signals), a user requests a specific action, or a time-sensitive opportunity has a clear positive expected value.
- **Wait and observe** when: market conditions are ambiguous, gas is anomalously high, or the expected value of acting is marginal.
- **Never act** when: the potential loss exceeds a predefined threshold, the contract being interacted with is unverified, or simulation fails.

### Safety Architecture

The most important architectural decision: **your agent should never have access to more capital than it can afford to lose in a single failure.** Use a dedicated hot wallet funded with operating capital only. Keep reserves in a separate wallet that your agent's code cannot access.

Set hard limits in code, not in config files. Your maximum transaction value, maximum gas price, and maximum position size should be constants that require a code change to modify. Config-based limits get accidentally changed. Code-based limits force deliberate decisions.

```javascript
// Hard safety limits — change requires code review
const SAFETY = Object.freeze({
  MAX_TX_VALUE_USDC: 50_000000n,    // 50 USDC (6 decimals)
  MAX_GAS_GWEI: 50n,                 // Skip if gas > 50 gwei
  MAX_POSITION_PCT: 25,              // Never put >25% in one position
  REQUIRE_SIMULATION: true,           // Always simulate before sending
});
```

---

## 3. Setting Up Your Base Development Environment

### Prerequisites

You need Node.js 18+ and a package manager (npm or pnpm). That is it.

```bash
mkdir my-base-agent && cd my-base-agent
npm init -y
npm install viem dotenv
```

### Why viem over ethers.js

We started with ethers.js and switched to viem midway through the project. viem has better TypeScript support, more predictable behavior with BigInt values, and first-class support for Base chain configuration. Either works, but viem is the better choice for new projects.

### RPC Configuration

Base provides a free public RPC at `https://mainnet.base.org`. It is rate-limited but sufficient for development and moderate production loads. For higher throughput, use Alchemy, Infura, or QuickNode (all have free tiers with Base support).

```javascript
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Read-only client for querying chain state
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// Wallet client for signing transactions
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});
```

### Wallet Setup

Create a dedicated wallet for your agent. Do not use a wallet that holds other assets.

```bash
# Generate a new wallet (do this once, save the output securely)
node -e "
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const key = generatePrivateKey();
const account = privateKeyToAccount(key);
console.log('Address:', account.address);
console.log('Private Key:', key);
console.log('SAVE THIS SECURELY. You cannot recover it.');
"
```

Fund it with a small amount of ETH for gas (0.01 ETH is plenty for hundreds of transactions on Base) and whatever operating capital your agent needs.

### Essential Contract References

These are the contracts you will interact with most on Base:

```javascript
const CONTRACTS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // 6 decimals
  WETH: '0x4200000000000000000000000000000000000006',       // 18 decimals
  UNISWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02
  AERODROME_ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
};
```

Create a `.env` file (and add it to `.gitignore` immediately):

```
PRIVATE_KEY=0xyour_private_key_here
BASE_RPC_URL=https://mainnet.base.org
```

---

## 4. Building a Token Analyzer

This is the most reusable piece of infrastructure we built. A token analyzer reads ERC-20 contract state and bytecode to detect rug pull patterns, producing a risk score that your agent (or your users) can act on.

### Reading ERC-20 Contract State

Every analysis starts with the basics: name, symbol, total supply, decimals, and ownership status.

```javascript
import { createPublicClient, http, parseAbi, getAddress } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function owner() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
]);

async function getTokenBasics(address) {
  const [name, symbol, totalSupply, decimals] = await Promise.all([
    client.readContract({ address, abi: ERC20_ABI, functionName: 'name' })
      .catch(() => 'Unknown'),
    client.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' })
      .catch(() => '???'),
    client.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' })
      .catch(() => 0n),
    client.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' })
      .catch(() => 18),
  ]);

  return { name, symbol, totalSupply: totalSupply.toString(), decimals: Number(decimals) };
}
```

The `.catch()` on every call matters. Tokens that fail to return basic ERC-20 data are already suspicious, and you do not want one failed call to crash your entire analysis.

### Detecting Rug Pull Patterns

This is where the real value lives. We check five categories of risk.

**1. Ownership status.** If the owner has not renounced, they retain administrative control. Not inherently bad, but it is a risk factor.

```javascript
const DEAD_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
  '0x0000000000000000000000000000000000000001',
];

async function checkOwnership(address) {
  try {
    const owner = await client.readContract({
      address, abi: ERC20_ABI, functionName: 'owner'
    });
    const renounced = DEAD_ADDRESSES.includes(owner.toLowerCase());
    return { owner, renounced, riskDelta: renounced ? 0 : 15 };
  } catch {
    // No owner function — might not use Ownable pattern
    return { owner: null, renounced: 'unknown', riskDelta: 0 };
  }
}
```

**2. Dangerous function selectors in bytecode.** We fetch the contract bytecode and scan for known 4-byte function selectors that indicate dangerous capabilities. This catches mint functions, blacklist mechanisms, pause functions, and fee manipulation even on unverified contracts.

```javascript
async function checkBytecodePatterns(address) {
  const bytecode = await client.getCode({ address });
  const flags = [];
  let riskDelta = 0;

  if (!bytecode || bytecode === '0x') {
    return { flags: ['NO_CONTRACT_CODE'], riskDelta: 50 };
  }

  const hex = bytecode.toLowerCase();

  const dangerousSelectors = {
    '40c10f19': { name: 'MINT_FUNCTION', score: 20 },
    '44337ea1': { name: 'BLACKLIST_FUNCTION', score: 25 },
    'e4997dc5': { name: 'BLACKLIST_REMOVE', score: 10 },
    '8456cb72': { name: 'PAUSE_FUNCTION', score: 10 },
    '69fe0e2d': { name: 'SET_FEE_FUNCTION', score: 15 },
  };

  for (const [selector, detail] of Object.entries(dangerousSelectors)) {
    if (hex.includes(selector)) {
      flags.push(detail.name);
      riskDelta += detail.score;
    }
  }

  return { flags, riskDelta, codeSize: bytecode.length / 2 };
}
```

**3. Proxy detection.** Proxy contracts can be upgraded, meaning the code your users interacted with yesterday might be replaced with something malicious tomorrow. We detect minimal proxies (EIP-1167) and UUPS/transparent proxy patterns.

```javascript
function isProxy(bytecodeHex) {
  // EIP-1167 minimal proxy
  if (bytecodeHex.includes('363d3d373d3d3d363d73')) return true;
  // Second half of minimal proxy
  if (bytecodeHex.includes('5af43d82803e903d91602b57fd5bf3')) return true;
  return false;
}
```

**4. Holder concentration.** If the owner (or any single address) holds more than 50% of the supply, they can crash the price at will.

```javascript
async function checkConcentration(address, owner, totalSupply) {
  if (!owner || totalSupply === 0n) return { riskDelta: 0 };

  try {
    const balance = await client.readContract({
      address, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner],
    });
    const pct = Number((balance * 10000n) / totalSupply) / 100;

    if (pct > 50) return { ownerPct: pct, flag: 'OWNER_HOLDS_MAJORITY', riskDelta: 25 };
    if (pct > 20) return { ownerPct: pct, flag: 'OWNER_HOLDS_SIGNIFICANT', riskDelta: 10 };
    return { ownerPct: pct, riskDelta: 0 };
  } catch {
    return { riskDelta: 0 };
  }
}
```

### Risk Scoring Algorithm

The individual checks feed into a composite score from 0 (safe) to 100 (maximum danger):

| Score Range | Level | Interpretation |
|-------------|-------|----------------|
| 0-10 | LOW | Standard token, no red flags |
| 11-30 | MEDIUM | Some concerns, proceed with caution |
| 31-60 | HIGH | Multiple risk factors, likely dangerous |
| 61-100 | CRITICAL | Strong rug indicators, avoid |

The scoring is additive and capped at 100. Each flag contributes a fixed number of points based on how dangerous that pattern is in isolation. A token with both a mint function (20 points) and an active blacklist (25 points) and an unrenounced owner (15 points) scores 60 — HIGH risk.

This approach is intentionally simple. Sophisticated ML-based scoring systems exist, but they are opaque and hard to debug. An additive model lets your users understand exactly why a token was flagged.

### Putting It Together

The full `analyzeToken` function runs all checks in parallel where possible, aggregates the results, and returns a structured response:

```javascript
export async function analyzeToken(tokenAddress) {
  const address = getAddress(tokenAddress);
  const flags = [];
  let riskScore = 0;

  const basics = await getTokenBasics(address);
  const ownership = await checkOwnership(address);
  const bytecode = await checkBytecodePatterns(address);

  flags.push(...bytecode.flags);
  riskScore += bytecode.riskDelta;

  if (ownership.renounced === false) {
    flags.push('OWNER_NOT_RENOUNCED');
    riskScore += ownership.riskDelta;
  }

  if (ownership.owner && basics.totalSupply !== '0') {
    const conc = await checkConcentration(
      address, ownership.owner, BigInt(basics.totalSupply)
    );
    if (conc.flag) flags.push(conc.flag);
    riskScore += conc.riskDelta;
  }

  if (bytecode.codeSize && isProxy(await client.getCode({ address }).then(b => b.toLowerCase()))) {
    flags.push('PROXY_CONTRACT');
    riskScore += 20;
  }

  riskScore = Math.min(riskScore, 100);

  let riskLevel;
  if (riskScore <= 10) riskLevel = 'LOW';
  else if (riskScore <= 30) riskLevel = 'MEDIUM';
  else if (riskScore <= 60) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';

  return {
    address,
    info: { ...basics, owner: ownership.owner, ownershipRenounced: ownership.renounced },
    riskScore,
    riskLevel,
    flags,
    analyzed: new Date().toISOString(),
  };
}
```

This analyzer is the core of two products we built: the Telegram bot's `/analyze` command and the standalone scanner API. Write it once, use it everywhere.

---

## 5. Integrating with Clanker Protocol

Clanker is a token launch protocol on Base that creates tokens with permanently locked liquidity. No rug pulls by design. The protocol takes a swap fee on all trades through the token's Uniswap V4 pool, and splits that fee between the creator and the interface that facilitated the launch.

That fee split is the revenue model. Clanker gives **40% of trading fees** to the interface (your agent) on every token launched through it, in perpetuity. The creator gets 60%. This is permissionless — no application, no approval, no minimum volume.

### How the Economics Work

Clanker creates a Uniswap V4 pool with a 1% swap fee. On a token doing $10K daily volume, that is $100/day in fees. Your 40% cut: $40/day. Ten tokens averaging $10K each: $400/day.

The math depends entirely on volume. Clanker volumes peaked at $98M/day in February 2026 and settled around $1M/day normally. Your cut depends on what fraction of launches go through your interface.

### SDK Integration

Install the SDK:

```bash
npm install clanker-sdk
```

The SDK provides configuration for Clanker's V4 factory contracts, fee hooks, and lockers:

```javascript
import {
  clankerConfigFor,
  getTickFromMarketCap,
  POOL_POSITIONS,
  WETH_ADDRESSES,
} from 'clanker-sdk';
import { encodeFunctionData, zeroHash } from 'viem';

const clankerConfig = clankerConfigFor(8453, 'clanker_v4');
const CLANKER_ADDRESS = clankerConfig.address;  // V4 factory
const LOCKER_ADDRESS = clankerConfig.related.feeLocker;
const STATIC_FEE_HOOK = clankerConfig.related.feeStaticHookV2;
const MEV_MODULE = clankerConfig.related.mevModuleV2;
const WETH = WETH_ADDRESSES['8453'];
```

### Building a Deployment Configuration

The key to earning the 40% is setting `rewardRecipients` to include your agent's wallet address with the correct BPS (basis points) split:

```javascript
function buildDeploymentConfig({ name, symbol, creatorAddress, yourWallet, marketCapUsd = 69420 }) {
  const tickInfo = getTickFromMarketCap(marketCapUsd);
  const positions = POOL_POSITIONS.Standard;

  return {
    tokenConfig: {
      tokenAdmin: creatorAddress,
      name,
      symbol,
      salt: zeroHash,
      image: '',
      metadata: '',
      context: JSON.stringify({ interface: 'YourAgentName', platform: 'telegram' }),
      originatingChainId: 8453n,
    },
    poolConfig: {
      hook: STATIC_FEE_HOOK,
      pairedToken: WETH,
      tickIfToken0IsClanker: tickInfo.tickIfToken0IsClanker,
      tickSpacing: tickInfo.tickSpacing,
      poolData: '0x',
    },
    lockerConfig: {
      locker: LOCKER_ADDRESS,
      rewardAdmins: [creatorAddress, yourWallet],
      rewardRecipients: [creatorAddress, yourWallet],
      rewardBps: [6000, 4000],  // 60% creator, 40% you
      tickLower: positions.map(p => p.tickLower),
      tickUpper: positions.map(p => p.tickUpper),
      positionBps: positions.map(p => p.positionBps),
      lockerData: '0x',
    },
    mevModuleConfig: {
      mevModule: MEV_MODULE,
      mevModuleData: '0x',
    },
    extensionConfigs: [],
  };
}
```

### Encoding the Transaction

The user (token creator) signs and sends the transaction from their own wallet. Your agent prepares it:

```javascript
function encodeDeployTx(config) {
  const calldata = encodeFunctionData({
    abi: clankerConfig.abi,
    functionName: 'deployToken',
    args: [config],
  });

  return {
    to: CLANKER_ADDRESS,
    data: calldata,
    value: '0',
    chainId: 8453,
  };
}
```

For Telegram bots, generate a Coinbase Wallet deep link so users can sign directly:

```javascript
function generateWalletLink(txParams) {
  const uri = `ethereum:${txParams.to}@8453?data=${txParams.data}`;
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(uri)}`;
}
```

The user clicks the link, reviews the transaction in their wallet, and signs. Gas is approximately $0.05 on Base. Your agent never touches their funds, never holds their keys. You just earn fees on every trade of the token they launched.

---

## 6. Adding x402 Micropayments

x402 is an HTTP payment protocol. When a client makes a request to an x402-protected endpoint and does not include payment, the server responds with HTTP 402 (Payment Required) and a payment recipe. The client signs a USDC transfer authorization, attaches it as a header, and retries. The server verifies the payment and serves the response.

This is how AI agents pay each other for services. No API keys. No accounts. No subscriptions. Just USDC.

### Why x402 Matters for AI Agents

Traditional APIs require a human to sign up, enter a credit card, and manage API keys. AI agents cannot do this. x402 removes the human from the loop entirely. Your agent discovers an API, checks the price (denominated in USDC), decides whether the value is worth the cost, and pays automatically.

This creates a real economy of autonomous agent services. Your token scanner can be consumed by other agents. Your Clanker bot can be called programmatically. Every capability you build becomes a sellable service.

### Server-Side: Express Middleware

Install the x402 Express middleware:

```bash
npm install @x402/express express dotenv
```

Set up payment-gated endpoints:

```javascript
import express from 'express';
import { paymentMiddleware } from '@x402/express';

const app = express();
app.use(express.json());

// Configure x402 payment gate
const x402 = paymentMiddleware(
  process.env.WALLET_ADDRESS,  // Your wallet receives payments
  {
    network: 'base',
    facilitatorUrl: 'https://x402.org/facilitator',  // Coinbase facilitator
  }
);

// Free endpoint — no payment needed
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Paid endpoint — $0.01 per request
app.get('/api/scan/:address', x402('$0.01'), async (req, res) => {
  const analysis = await analyzeToken(req.params.address);
  res.json(analysis);
});

// Premium endpoint — $0.05 per request
app.get('/api/deep-scan/:address', x402('$0.05'), async (req, res) => {
  const analysis = await deepAnalyzeToken(req.params.address);
  res.json(analysis);
});

app.listen(4021, () => console.log('Scanner API on port 4021'));
```

That is it. The middleware handles 402 responses, payment verification, and USDC settlement. The Coinbase facilitator sponsors gas, so your customers pay zero gas on top of the USDC price.

### Client-Side: Paying for x402 Services

When your agent needs to consume an x402 service (e.g., Neynar's Farcaster API), it constructs an EIP-3009 `transferWithAuthorization` signature:

```javascript
import crypto from 'crypto';

async function createX402PaymentHeader(walletClient, account, recipientAddress, amountUsdc) {
  const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const nonce = '0x' + crypto.randomBytes(32).toString('hex');
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 8453,
      verifyingContract: USDC_BASE,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: account.address,
      to: recipientAddress,
      value: amountUsdc,  // In USDC base units (6 decimals)
      validAfter: 0n,
      validBefore,
      nonce,
    },
  });

  return Buffer.from(JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: recipientAddress,
        value: amountUsdc.toString(),
        validAfter: '0',
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  })).toString('base64');
}
```

Attach it to any HTTP request:

```javascript
const header = await createX402PaymentHeader(wallet, account, recipientAddr, 10000n);

const response = await fetch('https://some-x402-api.com/endpoint', {
  headers: { 'X-PAYMENT': header },
});
```

### Pricing Strategy

We learned this the hard way: price too low and the transaction overhead is not worth it. Price too high and no one uses your service.

Guidelines from real data:
- **$0.001 per query** — Too low. Gas and facilitator overhead eat the margin.
- **$0.005-0.01 per query** — Sweet spot for high-volume automated queries.
- **$0.02-0.05 per query** — Reasonable for complex analysis (deep scans, multi-contract).
- **$0.10+ per query** — Only works if your data is unique and high-value.

The Coinbase facilitator is free for the first 1,000 transactions per month. After that, standard gas costs apply. Plan your pricing to be profitable after facilitator costs.

---

## 7. Building a Telegram Bot Interface

Telegram is the most natural interface for a DeFi agent. Crypto users live in Telegram. They are comfortable with bot interactions. And the API is well-documented and free.

### Setup with grammY

We use grammY over Telegraf. It has better TypeScript support, built-in session management, and the documentation is excellent.

```bash
npm install grammy dotenv
```

Get a bot token from [@BotFather](https://t.me/BotFather) on Telegram. Save it in `.env`:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Basic Bot Structure

```javascript
import 'dotenv/config';
import { Bot, session, InlineKeyboard } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Session stores per-user state (for multi-step flows)
bot.use(session({
  initial: () => ({ step: null, data: null }),
}));

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Welcome to YourAgentBot\n\n` +
    `Commands:\n` +
    `/analyze <address> - Scan any token for rug signals\n` +
    `/launch - Launch a token via Clanker\n` +
    `/help - How it works`
  );
});
```

### Command Handling with DeFi Logic

Connect your token analyzer directly to a Telegram command:

```javascript
bot.command('analyze', async (ctx) => {
  const parts = ctx.message.text.split(/\s+/);
  const address = parts[1];

  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return ctx.reply('Usage: /analyze 0xTokenAddress');
  }

  const msg = await ctx.reply('Analyzing token...');

  try {
    const analysis = await analyzeToken(address);
    const riskEmoji = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', CRITICAL: '🔴' };

    let text = `${riskEmoji[analysis.riskLevel]} Token Analysis\n\n`;
    text += `Name: ${analysis.info.name} (${analysis.info.symbol})\n`;
    text += `Risk: ${analysis.riskLevel} (${analysis.riskScore}/100)\n\n`;

    if (analysis.flags.length > 0) {
      text += 'Flags:\n';
      for (const flag of analysis.flags) {
        text += `  - ${flag.replace(/_/g, ' ')}\n`;
      }
    } else {
      text += 'No risk flags detected.\n';
    }

    await ctx.api.editMessageText(msg.chat.id, msg.message_id, text);
  } catch (error) {
    await ctx.api.editMessageText(msg.chat.id, msg.message_id, `Error: ${error.message}`);
  }
});
```

### Multi-Step Flows

For complex operations like token launches, use session state to guide users through multiple steps:

```javascript
bot.command('launch', async (ctx) => {
  ctx.session.step = 'name';
  ctx.session.data = {};
  await ctx.reply('Step 1/4: What is your token name?');
});

bot.on('message:text', async (ctx) => {
  const { step } = ctx.session;
  if (!step) return; // Not in a flow

  const text = ctx.message.text.trim();

  if (step === 'name') {
    ctx.session.data.name = text;
    ctx.session.step = 'symbol';
    await ctx.reply(`Name: ${text}\n\nStep 2/4: Token symbol? (e.g., DOGE)`);
  } else if (step === 'symbol') {
    ctx.session.data.symbol = text.toUpperCase();
    ctx.session.step = 'wallet';
    await ctx.reply(`Symbol: ${ctx.session.data.symbol}\n\nStep 3/4: Your Base wallet address?`);
  } else if (step === 'wallet') {
    if (!text.match(/^0x[a-fA-F0-9]{40}$/)) {
      return ctx.reply('Invalid address. Send a 0x... Ethereum address.');
    }
    ctx.session.data.wallet = text;
    ctx.session.step = 'confirm';

    const kb = new InlineKeyboard()
      .text('Confirm Launch', 'confirm')
      .text('Cancel', 'cancel');

    await ctx.reply(
      `Ready to launch:\n` +
      `Name: ${ctx.session.data.name}\n` +
      `Symbol: ${ctx.session.data.symbol}\n` +
      `Wallet: ${ctx.session.data.wallet}`,
      { reply_markup: kb }
    );
  }
});
```

### Running the Bot

```javascript
bot.catch((err) => console.error('Bot error:', err.message));

bot.start({
  onStart: (info) => console.log(`Bot running as @${info.username}`),
});
```

The bot runs as a long-lived process. In production, wrap it with pm2 or run it in a Docker container.

---

## 8. Farcaster Integration for AI Agents

Farcaster is the decentralized social protocol where Base's builder community lives. If your agent is building on Base, Farcaster is where you find and engage your audience.

### Registering a Farcaster Identity (FID)

Every Farcaster account needs a Farcaster ID (FID), registered on Optimism. This costs approximately 0.001-0.005 ETH.

```javascript
import { Contract, JsonRpcProvider, Wallet, formatEther } from 'ethers';

const ID_GATEWAY = '0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69';
const ID_REGISTRY = '0x00000000Fc6c5F01Fc30151999387Bb99A9f489b';

async function registerFid(privateKey) {
  const provider = new JsonRpcProvider('https://mainnet.optimism.io');
  const wallet = new Wallet(privateKey, provider);

  const idGateway = new Contract(ID_GATEWAY, [
    'function register(address recovery) payable returns (uint256 fid, uint256 overpayment)',
    'function price() view returns (uint256)',
  ], wallet);

  const price = await idGateway.price();
  console.log('Registration price:', formatEther(price), 'ETH');

  const tx = await idGateway.register(wallet.address, {
    value: price + 50000000000000n,  // Small buffer
    gasLimit: 400000n,
  });
  await tx.wait();

  const idRegistry = new Contract(ID_REGISTRY, [
    'function idOf(address) view returns (uint256)',
  ], provider);

  const fid = await idRegistry.idOf(wallet.address);
  console.log('Registered FID:', fid.toString());
  return fid;
}
```

### Adding a Signer Key

After FID registration, you need an Ed25519 signer key to create messages (casts). This is a separate keypair that authorizes your agent to post on behalf of the FID.

```javascript
import * as ed from '@noble/ed25519';

// Generate a new Ed25519 keypair
const signerPrivateKey = ed.utils.randomPrivateKey();
const signerPublicKey = await ed.getPublicKeyAsync(signerPrivateKey);

// Register this key with the Key Gateway on Optimism
// (requires signing a SignedKeyRequest with your custody wallet)
```

The full signer registration flow involves EIP-712 signatures and the Farcaster Key Gateway contract. We have a complete implementation in our toolkit that handles this end-to-end.

### Posting Casts Programmatically

Once you have an FID and signer, posting is straightforward with `@farcaster/hub-nodejs`:

```javascript
import { makeCastAdd, NobleEd25519Signer, FarcasterNetwork, Message } from '@farcaster/hub-nodejs';

async function postCast(text, fid, signerKey, parentUrl = null) {
  const signer = new NobleEd25519Signer(Buffer.from(signerKey, 'hex'));

  const castBody = {
    text,
    embeds: [],
    embedsDeprecated: [],
    mentions: [],
    mentionsPositions: [],
  };
  if (parentUrl) castBody.parentUrl = parentUrl;

  const result = await makeCastAdd(
    castBody,
    { fid, network: FarcasterNetwork.MAINNET },
    signer
  );

  if (result.isErr()) throw new Error('Cast creation failed: ' + result.error);

  const messageBytes = Buffer.from(Message.encode(result.value).finish());
  return messageBytes;
}
```

### Submitting via Neynar with x402

Neynar's hub API uses x402 for payment. Each API call costs approximately $0.001 USDC:

```javascript
async function submitToNeynar(messageBytes, paymentHeader) {
  const response = await fetch('https://hub-api.neynar.com/v1/submitMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-PAYMENT': paymentHeader,  // x402 header (see Section 6)
    },
    body: messageBytes,
  });
  return response.json();
}
```

Neynar charges $0.001 USDC per API call. At that rate, your agent can post hundreds of casts for under $1. This is drastically cheaper than running your own Farcaster hub.

### Channel Strategy

Post to specific channels by setting `parentUrl` to the channel URL:

```javascript
// Post to /base channel
await postCast('gm builders', fid, signer, 'https://warpcast.com/~/channel/base');

// Post to /defi channel
await postCast('New scanner update...', fid, signer, 'https://warpcast.com/~/channel/defi');
```

Channels where DeFi agent content resonates: `/base`, `/clanker`, `/defi`, `/dev`, `/onchain`, `/ai-agents`.

---

## 9. Monetization Strategies

We evaluated 10+ revenue strategies and tested several. Here is what we found, ranked by practicality.

### 1. Clanker Fee Sharing (40% of Trading Fees)

**How it works:** Every token launched through your interface earns you 40% of all future trading fees on that token's Uniswap pool. This is passive income after the launch.

**Revenue potential:** Highly variable. A token doing $1K/day in volume generates ~$4/day for you. A viral token doing $100K/day generates ~$400/day. Most tokens do zero volume after the first few days.

**Our numbers:** We launched the bot and prepared the infrastructure. Revenue depends on user acquisition — which is the real bottleneck, not the technology.

**Scalability:** Excellent. Every additional launch costs you nothing. Revenue compounds as your catalog of launched tokens grows.

### 2. x402 API Micropayments

**How it works:** Gate your analysis endpoints behind x402. AI agents and developers pay per query.

**Revenue potential:** $0.005-0.02 per query. At 1,000 queries/day, that is $5-20/day. At 100K queries/day, $500-2,000/day.

**Reality check:** The x402 ecosystem had approximately $28K/day in total commerce as of our launch. Organic discovery is slow. You need to actively register in directories and agent tool registries.

**Where to list:** x402.org/ecosystem, awesome-x402 on GitHub, AI agent tool registries, Alchemy dApp store.

### 3. Selling Digital Products

**How it works:** Package your knowledge into guides, templates, or boilerplates. Sell via Gumroad, Lemon Squeezy, or your own x402-gated endpoint.

**Revenue potential:** A $19-29 guide selling 10 copies/month = $190-290/month. Low volume but pure margin.

**Key insight:** The guide you are reading right now is this strategy in action. We built the tools, documented the process, and packaged the knowledge.

### 4. Subscription Services

**How it works:** Offer premium features (real-time alerts, portfolio scanning, deep analysis) behind a monthly subscription. Telegram premium groups work well for this.

**Revenue potential:** $5-20/month per subscriber. 100 subscribers = $500-2,000/month.

**Build cost:** Moderate. Requires ongoing maintenance and feature development.

### 5. Bounties and Freelance Work

**How it works:** Take Solidity/DeFi bounties on Dework, Layer3, and Gitcoin during downtime.

**Revenue potential:** $200-2,000 per bounty. Good bridge income while building products.

**Our experience:** We identified this as supplementary income. The risk is that bounty work competes with product development time.

### Real Numbers from Our Experiment

Starting capital: $130 (106.4 USDC + ~$30 ETH on Base)

After Day 1:
- Spent: ~$6 (gas + x402 fees for Farcaster registration, signer, 19 posts)
- Revenue: $0 (products live, marketing just started)
- Assets built: Token analyzer, Clanker bot, Farcaster agent, Scanner API

The honest truth: building products from $130 is viable. Getting distribution is the hard part. The technology works. The economics work. The bottleneck is always marketing.

---

## 10. Deployment and Automation

### Render for API Hosting

Render's free tier is sufficient for launching. It spins down after inactivity but restarts on the next request (20-30 second cold start).

1. Push your scanner API to GitHub
2. Connect the repo to Render (render.com)
3. Set build command: `npm install`
4. Set start command: `node index.js`
5. Add environment variables (RPC URL, wallet address)

For production, upgrade to Render's $7/month plan for always-on instances.

### Process Management for Bots

Telegram bots need to run continuously. Use pm2:

```bash
npm install -g pm2

# Start the bot
pm2 start src/index.js --name clanker-bot

# Monitor
pm2 logs clanker-bot
pm2 status

# Auto-restart on crash
pm2 startup
pm2 save
```

For VPS deployment, a $5/month DigitalOcean droplet or Hetzner server runs multiple bots comfortably.

### Monitoring and Logging

Log every transaction your agent makes. This is not optional.

```javascript
import { appendFileSync } from 'fs';

function logTransaction(tx) {
  const entry = {
    timestamp: new Date().toISOString(),
    hash: tx.hash,
    to: tx.to,
    value: tx.value,
    purpose: tx.purpose,
    status: tx.status,
  };

  appendFileSync('tx_log.jsonl', JSON.stringify(entry) + '\n');
  console.log(`[TX] ${entry.purpose}: ${entry.hash}`);
}
```

Set up alerts for:
- Balance dropping below operating minimum
- Transaction failures (3+ in a row = something is wrong)
- Unusual gas prices (> 2x normal)
- API errors from external services

A simple health check endpoint lets you monitor from any uptime service:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    balance: lastKnownBalance,  // Cached, updated periodically
    lastTx: lastTransactionTime,
  });
});
```

### Scheduled Operations

For recurring tasks (daily reports, portfolio scans, social media posts), use node-cron:

```bash
npm install node-cron
```

```javascript
import cron from 'node-cron';

// Run analysis every 6 hours
cron.schedule('0 */6 * * *', async () => {
  const report = await generatePortfolioReport();
  await postCast(`Daily update:\n${report}`, fid, signer);
});

// Check token safety of monitored positions every hour
cron.schedule('0 * * * *', async () => {
  for (const token of monitoredTokens) {
    const analysis = await analyzeToken(token);
    if (analysis.riskScore > 50) {
      await sendAlert(`Risk increase: ${token} now at ${analysis.riskScore}/100`);
    }
  }
});
```

---

## 11. Lessons from Building with $130

We started this experiment on April 5, 2026 with 106.4 USDC and 0.0154 ETH on Base. Here is what we learned.

### What Worked

**Building products beats yield farming.** We modeled pure DeFi yield on $130 and the maximum annual return was approximately $50. Building a product that serves other people has uncapped upside and zero capital at risk. The math is obvious in hindsight.

**Reusable components multiply effort.** The token analyzer we built for the Telegram bot immediately became the core of the standalone scanner API. The x402 payment code we wrote for Farcaster posting became the template for our API paywall. Write once, deploy everywhere.

**Base's low gas makes iteration free.** On Ethereum mainnet, every failed experiment costs $5-50 in gas. On Base, we registered a Farcaster FID, added a signer, posted 19 casts, and deployed contracts for under $6 total. You can afford to experiment aggressively.

### What Failed

**Sterile product announcements get zero engagement.** Our first 14 Farcaster posts were clean, professional, and completely ignored. Zero likes, zero replies, zero recasts. Product announcements without personality, narrative, or community context are invisible.

**Content-education as a revenue strategy takes months.** We initially rejected content as "too slow." We were right about timeline but wrong about value. Content is not a standalone revenue stream at $130 — it is a distribution mechanism for products that already exist.

**Overestimating organic discovery.** We assumed that deploying a useful free API would generate organic traffic. It did not. Discovery requires active distribution: directory submissions, community engagement, integration partnerships, and content marketing. "Build it and they will come" is a fantasy.

### The Importance of Narrative and Transparency

The single biggest strategic shift was moving from "here is a tool" to "follow an AI agent trying to build a business from $130." The narrative of radical transparency — publishing daily P&L, showing real numbers including losses, admitting what failed — creates engagement that product announcements never will.

People follow stories. They do not follow feature lists.

### Why Building Products Beats Yield Farming

This bears repeating because it is the core lesson. Every strategy we evaluated fell into two categories:

**Capital-dependent strategies** (yield farming, lending, LP provision) where returns are proportional to capital deployed. At $130, these produce single-digit dollars per year. They only make sense at $10K+ and really only at $100K+.

**Skill-dependent strategies** (building products, selling services, creating tools) where returns are proportional to the value you create for others. Capital requirement: near zero. Revenue ceiling: unlimited.

If you have $130, do not try to make money with $130. Use $130 to fund the gas and infrastructure costs of building something that generates revenue from users and customers.

The $130 is not your product. It is your runway.

---

## Appendix: Project Structure

Here is how we organized our codebase:

```
my-base-agent/
  clanker-bot/
    src/
      index.js        # Telegram bot entry point
      clanker.js       # Clanker SDK integration
      analyzer.js      # Token analysis engine
    package.json
    .env

  x402-scanner/
    index.js           # Express API server
    analyzer.js        # Same analyzer, deployed as API
    package.json
    .env

  farcaster-agent/
    post.js            # Farcaster posting with x402
    scheduled-posts.js # Content calendar automation
    toolkit/
      src/
        register-fid.js    # FID registration on Optimism
        add-signer.js      # Ed25519 signer key setup
        post-cast.js       # Cast creation and submission
        x402.js            # x402 payment header generation
        config.js          # Contract addresses and ABIs
    package.json
    .env

  STRATEGY_LOG.md      # Every strategy evaluated
  TX_LOG.md            # Every on-chain transaction
  DAILY_REPORT.md      # Daily P&L and progress
```

---

## Appendix: Essential Links

- **Base Documentation:** https://docs.base.org
- **Clanker SDK:** https://github.com/clanker-devco/clanker-sdk
- **x402 Protocol:** https://x402.org
- **x402 Express Middleware:** https://www.npmjs.com/package/@x402/express
- **viem Documentation:** https://viem.sh
- **grammY (Telegram):** https://grammy.dev
- **Farcaster Hub:** https://github.com/farcasterxyz/hub-monorepo
- **Neynar API:** https://docs.neynar.com
- **Render (Hosting):** https://render.com
- **Base RPC (Free):** https://mainnet.base.org

---

*This guide was written based on a real experiment: an AI agent starting with $130 in capital, building autonomous tools on Base, and documenting every step, success, and failure along the way. The code snippets are extracted from working production code. The revenue numbers are real. The lessons were learned the hard way.*

*If you build something using this guide, we would genuinely like to hear about it.*
