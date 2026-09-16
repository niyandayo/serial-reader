import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api.js";

const VALID_IMAGE_PAYLOAD = {
  imageBase64: "/9j/",
  mimeType: "image/jpeg"
};

async function callApi(run) {
  let callCount = 0;
  const env = {
    AI: {
      async run(model, input) {
        callCount += 1;
        return run(model, input);
      }
    }
  };
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(VALID_IMAGE_PAYLOAD)
  });

  const originalInfo = console.info;
  const originalWarn = console.warn;
  console.info = () => {};
  console.warn = () => {};
  let response;
  try {
    response = await onRequest({ request, env });
  } finally {
    console.info = originalInfo;
    console.warn = originalWarn;
  }

  return { response, callCount };
}

async function expectInvalidOutput(aiResponse) {
  const { response, callCount } = await callApi(() => ({ response: aiResponse }));
  assert.equal(callCount, 1);
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.errorCode, "invalid_output");
  assert.equal(body.retryable, false);
  assert.equal("code" in body, false);
  assert.equal("codes" in body, false);
}

test("returns additive single-code API response for backward compatibility", async () => {
  let capturedModel;
  let capturedInput;
  const { response, callCount } = await callApi((model, input) => {
    capturedModel = model;
    capturedInput = input;
    return { response: '{"codes":["ABC123"]}' };
  });

  assert.equal(callCount, 1);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["code", "codes", "requestId"]);
  assert.equal(body.code, "ABC123");
  assert.deepEqual(body.codes, ["ABC123"]);
  assert.match(body.requestId, /^req-|^[0-9a-f-]{36}$/i);
  assert.equal(capturedModel, "@cf/meta/llama-3.2-11b-vision-instruct");
  assert.equal(capturedInput.max_tokens, 1536);
  assert.equal(capturedInput.temperature, 0);
  assert.match(capturedInput.messages[1].content, /最大10件/);
  assert.match(capturedInput.messages[1].content, /JSONオブジェクトのみ/);
});

test("returns multiple codes while keeping code as the first item", async () => {
  const codes = ["ABC123", "DEF456", "GHI789"];
  const { response, callCount } = await callApi(() => ({
    response: JSON.stringify({ codes })
  }));

  assert.equal(callCount, 1);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.code, "ABC123");
  assert.deepEqual(body.codes, codes);
  assert.equal("partial" in body, false);
  assert.equal("discardedCount" in body, false);
});

test("returns partial metadata with valid codes", async () => {
  const { response, callCount } = await callApi(() => ({
    response: '{"codes":["ABC123","INVALID SPACE"]}'
  }));

  assert.equal(callCount, 1);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.code, "ABC123");
  assert.deepEqual(body.codes, ["ABC123"]);
  assert.equal(body.partial, true);
  assert.equal(body.discardedCount, 1);
});

for (const [label, aiResponse] of [
  ["empty codes", '{"codes":[]}'],
  ["eleven codes", JSON.stringify({ codes: Array.from({ length: 11 }, (_, index) => `CODE${index + 1}`) })],
  ["malformed JSON", '{"codes":["ABC123"]'],
  ["Markdown fenced JSON", '```json\n{"codes":["ABC123"]}\n```'],
  ["an extra key", '{"codes":["ABC123"],"message":"success"}'],
  ["all invalid codes", '{"codes":["INVALID SPACE",null,123]}'],
  ["oversized output", "A".repeat((8 * 1024) + 1)]
]) {
  test(`maps ${label} to non-retryable invalid_output`, async () => {
    await expectInvalidOutput(aiResponse);
  });
}

test("preserves rate-limit retry classification", async () => {
  const { response, callCount } = await callApi(() => {
    const error = new Error("rate limited");
    error.code = 3040;
    throw error;
  });

  assert.equal(callCount, 1);
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.errorCode, "workers_ai_rate_limit");
  assert.equal(body.retryable, true);
});

test("preserves transient 5xx retry classification", async () => {
  const { response, callCount } = await callApi(() => {
    const error = new Error("temporary upstream failure");
    error.status = 503;
    throw error;
  });

  assert.equal(callCount, 1);
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.errorCode, "workers_ai_error");
  assert.equal(body.retryable, true);
});

test("preserves transient network retry classification", async () => {
  const { response, callCount } = await callApi(() => {
    const error = new Error("network failure");
    error.name = "NetworkError";
    throw error;
  });

  assert.equal(callCount, 1);
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.errorCode, "network_error");
  assert.equal(body.retryable, true);
});
