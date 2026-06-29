// Netlify Function: Bir görüşme notunu okuyup, personele kısa bir iletişim/satış
// ipucu önerir. Gemini API key'i Netlify environment variable olarak saklanır
// (GEMINI_API_KEY), frontend'e asla açık edilmez.
//
// Bu özellik TIBBİ veya teknik tavsiye vermez - sadece iletişim/satış yaklaşımı
// önerir (örn. "müşteri tereddütlü görünüyor, ek bilgi vererek güven oluşturabilirsin").

const SYSTEM_PROMPT = `Sen bir hizmet işletmesinde (güzellik salonu, klinik, kuaför vb.) çalışan
personele yardımcı olan bir pazarlama/iletişim asistanısın. Sana bir müşteri görüşme notu
verilecek. Görevin: personele bu müşteriyle nasıl iletişim kurması, ne zaman ve nasıl takip
etmesi gerektiği konusunda KISA (en fazla 2 cümle), SAMİMİ ve UYGULANABİLİR bir ipucu vermek.

KESİNLİKLE YAPMA:
- Tıbbi, sağlık veya teknik/uzmanlık tavsiyesi verme (örn. hangi işlem yapılmalı, hangi
  ürün kullanılmalı gibi). Bu alanlar uzmanlık gerektirir ve senin görevin değil.
- Notta yer almayan bilgi icat etme.
- Uzun, genel geçer, klişe tavsiyeler verme.

SADECE YAP:
- İletişim tonu, zamanlama, takip stratejisi gibi pazarlama/satış odaklı öneriler ver.
- Notta belirtilen duygu durumuna (tereddüt, ilgi, memnuniyetsizlik vb.) göre yaklaşım öner.

Örnek: Not "fiyatı yüksek buldu, düşünecek" ise → "Birkaç gün içinde nazikçe takip edip, varsa kampanya/taksit seçeneklerini hatırlatabilirsin."`

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

  const { note, result, service } = payload
  if (!note || !note.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Not metni gerekli' }) }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası: GEMINI_API_KEY eksik' }) }
  }

  // Notu kısaltarak gönderiyoruz (maliyet ve gizlilik için gereksiz uzun metin yollamıyoruz)
  const trimmedNote = note.trim().slice(0, 500)
  const contextLine = [
    service ? `Hizmet: ${service}` : null,
    result ? `Durum: ${result}` : null,
  ].filter(Boolean).join(' · ')

  const userMessage = `${contextLine ? contextLine + '\n' : ''}Not: ${trimmedNote}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 120, temperature: 0.6 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return { statusCode: 502, body: JSON.stringify({ error: 'AI servisinden yanıt alınamadı', detail: errText }) }
    }

    const data = await res.json()
    const tip = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!tip) {
      return { statusCode: 502, body: JSON.stringify({ error: 'AI servisi boş yanıt döndürdü' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ tip }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
