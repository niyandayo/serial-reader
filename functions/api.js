const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_SIZE_BYTES * 4) / 3) + 4;
const MAX_JSON_BODY_SIZE_BYTES = 7 * 1024 * 1024;
const MAX_RETRY_DELAY_MS = 60 * 1000;
const SERIAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const BASE64_CHARACTER_PATTERN = /^[A-Za-z0-9+/=]+$/;
const SAFE_QUOTA_FIELD_PATTERN = /^[A-Za-z0-9._:/-]{1,180}$/;
const GEMINI_MODEL = "gemini-3.6-flash";

const ERROR_MESSAGES = {
  invalid_input: "入力内容が正しくありません。画像を選び直してもう一度お試しください。",
  payload_too_large: "送信する画像データが大きすぎます。画像を選び直してください。",
  method_not_allowed: "この操作にはPOSTメソッドが必要です。",
  service_unavailable: "現在、読み取りサービスを利用できません。時間をおいてもう一度お試しください。",
  gemini_429: "画像を読み取れませんでした。時間をおいてもう一度お試しください。",
  gemini_rate_limit: "アクセスが集中しています。少し時間をおいてもう一度お試しください。",
  gemini_daily_quota: "現在、読み取り回数の上限に達しています。時間をおいてもう一度お試しください。",
  gemini_5xx: "画像を読み取れませんでした。もう一度お試しください。",
  network_error: "一時的な通信エラーが発生しました。もう一度お試しください。",
  invalid_upstream_response: "AIサービスから一時的に正しい応答を受信できませんでした。もう一度お試しください。",
  gemini_rejected: "画像を読み取れませんでした。もう一度お試しください。",
  invalid_output: "シリアル番号を認識できませんでした。画像を確認してもう一度お試しください。"
};

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function logApiResult({
  requestId,
  status,
  errorCode,
  retryable,
  startedAt,
  upstreamStatus,
  quotaScope,
  quotaIds,
  quotaMetrics,
  retryDelayMs
}) {
  const entry = {
    event: errorCode ? "image_extract_failed" : "image_extract_succeeded",
    requestId,
    status,
    durationMs: Math.max(0, Date.now() - startedAt)
  };

  if (errorCode) {
    entry.errorCode = errorCode;
    entry.retryable = retryable;
  }
  if (Number.isInteger(upstreamStatus)) {
    entry.upstreamStatus = upstreamStatus;
  }
  if (["short_term", "daily", "unknown"].includes(quotaScope)) {
    entry.quotaScope = quotaScope;
  }
  if (Array.isArray(quotaIds) && quotaIds.length) {
    entry.quotaIds = quotaIds;
  }
  if (Array.isArray(quotaMetrics) && quotaMetrics.length) {
    entry.quotaMetrics = quotaMetrics;
  }
  if (Number.isInteger(retryDelayMs)) {
    entry.retryDelayMs = retryDelayMs;
  }

  const serializedEntry = JSON.stringify(entry);
  if (errorCode) {
    console.warn(serializedEntry);
  } else {
    console.info(serializedEntry);
  }
}

function errorResponse({
  requestId,
  status,
  errorCode,
  retryable = false,
  startedAt,
  upstreamStatus,
  quotaScope,
  quotaIds,
  quotaMetrics,
  retryDelayMs,
  extraHeaders = {}
}) {
  logApiResult({
    requestId,
    status,
    errorCode,
    retryable,
    startedAt,
    upstreamStatus,
    quotaScope,
    quotaIds,
    quotaMetrics,
    retryDelayMs
  });
  const body = {
    error: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.service_unavailable,
    errorCode,
    retryable,
    requestId
  };
  if (["short_term", "daily", "unknown"].includes(quotaScope)) {
    body.quotaScope = quotaScope;
  }
  if (Number.isInteger(retryDelayMs)) {
    body.retryDelayMs = retryDelayMs;
  }
  return jsonResponse(
    body,
    status,
    { "X-Request-ID": requestId, ...extraHeaders }
  );
}

function successResponse({ requestId, code, startedAt }) {
  logApiResult({ requestId, status: 200, startedAt });
  return jsonResponse(
    { code, requestId },
    200,
    { "X-Request-ID": requestId }
  );
}

