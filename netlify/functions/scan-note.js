// Netlify Function: Kağıda elle yazılmış görüşme notlarının fotoğrafını okuyup
// (ad soyad, telefon, geldi/gelmedi, satış oldu/olmadı gibi bilgileri) yapılandırılmış
// JSON olarak çıkarır. Groq API key'i Netlify environment variable olarak saklanır
// (GROQ_API_KEY), frontend'e asla açık edilmez.
//
// Bu fonksiyon veriyi OTOMATİK KAYDETMEZ — sadece okuyup öneriyor. Kullanıcı,
// panelde çıkan formu gözden geçirip onayladıktan sonra kayıt asıl "Yeni Görüşme"
// akışıyla (add-lead benzeri) veritabanına yazılır. Böylece yanlış okunan bir
// isim/telefon otomatik olarak sisteme hatalı girmez.

const SYSTEM_PROMPT = `Sen bir hizmet işletmesinde (güzellik salonu, klinik, kuaför vb.)
tutulan EL YAZISI görüşme/randevu defteri sayfalarını okuyup yapılandırılmış veri
çıkaran bir asistansın. Sana bu deftere ait bir sayfa fotoğrafı verilecek.

Sayfada genelde şu bilgiler bulunur: müşteri adı soyadı, telefon numarası, gelip
gelmediği (geldi/gelmedi), satış olup olmadığı (satış oldu/olmadı), bazen tarih
ve kısa bir not.

GÖREV: Sayfadaki HER SATIRI (her müşteri kaydını) ayrı bir öğe olarak çıkar ve
SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme:

{
  "entries": [
    {
      "name": "Ad Soyad (okunduğu gibi)",
      "phone": "Telefon (okunabiliyorsa, +90 formatında; okunamıyorsa boş string)",
      "result": "Randevu aldı" | "Randevuya gelmedi" | "Satın almadı" | "Müşteri oldu" | "Cevap yazıldı, müşteriden dönüş gelmedi",
      "note": "Sayfadaki ek not varsa kısaca (yoksa boş string)",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

ÖNEMLİ KURALLAR:
- Bir bilgiyi net okuyamıyorsan, o alanı boş string bırak, ASLA UYDURMA.
- "result" alanını sadece yukarıdaki 5 seçenekten biri olarak doldur; sayfada
  "geldi" yazıyorsa ve satış belirtilmemişse "Randevu aldı", "gelmedi" yazıyorsa
  "Randevuya gelmedi", satış/ödeme belirtilmişse "Müşteri oldu" seç.
- Emin olamadığın her satır için "confidence": "low" işaretle ki kullanıcı
  kontrol etsin.
- Sayfada hiç okunabilir kayıt yoksa "entries": [] döndür.
- Kesinlikle sadece JSON döndür, markdown kod bloğu (\`\`\`) kullanma, başka metin ekleme.`

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geçersiz istek gövdesi' }) }
  }

  const { imageBase64, mimeType } = payload
  if (!imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Fotoğraf verisi (imageBase64) gerekli' }) }
  }

  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const resolvedMimeType = mimeType || 'image/jpeg'

  const approxBytes = cleanBase64.length * 0.75
  if (approxBytes > 8 * 1024 * 1024) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Fotoğraf çok büyük (maks. ~8MB). Lütfen daha düşük çözünürlükte tekrar deneyin.' }) }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası: GROQ_API_KEY eksik' }) }
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Bu fotoğraftaki el yazısı görüşme kayıtlarını yukarıdaki talimata göre JSON olarak çıkar.' },
              { type: 'image_url', image_url: { url: `data:${resolvedMimeType};base64,${cleanBase64}` } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { statusCode: 502, body: JSON.stringify({ error: 'AI servisinden yanıt alınamadı', detail: errText }) }
    }

    const data = await res.json()
    let rawText = data?.choices?.[0]?.message?.content?.trim()

    if (!rawText) {
      return { statusCode: 502, body: JSON.stringify({ error: 'AI servisi boş yanıt döndürdü' }) }
    }

    rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return { statusCode: 502, body: JSON.stringify({ error: 'AI yanıtı geçerli JSON değil', raw: rawText }) }
    }

    const entries = Array.isArray(parsed.entries) ? parsed.entries : []
    const VALID_RESULTS = ['Randevu aldı', 'Randevuya gelmedi', 'Satın almadı', 'Cevap yazıldı, müşteriden dönüş gelmedi', 'Müşteri oldu']

    const cleanedEntries = entries.map(e => ({
      name: typeof e.name === 'string' ? e.name.trim().slice(0, 100) : '',
      phone: typeof e.phone === 'string' ? e.phone.trim().slice(0, 20) : '',
      result: VALID_RESULTS.includes(e.result) ? e.result : 'Randevu aldı',
      note: typeof e.note === 'string' ? e.note.trim().slice(0, 300) : '',
      confidence: ['high', 'medium', 'low'].includes(e.confidence) ? e.confidence : 'low',
    })).filter(e => e.name)

    return { statusCode: 200, body: JSON.stringify({ entries: cleanedEntries }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
