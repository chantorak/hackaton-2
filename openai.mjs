import { createAgent } from './agent.mjs';

let agentSingleton = null;

async function getAgentInstance() {
  if (!agentSingleton) agentSingleton = await createAgent();
  return agentSingleton;
}

export function buildUserContent(msg) {
  if (typeof msg === 'string') return msg;
  if (typeof msg === 'object') {
    try {
      const pairs = Object.entries(msg).map(([k,v]) => `- ${k}: ${v}`);
      return `User provided the following answers:\n${pairs.join('\n')}\n\nPlease respond concisely and helpfully.`;
    } catch (e) {
      return JSON.stringify(msg);
    }
  }
  return String(msg || '');
}

export async function invokeOpenAIAgent(msg, sessionId) {
  const agent = await getAgentInstance();
  const content = buildUserContent(msg);
  const result = await agent.run(content, sessionId);
  return result;
}
