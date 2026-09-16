import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api.js";

test("production API contract remains a single code response", async () => {
  let callCount = 0;
  const env = {
    AI: {
      async run() {
        callCount += 1;
        return { response: "ABC123" };
      }
    }
  };
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: "/9j/",
      mimeType: "image/jpeg"
    })
  });

  const originalInfo = console.info;
  console.info = () => {};
  let response;
  try {
    response = await onRequest({ request, env });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(callCount, 1);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["code", "requestId"]);
  assert.equal(body.code, "ABC123");
  assert.match(body.requestId, /^req-|^[0-9a-f-]{36}$/i);
  assert.equal("codes" in body, false);
});