async function readJsonBodyWithLimit(request) {
  if (!request.body) return { invalid: true };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_SIZE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // サイズ超過の判定結果を優先する
        }
        return { tooLarge: true };
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());

    return { payload: JSON.parse(chunks.join("")) };
  } catch {
    return { invalid: true };
  }
}

function matchesImageSignature(decodedImage, mimeType) {
  if (mimeType === "image/jpeg") {
    return decodedImage.length >= 3
      && decodedImage.charCodeAt(0) === 0xff
      && decodedImage.charCodeAt(1) === 0xd8
      && decodedImage.charCodeAt(2) === 0xff;
  }
  if (mimeType === "image/png") {
    return decodedImage.length >= 8
      && decodedImage.charCodeAt(0) === 0x89
      && decodedImage.slice(1, 4) === "PNG"
      && decodedImage.charCodeAt(4) === 0x0d
      && decodedImage.charCodeAt(5) === 0x0a
      && decodedImage.charCodeAt(6) === 0x1a
      && decodedImage.charCodeAt(7) === 0x0a;
  }
  return decodedImage.length >= 12
    && decodedImage.slice(0, 4) === "RIFF"
    && decodedImage.slice(8, 12) === "WEBP";
}

function validateImageInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;

  const { imageBase64, mimeType } = payload;
  if (typeof imageBase64 !== "string" || typeof mimeType !== "string") return false;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return false;
  if (imageBase64.length === 0 || imageBase64.length > MAX_BASE64_LENGTH) return false;
  if (imageBase64.length % 4 !== 0 || !BASE64_CHARACTER_PATTERN.test(imageBase64)) return false;
  const paddingStart = imageBase64.indexOf("=");
  if (paddingStart !== -1 && !/^={1,2}$/.test(imageBase64.slice(paddingStart))) return false;

  try {
    const decodedImage = atob(imageBase64);
    return decodedImage.length <= MAX_IMAGE_SIZE_BYTES && matchesImageSignature(decodedImage, mimeType);
  } catch {
    return false;
  }
}

function toSafeQuotaField(value) {
  return typeof value === "string" && SAFE_QUOTA_FIELD_PATTERN.test(value) ? value : "";
}

function parseRetryDelayMs(value) {
  if (typeof value !== "string") return undefined;
  const match = /^(\d+)(?:\.(\d{1,9}))?s$/.exec(value);
  if (!match) return undefined;
  const milliseconds = Math.ceil(Number(match[1]) * 1000 + Number(`0.${match[2] || "0"}`) * 1000);
  if (!Number.isSafeInteger(milliseconds)) return undefined;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(1000, milliseconds));
}

function parseRetryAfterHeader(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (/^\d+$/.test(value.trim())) {
    return Math.min(MAX_RETRY_DELAY_MS, Math.max(1000, Number(value.trim()) * 1000));
  }
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return undefined;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(1000, retryAt - Date.now()));
}

function classifyQuotaScope(quotaIds) {
  let hasShortTerm = false;
  for (const quotaId of quotaIds) {
    const isDaily = /PerDay(?:Per|[-_.]|$)/.test(quotaId)
      || /(?:^|[-_.])(?:per[-_]?day|daily)(?:[-_.]|$)/i.test(quotaId);
    const isShortTerm = /Per(?:Minute|Second)(?:Per|[-_.]|$)/.test(quotaId)
      || /(?:^|[-_.])per[-_]?(?:minute|second)(?:[-_.]|$)/i.test(quotaId);
    if (isDaily) return "daily";
    if (isShortTerm) hasShortTerm = true;
  }
  return hasShortTerm ? "short_term" : "unknown";
}

function extractGeminiQuotaMetadata(data, response) {
  const quotaIds = [];
  const quotaMetrics = [];
  let retryDelayMs;
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];

  for (const detail of details) {
    const type = typeof detail?.["@type"] === "string" ? detail["@type"] : "";
    if (type.endsWith("/google.rpc.QuotaFailure") && Array.isArray(detail.violations)) {
      for (const violation of detail.violations) {
        const quotaId = toSafeQuotaField(violation?.quotaId);
        const quotaMetric = toSafeQuotaField(violation?.quotaMetric);
        if (quotaId && !quotaIds.includes(quotaId)) quotaIds.push(quotaId);
        if (quotaMetric && !quotaMetrics.includes(quotaMetric)) quotaMetrics.push(quotaMetric);
      }
    }
    if (type.endsWith("/google.rpc.RetryInfo")) {
      retryDelayMs = parseRetryDelayMs(detail?.retryDelay) ?? retryDelayMs;
    }
  }

  retryDelayMs = retryDelayMs ?? parseRetryAfterHeader(response.headers.get("Retry-After"));
  return {
    quotaScope: classifyQuotaScope(quotaIds),
    quotaIds: quotaIds.slice(0, 4),
    quotaMetrics: quotaMetrics.slice(0, 4),
    retryDelayMs
  };
}

