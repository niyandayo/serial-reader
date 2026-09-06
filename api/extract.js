export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured' });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像内に記載されている「シリアルナンバー」や「シリアルコード」に該当する英数字文字列のみを抽出してください。余計な説明や前置きは一切省き、コード文字列のみを1行で出力してください。" },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const code = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '認識できませんでした';
    res.status(200).json({ code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
