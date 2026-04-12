import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeToken } from './analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4021;

const app = express();
app.use(express.json());

// Serve static files (pfp, etc)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
});

// Services page
app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'services.html'));
});

// Guide landing page
app.get('/guide', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'guide.html'));
});

// Guide download (free during launch to build traction)
app.get('/api/guide/download', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'guide-content.md'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
});

// Info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Base Token Safety Scanner',
    version: '1.0.0',
    description: 'Analyze Base tokens for rug signals, honeypots, and risk scoring.',
    pricing: 'FREE during launch period (x402 micropayments coming soon)',
    endpoints: {
      scan: 'GET /api/scan/:tokenAddress',
      health: 'GET /health',
    },
    by: '@clankerlaunchbot on Farcaster | @ClankerBaseBot on Telegram',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Full scan - free during launch
app.get('/api/scan/:address', async (req, res) => {
  const { address } = req.params;

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Invalid address format. Use 0x... format.' });
  }

  try {
    const analysis = await analyzeToken(address);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Token Safety Scanner running on port ${PORT}`);
  console.log(`Scan: http://localhost:${PORT}/api/scan/<address>`);
});
