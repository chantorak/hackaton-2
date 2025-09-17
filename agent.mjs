import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load instructions from file if provided. Default file is ./agent_instructions.txt
const instrFile = process.env.AGENT_INSTRUCTIONS_FILE || path.resolve(process.cwd(), 'agent_instructions.txt');
let fileInstructions = null;
try {
  if (fs.existsSync(instrFile)) {
    fileInstructions = fs.readFileSync(instrFile, { encoding: 'utf8' }).trim();
    console.log(`Loaded agent instructions from ${instrFile}`);
  }
} catch (e) {
  console.warn('Could not load agent instructions file:', e.message);
}

// You could also load these instructions from a DB
export const agentConfig = {
  name: 'ChatAgent',
  instructions: fileInstructions || 'You are caring financial educator, always do a some chatting then come up with a multi choice question for what to discuss next related to financial knowledge, all you answers are in JSON format {answer: "", "question": {"question": "", "choices": []}}',
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
};

// Create an agent. If the official @openai/agents package is available use it,
// otherwise fall back to a lightweight in-process shim that implements a
// simple run(msg, sessionId) method and keeps per-session context in memory.
export async function createAgent() {
  // Try to load the official agents package
  try {
    const mod = await import('@openai/agents');
    const RealAgent = mod.Agent || (mod.default && mod.default.Agent);
    if (RealAgent) {
      const real = new RealAgent(agentConfig);
      // If the real agent exposes a runnable method, wrap and return it.
      if (typeof real.run === 'function' || typeof real.call === 'function' || typeof real.invoke === 'function' || typeof real === 'function') {
        return {
          run: async (msg, sessionId) => {
            if (typeof real.run === 'function') return real.run(msg, { sessionId });
            if (typeof real.call === 'function') return real.call(msg, { sessionId });
            if (typeof real.invoke === 'function') return real.invoke(msg, { sessionId });
            if (typeof real === 'function') return real(msg, { sessionId });
            // defensive fallback - should not reach here
            throw new Error('Loaded agent does not expose an execution method');
          }
        };
      } else {
        // If the loaded agent doesn't expose a usable run method, warn and fall back to the shim.
        console.warn('Loaded @openai/agents but agent instance has no runnable method; falling back to local shim.');
      }
    }
  } catch (e) {
    // Ignore - fallback to shim
  }

  // Shim implementation
  const sessionStore = new Map();

  function getSession(sessionId) {
    if (!sessionId) sessionId = 'anon';
    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, [
        { role: 'system', content: agentConfig.instructions }
      ]);
    }
    return sessionStore.get(sessionId);
  }

  async function callOpenAI(messages) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not configured');
    const payload = { model: agentConfig.model, messages, max_tokens: 500 };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const txt = await r.text();
      const err = new Error(`OpenAI API error ${r.status}: ${txt}`);
      err.status = r.status; err.body = txt; throw err;
    }
    return r.json();
  }

  return {
    run: async (msg, sessionId) => {
      const messages = getSession(sessionId);
      const content = (typeof msg === 'string') ? msg : (typeof msg === 'object' ? Object.entries(msg).map(([k,v]) => `- ${k}: ${v}`).join('\n') : String(msg));
      messages.push({ role: 'user', content });
      const j = await callOpenAI(messages);
      const reply = j.choices?.[0]?.message?.content ?? '';
      messages.push({ role: 'assistant', content: reply });
      return { reply, raw: j };
    }
  };
}

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * @typedef {Object} ResponseBody
 * @property {string} completion
 */

/**
 * Invokes a Bedrock agent to run an inference using the input
 * provided in the request body.
 *
 * @param {string} prompt - The prompt that you want the Agent to complete.
 * @param {string} sessionId - An arbitrary identifier for the session.
 */
export const invokeBedrockAgent = async (prompt, sessionId) => {
  const client = new BedrockAgentRuntimeClient({ region: "eu-west-2" });
  // const client = new BedrockAgentRuntimeClient({
  //   region: "us-east-1",
  //   credentials: {
  //     accessKeyId: "accessKeyId", // permission to invoke agent
  //     secretAccessKey: "accessKeySecret",
  //   },
  // });

  const agentId = "LJ5G28BRXC";
  const agentAliasId = "TVIM2N5M7H";

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: prompt,
  });

  try {
    let completion = "";
    const response = await client.send(command);

    if (response.completion === undefined) {
      throw new Error("Completion is undefined");
    }

    for await (const chunkEvent of response.completion) {
      const chunk = chunkEvent.chunk;
      // console.log(chunk);
      const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
      completion += decodedResponse;
    }

    return { sessionId: sessionId, completion };
  } catch (err) {
    console.error(err);
  }
};

// const result = await invokeBedrockAgent("I need help about ISA.", "123sadasd");
// console.log(result.completion);
