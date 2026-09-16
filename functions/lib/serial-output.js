export const SERIAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_SERIAL_CODES = 10;

// 10 codes of up to 128 ASCII characters fit well within this limit, even if
// JSON escaping adds overhead. Reject larger model output before JSON.parse().
export const MAX_SERIAL_OUTPUT_LENGTH = 8 * 1024;

function invalid(reason) {
  return { ok: false, reason };
}

export function parseMultipleSerialOutput(responseText) {
  if (typeof responseText !== "string") {
    return invalid("response_not_string");
  }

  if (responseText.length === 0) {
    return invalid("response_empty");
  }

  if (responseText.length > MAX_SERIAL_OUTPUT_LENGTH) {
    return invalid("response_too_large");
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return invalid("invalid_json");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return invalid("root_not_plain_object");
  }

  if (Object.getPrototypeOf(parsed) !== Object.prototype) {
    return invalid("root_not_plain_object");
  }

  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== "codes"
      || !Object.prototype.hasOwnProperty.call(parsed, "codes")) {
    return invalid("invalid_root_keys");
  }

  if (!Array.isArray(parsed.codes)) {
    return invalid("codes_not_array");
  }

  if (parsed.codes.length === 0) {
    return invalid("codes_empty");
  }

  if (parsed.codes.length > MAX_SERIAL_CODES) {
    return invalid("too_many_codes");
  }

  const codes = [];
  let discardedCount = 0;

  for (const candidate of parsed.codes) {
    if (typeof candidate === "string" && SERIAL_CODE_PATTERN.test(candidate)) {
      codes.push(candidate);
    } else {
      discardedCount += 1;
    }
  }

  if (codes.length === 0) {
    return invalid("no_valid_codes");
  }

  return {
    ok: true,
    codes,
    partial: discardedCount > 0,
    discardedCount
  };
}