async function callGemini({ apiKey, imageBase64, mimeType }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像内に記載されている「シリアルナンバー」「シリアルコード」に該当する英数字、ハイフン、アンダースコアのみから成る文字列を1件だけ抽出してください。前置き、解説、記号、改行は一切含めず、コード文字列のみを1行で出力してください。" },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }]
      })
    });
  } catch {
    return { ok: false, status: 502, errorCode: "network_error", retryable: true };
  }

  if (response.status === 429) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const quota = extractGeminiQuotaMetadata(errorData, response);
    const errorCode = quota.quotaScope === "daily"
      ? "gemini_daily_quota"
      : quota.quotaScope === "short_term"
        ? "gemini_rate_limit"
        : "gemini_429";
    return {
      ok: false,
      status: 429,
      errorCode,
      retryable: quota.quotaScope === "short_term",
      upstreamStatus: response.status,
      ...quota
    };
  }
  if (response.status >= 500 && response.status <= 599) {
    return {
      ok: false,
      status: 502,
      errorCode: "gemini_5xx",
      retryable: true,
      upstreamStatus: response.status
    };
  }
  if (response.status === 408) {
    return {
      ok: false,
      status: 502,
      errorCode: "network_error",
      retryable: true,
      upstreamStatus: response.status
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      errorCode: "gemini_rejected",
      retryable: false,
      upstreamStatus: response.status
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      errorCode: "invalid_upstream_response",
      retryable: true,
      upstreamStatus: response.status
    };
  }

  const rawCode = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!SERIAL_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      status: 422,
      errorCode: "invalid_output",
      retryable: false,
      upstreamStatus: response.status
    };
  }

  return { ok: true, code };
}

export async function onRequest(context) {
  const { request, env } = context;
  const requestId = createRequestId();
  const startedAt = Date.now();

  if (request.method !== "POST") {
    return errorResponse({
      requestId,
      status: 405,
      errorCode: "method_not_allowed",
      startedAt,
      extraHeaders: { Allow: "POST" }
    });
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return errorResponse({ requestId, status: 400, errorCode: "invalid_input", startedAt });
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength && /^\d+$/.test(contentLength)) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > MAX_JSON_BODY_SIZE_BYTES) {
      return errorResponse({ requestId, status: 413, errorCode: "payload_too_large", startedAt });
    }
  }

  const bodyResult = await readJsonBodyWithLimit(request);
  if (bodyResult.tooLarge) {
    return errorResponse({ requestId, status: 413, errorCode: "payload_too_large", startedAt });
  }
  if (bodyResult.invalid) {
    return errorResponse({ requestId, status: 400, errorCode: "invalid_input", startedAt });
  }
  const { payload } = bodyResult;

  if (!validateImageInput(payload)) {
    return errorResponse({ requestId, status: 400, errorCode: "invalid_input", startedAt });
  }

  const { imageBase64, mimeType } = payload;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse({ requestId, status: 500, errorCode: "service_unavailable", startedAt });
  }

  const result = await callGemini({ apiKey, imageBase64, mimeType });
  if (!result.ok) {
    const extraHeaders = {};
    if (result.retryable && Number.isInteger(result.retryDelayMs)) {
      extraHeaders["Retry-After"] = String(Math.ceil(result.retryDelayMs / 1000));
    }
    return errorResponse({
      requestId,
      status: result.status,
      errorCode: result.errorCode,
      retryable: result.retryable,
      startedAt,
      upstreamStatus: result.upstreamStatus,
      quotaScope: result.quotaScope,
      quotaIds: result.quotaIds,
      quotaMetrics: result.quotaMetrics,
      retryDelayMs: result.retryDelayMs,
      extraHeaders
    });
  }

  return successResponse({ requestId, code: result.code, startedAt });
}
