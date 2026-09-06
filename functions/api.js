const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_SIZE_BYTES * 4) / 3) + 4;
const MAX_JSON_BODY_SIZE_BYTES = 7 * 1024 * 1024;
const SERIAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const BASE64_CHARACTER_PATTERN = /^[A-Za-z0-9+/=]+$/;

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function invalidRequest() {
  return jsonResponse({ error: "入力内容が正しくありません。画像を選び直してもう一度お試しください。" }, 400);
}

function payloadTooLarge() {
  return jsonResponse({ error: "送信する画像データが大きすぎます。画像を選び直してください。" }, 413);
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "この操作にはPOSTメソッドが必要です。" },
      405,
      { Allow: "POST" }
    );
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return invalidRequest();
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength && /^\d+$/.test(contentLength)) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > MAX_JSON_BODY_SIZE_BYTES) {
      return payloadTooLarge();
    }
  }

  const bodyResult = await readJsonBodyWithLimit(request);
  if (bodyResult.tooLarge) return payloadTooLarge();
  if (bodyResult.invalid) return invalidRequest();
  const { payload } = bodyResult;

  if (!validateImageInput(payload)) {
    return invalidRequest();
  }

  const { imageBase64, mimeType } = payload;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "現在、読み取りサービスを利用できません。時間をおいてもう一度お試しください。" }, 500);
  }

  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
    const response = await fetch(endpoint, {
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

    if (response.status === 429) {
      return jsonResponse({ error: "画像を読み取れませんでした。もう一度お試しください。", retryable: true }, 429);
    }
    if (response.status >= 500 && response.status <= 599) {
      return jsonResponse({ error: "画像を読み取れませんでした。もう一度お試しください。", retryable: true }, 502);
    }
    if (!response.ok) {
      return jsonResponse({ error: "画像を読み取れませんでした。もう一度お試しください。", retryable: false }, 502);
    }

    const data = await response.json();
    const code = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (typeof code !== "string" || !SERIAL_CODE_PATTERN.test(code)) {
      return jsonResponse({ error: "シリアル番号を認識できませんでした。画像を確認してもう一度お試しください。" }, 422);
    }

    return jsonResponse({ code }, 200);
  } catch {
    return jsonResponse({ error: "画像を読み取れませんでした。もう一度お試しください。" }, 502);
  }
}
