import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SERIAL_OUTPUT_LENGTH,
  parseMultipleSerialOutput
} from "../functions/lib/serial-output.js";

function expectValid(responseText, expectedCodes, expectedPartial = false, discardedCount = 0) {
  assert.deepEqual(parseMultipleSerialOutput(responseText), {
    ok: true,
    codes: expectedCodes,
    partial: expectedPartial,
    discardedCount
  });
}

function expectInvalid(responseText, reason) {
  assert.deepEqual(parseMultipleSerialOutput(responseText), { ok: false, reason });
}

test("accepts one serial code", () => {
  expectValid('{"codes":["ABC123"]}', ["ABC123"]);
});

test("accepts two serial codes", () => {
  expectValid('{"codes":["ABC123","DEF456"]}', ["ABC123", "DEF456"]);
});

test("accepts four serial codes in response order", () => {
  const codes = ["CODE1", "CODE2", "CODE3", "CODE4"];
  expectValid(JSON.stringify({ codes }), codes);
});

test("accepts the maximum ten serial codes", () => {
  const codes = Array.from({ length: 10 }, (_, index) => `CODE_${index + 1}`);
  expectValid(JSON.stringify({ codes }), codes);
});

test("accepts underscores and hyphens", () => {
  expectValid('{"codes":["ABC_123","DEF-456"]}', ["ABC_123", "DEF-456"]);
});

test("preserves upper and lower case", () => {
  expectValid('{"codes":["AbC123xYz"]}', ["AbC123xYz"]);
});

test("preserves duplicate serial codes", () => {
  expectValid('{"codes":["ABC123","ABC123"]}', ["ABC123", "ABC123"]);
});

test("returns partial output when one of three codes is invalid", () => {
  expectValid(
    '{"codes":["ABC123","INVALID SPACE","DEF456"]}',
    ["ABC123", "DEF456"],
    true,
    1
  );
});

for (const [label, invalidValue] of [
  ["empty string", ""],
  ["null", null],
  ["number", 123],
  ["object", { value: "DEF456" }],
  ["illegal characters", "<script>"],
  ["129 characters", "A".repeat(129)]
]) {
  test(`discards an invalid ${label} while preserving valid codes`, () => {
    expectValid(
      JSON.stringify({ codes: ["ABC123", invalidValue, "DEF456"] }),
      ["ABC123", "DEF456"],
      true,
      1
    );
  });
}

test("rejects an empty response", () => {
  expectInvalid("", "response_empty");
});

test("rejects a non-string response", () => {
  expectInvalid(null, "response_not_string");
});

test("rejects invalid JSON", () => {
  expectInvalid('{"codes":["ABC123"]', "invalid_json");
});

test("rejects a Markdown code fence", () => {
  expectInvalid('```json\n{"codes":["ABC123"]}\n```', "invalid_json");
});

test("rejects explanatory text before JSON", () => {
  expectInvalid('説明です。\n{"codes":["ABC123"]}', "invalid_json");
});

test("rejects explanatory text after JSON", () => {
  expectInvalid('{"codes":["ABC123"]}\n以上です。', "invalid_json");
});

test("rejects JSON containing stringified JSON", () => {
  expectInvalid(JSON.stringify('{"codes":["ABC123"]}'), "root_not_plain_object");
});

test("rejects a legacy plain serial code response", () => {
  expectInvalid("ABC123", "invalid_json");
});

for (const [label, value] of [
  ["array", ["ABC123"]],
  ["string", "ABC123"],
  ["null", null]
]) {
  test(`rejects a ${label} root`, () => {
    expectInvalid(JSON.stringify(value), "root_not_plain_object");
  });
}

test("rejects an object without codes", () => {
  expectInvalid('{"value":"ABC123"}', "invalid_root_keys");
});

for (const [label, value] of [
  ["string", "ABC123"],
  ["object", { value: "ABC123" }],
  ["null", null]
]) {
  test(`rejects codes when it is ${label}`, () => {
    expectInvalid(JSON.stringify({ codes: value }), "codes_not_array");
  });
}

test("rejects an empty codes array", () => {
  expectInvalid('{"codes":[]}', "codes_empty");
});

test("rejects eleven codes", () => {
  const codes = Array.from({ length: 11 }, (_, index) => `CODE${index + 1}`);
  expectInvalid(JSON.stringify({ codes }), "too_many_codes");
});

test("rejects output when every code is invalid", () => {
  expectInvalid('{"codes":["","INVALID SPACE",null,123]}', "no_valid_codes");
});

test("rejects an extra key", () => {
  expectInvalid('{"codes":["ABC123"],"message":"success"}', "invalid_root_keys");
});

test("rejects output larger than the configured limit before parsing", () => {
  const oversized = `{${" ".repeat(MAX_SERIAL_OUTPUT_LENGTH)}}`;
  assert.ok(oversized.length > MAX_SERIAL_OUTPUT_LENGTH);
  expectInvalid(oversized, "response_too_large");
});

test("rejects an XSS string instead of extracting a code from it", () => {
  expectInvalid('{"codes":["<script>alert(1)</script>"]}', "no_valid_codes");
});

test("rejects __proto__ as an extra key without polluting prototypes", () => {
  expectInvalid(
    '{"codes":["ABC123"],"__proto__":{"polluted":true}}',
    "invalid_root_keys"
  );
  assert.equal(Object.prototype.polluted, undefined);
});

test("rejects constructor as an extra key", () => {
  expectInvalid(
    '{"codes":["ABC123"],"constructor":{"prototype":{"polluted":true}}}',
    "invalid_root_keys"
  );
});

test("rejects a nested object inside codes when no valid code remains", () => {
  expectInvalid('{"codes":[{"code":"ABC123"}]}', "no_valid_codes");
});
