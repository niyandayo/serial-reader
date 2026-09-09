const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_SIZE_BYTES * 4) / 3) + 4;
const MAX_JSON_BODY_SIZE_BYTES = 7 * 1024 * 1024;
const SERIAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const BASE64_CHARACTER_PATTERN = /^[A-Za-z0-9+/=]+$/;
const WORKERS_AI_PROVIDER = "workers_ai";
const WORKERS_AI_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const WORKERS_AI_PROMPT = "写真に写っているシリアルコードと思われる英数字を正確に1つ読み取ってください。コードそのものだけを返し、説明文、Markdown、引用符、空白、余計な改行を付けないでください。推測で文字を補完しすぎず、大文字小文字とハイフン、アンダースコアを画像どおりに保ってください。";

const ERROR_MESSAGES = {
  invalid_input: "入力内容が正しくありません。画像を選び直してもう一度お試しください。",
  payload_too_large: "送信する画像データが大きすぎます。画像を選び直してください。",
  method_not_allowed: "この操作にはPOSTメソッドが必要です。",
  service_unavailable: "現在、読み取りサービスを利用できません。時間をおいてもう一度お試しください。",
  workers_ai_error: "読み取り処理で一時的なエラーが発生しました。もう一度お試しください。",
  workers_ai_rate_limit: "アクセスが集中しています。少し時間をおいてもう一度お試しください。",
  workers_ai_quota: "本日の読み取り上限に達しました。時間をおいて再度お試しください。",
  workers_ai_license_required: "読み取りサービスの準備が完了していません。時間をおいてもう一度お試しください。",
  network_error: "一時的な通信エラーが発生しました。もう一度お試しください。",
  invalid_upstream_response: "AIサービスから一時的に正しい応答を受信できませんでした。もう一度お試しください。",
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
  workersAiErrorCode,
  limitScope,
  retryDelayMs
}) {
  const entry = {
    event: errorCode ? "image_extract_failed" : "image_extract_succeeded",
    requestId,
    provider: WORKERS_AI_PROVIDER,
    model: WORKERS_AI_MODEL,
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
  if (Number.isInteger(workersAiErrorCode)) {
    entry.workersAiErrorCode = workersAiErrorCode;
  }
  if (limitScope === "daily") {
    entry.limitScope = limitScope;
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
  workersAiErrorCode,
  limitScope,
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
    workersAiErrorCode,
    limitScope,
    retryDelayMs
  });
  const body = {
    error: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.service_unavailable,
    errorCode,
    retryable,
    requestId
  };
  if (limitScope === "daily") {
    body.limitScope = limitScope;
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

function toSafeInteger(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{3,5}$/.test(value)) return Number(value);
  return undefined;
}

function getWorkersAiErrorMetadata(error) {
  const candidates = [error, error?.cause, error?.error];
  let workersAiErrorCode;
  let upstreamStatus;
  let errorName = "";

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    workersAiErrorCode = workersAiErrorCode ?? toSafeInteger(candidate.code);
    upstreamStatus = upstreamStatus
      ?? toSafeInteger(candidate.status)
      ?? toSafeInteger(candidate.statusCode);
    if (!errorName && typeof candidate.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(candidate.name)) {
      errorName = candidate.name;
    }
  }

  return { workersAiErrorCode, upstreamStatus, errorName };
}

function classifyWorkersAiError(error) {
  const metadata = getWorkersAiErrorMetadata(error);
  const { workersAiErrorCode, upstreamStatus, errorName } = metadata;

  if (workersAiErrorCode === 3036) {
    return { ...metadata, status: 429, errorCode: "workers_ai_quota", retryable: false, limitScope: "daily" };
  }
  if (workersAiErrorCode === 3040) {
    return { ...metadata, status: 429, errorCode: "workers_ai_rate_limit", retryable: true };
  }
  if (workersAiErrorCode === 5016) {
    return { ...metadata, status: 503, errorCode: "workers_ai_license_required", retryable: false };
  }
  if ([3007, 3008].includes(workersAiErrorCode)
      || upstreamStatus === 408
      || ["AbortError", "NetworkError", "TimeoutError"].includes(errorName)) {
    return { ...metadata, status: 502, errorCode: "network_error", retryable: true };
  }
  if (upstreamStatus === 429) {
    return { ...metadata, status: 429, errorCode: "workers_ai_error", retryable: false };
  }
  if (Number.isInteger(upstreamStatus) && upstreamStatus >= 500 && upstreamStatus <= 599) {
    return { ...metadata, status: 502, errorCode: "workers_ai_error", retryable: true };
  }
  return { ...metadata, status: 502, errorCode: "workers_ai_error", retryable: false };
}

async function callWorkersAi({ ai, imageBase64, mimeType }) {
  let result;
  try {
    result = await ai.run(WORKERS_AI_MODEL, {
      messages: [
        { role: "system", content: "画像からシリアルコードを正確に読み取るアシスタントです。" },
        { role: "user", content: WORKERS_AI_PROMPT }
      ],
      image: `data:${mimeType};base64,${imageBase64}`,
      temperature: 0,
      max_tokens: 160,
      seed: 1
    });
  } catch (error) {
    return { ok: false, ...classifyWorkersAiError(error) };
  }

  if (result && typeof result === "object" && !Array.isArray(result) && result.error) {
    return { ok: false, ...classifyWorkersAiError(result.error) };
  }

  if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.response !== "string") {
    return { ok: false, status: 502, errorCode: "invalid_upstream_response", retryable: true };
  }

  const code = result.response.trim();
  if (!SERIAL_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      status: 422,
      errorCode: "invalid_output",
      retryable: false
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
  if (!env.AI || typeof env.AI.run !== "function") {
    return errorResponse({ requestId, status: 500, errorCode: "service_unavailable", startedAt });
  }

  const result = await callWorkersAi({ ai: env.AI, imageBase64, mimeType });
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
      workersAiErrorCode: result.workersAiErrorCode,
      limitScope: result.limitScope,
      retryDelayMs: result.retryDelayMs,
      extraHeaders
    });
  }

  return successResponse({ requestId, code: result.code, startedAt });
}
