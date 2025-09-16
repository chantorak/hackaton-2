import express from 'express';
import { invokeBedrockAgent } from './agent.mjs';
const app = express();
const port = 3000;

// Parse JSON bodies
app.use(express.json());

// Simple CORS middleware - allow requests from any origin for development.
// In production, narrow this to your app's origin and configure credentials as needed.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Handle preflight
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.post('/', async (req, res) => {
  try {
    // client sends JSON body { msg, sessionId }
    const { msg, sessionId: uuid } = req.body || {};

    const result = await invokeBedrockAgent(msg, uuid);

    // Respond with JSON containing the reply field expected by the frontend
    res.json({ reply: result?.completion ?? null });
  } catch (err) {
    console.error('Error in / handler:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
