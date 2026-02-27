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

app.get('/download', async (req, res) => {
  const { uri, key } = req.query;
  if (!uri || !key) {
    return res.status(400).json({ error: 'Missing uri or key' });
  }
  try {
    const url = new URL(decodeURIComponent(uri));
    url.searchParams.set('key', key);
    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).type('json').send(text);
    }
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    const reader = response.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-proxy', region: 'US' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gemini proxy running on port ${PORT}`));
