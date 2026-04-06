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

const DEAD_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
  '0x0000000000000000000000000000000000000001',
];

export async function analyzeToken(tokenAddress) {
  const address = getAddress(tokenAddress);
  const flags = [];
  const info = {};
  let riskScore = 0; // 0 = safe, 100 = max danger

  try {
    // Basic token info
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      client.readContract({ address, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
      client.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
      client.readContract({ address, abi: ERC20_ABI, functionName: 'totalSupply' }).catch(() => 0n),
      client.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
    ]);

    info.name = name;
    info.symbol = symbol;
    info.totalSupply = totalSupply.toString();
    info.decimals = Number(decimals);

    // Check ownership
    let owner = null;
    try {
      owner = await client.readContract({ address, abi: ERC20_ABI, functionName: 'owner' });
      info.owner = owner;
      if (owner && !DEAD_ADDRESSES.includes(owner.toLowerCase())) {
        flags.push('OWNER_NOT_RENOUNCED');
        riskScore += 15;
      } else {
        info.ownershipRenounced = true;
      }
    } catch {
      // No owner function — could be renounced or not Ownable
      info.ownershipRenounced = 'no_owner_function';
    }

    // Check contract bytecode for dangerous patterns
    const bytecode = await client.getCode({ address });
    if (!bytecode || bytecode === '0x') {
      flags.push('NO_CONTRACT_CODE');
      riskScore += 50;
    } else {
      info.hasCode = true;
      info.codeSize = bytecode.length / 2;

      // Check for common dangerous selectors in bytecode
      const dangerousSelectors = {
        // mint(address,uint256)
        '40c10f19': { name: 'MINT_FUNCTION', score: 20 },
        // blacklist/blocklist patterns
        '44337ea1': { name: 'BLACKLIST_FUNCTION', score: 25 },
        'e4997dc5': { name: 'BLACKLIST_REMOVE', score: 10 },
        // pause
        '8456cb72': { name: 'PAUSE_FUNCTION', score: 10 },
        // setFee / setTax patterns
        '69fe0e2d': { name: 'SET_FEE_FUNCTION', score: 15 },
      };

      const bytecodeHex = bytecode.toLowerCase();
      for (const [selector, detail] of Object.entries(dangerousSelectors)) {
        if (bytecodeHex.includes(selector)) {
          flags.push(detail.name);
          riskScore += detail.score;
        }
      }

      // Check if it's a proxy (delegatecall pattern)
      if (bytecodeHex.includes('363d3d373d3d3d363d73') || bytecodeHex.includes('5af43d82803e903d91602b57fd5bf3')) {
        flags.push('PROXY_CONTRACT');
        riskScore += 20;
      }
    }

    // Check top holder concentration
    // We check if deployer or owner holds too much supply
    if (owner && totalSupply > 0n) {
      try {
        const ownerBalance = await client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [owner],
        });
        const ownerPct = Number((ownerBalance * 10000n) / totalSupply) / 100;
        info.ownerHoldingPct = ownerPct;
        if (ownerPct > 50) {
          flags.push('OWNER_HOLDS_MAJORITY');
          riskScore += 25;
        } else if (ownerPct > 20) {
          flags.push('OWNER_HOLDS_SIGNIFICANT');
          riskScore += 10;
        }
      } catch {
        // Can't check balance
      }
    }

    // Cap risk score
    riskScore = Math.min(riskScore, 100);

    // Risk level
    let riskLevel;
    if (riskScore <= 10) riskLevel = 'LOW';
    else if (riskScore <= 30) riskLevel = 'MEDIUM';
    else if (riskScore <= 60) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    return {
      address,
      info,
      riskScore,
      riskLevel,
      flags,
      analyzed: new Date().toISOString(),
    };
  } catch (error) {
    return {
      address,
      error: error.message,
      riskScore: 100,
      riskLevel: 'UNKNOWN',
      flags: ['ANALYSIS_FAILED'],
      analyzed: new Date().toISOString(),
    };
  }
}

export function formatAnalysis(analysis) {
  const emoji = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴',
    UNKNOWN: '⚫',
  };

  let msg = `${emoji[analysis.riskLevel]} **Token Analysis**\n\n`;

  if (analysis.info) {
    msg += `**Name:** ${analysis.info.name} (${analysis.info.symbol})\n`;
    msg += `**Address:** \`${analysis.address}\`\n`;
    msg += `**Risk:** ${analysis.riskLevel} (${analysis.riskScore}/100)\n\n`;
  }

  if (analysis.flags.length > 0) {
    msg += `**Flags:**\n`;
    for (const flag of analysis.flags) {
      const label = flag.replace(/_/g, ' ');
      msg += `  ⚠️ ${label}\n`;
    }
  } else {
    msg += `✅ No risk flags detected\n`;
  }

  if (analysis.info?.ownershipRenounced === true) {
    msg += `✅ Ownership renounced\n`;
  }

  return msg;
}
