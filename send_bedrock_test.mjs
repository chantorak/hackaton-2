#!/usr/bin/env node
// Simplified Bedrock runtime invoker that prints plain text output.
// Uses dynamic import so DRY_RUN can run without the SDK installed.

const DRY_RUN = !!process.env.DRY_RUN;
const REGION = process.env.AWS_REGION || "eu-west-2";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "meta.llama3-70b-instruct-v1:0";

const prompt = `
[INST]You are a very intelligent bot with exceptional critical thinking[/INST]
I went to the market and bought 10 apples.
I gave 2 apples to your friend and 2 to the helper.
I then went and bought 5 more apples and ate 1.
How many apples did I remain with?
Let's think step by step
`;

const input = {
  modelId: MODEL_ID,
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    prompt,
    max_gen_len: 512,
    temperature: 0.5,
    top_p: 0.9,
  }),
};

if (DRY_RUN) {
  console.log("DRY_RUN enabled. Would send the following to Bedrock Runtime:");
  console.log(JSON.stringify(input, null, 2));
  process.exit(0);
}

// Only import the SDK when we actually need to call AWS.
const { BedrockRuntimeClient, InvokeModelCommand } = await import("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: REGION });
const command = new InvokeModelCommand(input);

const response = await client.send(command);

// response.body may be a Uint8Array, a stream adapter, or other shape.
let raw = response.body;
let text = "";

if (raw == null) {
  text = "";
} else if (typeof raw === "string") {
  text = raw;
} else if (raw instanceof Uint8Array) {
  text = new TextDecoder().decode(raw);
} else if (typeof raw.transformToString === "function") {
  text = await raw.transformToString();
} else if (typeof raw.toString === "function") {
  text = raw.toString();
} else {
  try {
    text = JSON.stringify(raw);
  } catch (_) {
    text = String(raw);
  }
}

// Try to parse JSON and extract common fields that contain the generated text.
let plain = text;
try {
  const parsed = JSON.parse(text);
  if (parsed.generation) plain = parsed.generation;
  else if (parsed.completion) plain = parsed.completion;
  else if (parsed.output) plain = typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output);
  else if (parsed.choices && parsed.choices.length > 0) {
    plain = parsed.choices.map(c => c.text || c.message?.content || JSON.stringify(c)).join("\n");
  } else {
    plain = text;
  }
} catch (_) {
  // not JSON; leave plain as raw text
}

// Print plain text only
console.log(plain);