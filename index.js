const express = require('express');
const app = express();

const PROXY_SECRET = 'LL_Gemini_Proxy_2024_SecretKey_xyz123';

// Увеличиваем лимит для больших запросов (история чата может быть большой)
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/', async (req, res) => {
  const proxyKey = req.headers['x-proxy-key'];
  if (proxyKey !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { endpoint, payload, apiKey } = req.body;
    if (!endpoint || !payload || !apiKey) {
      return res.status(400).json({ error: { message: 'Missing params' } });
    }

    const url = new URL(endpoint);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.text();
    res.status(response.status).type('json').send(data);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-proxy', region: 'US' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gemini proxy running on port ${PORT}`));
