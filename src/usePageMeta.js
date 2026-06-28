import { useEffect } from 'react'

const SITE_NAME = 'Müşteri Takip'
const DEFAULT_DESCRIPTION = 'Randevu bazlı hizmet işletmeleri için müşteri, randevu, hatırlatma ve reklam kaynak takip sistemi.'

// Her sayfa kendi title/description'ını bu hook ile ayarlar.
// React Router SPA'da sayfa değişince <title> ve <meta description> otomatik
// güncellenmediği için (tek bir index.html var), bunu elle yapıyoruz.
export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description || DEFAULT_DESCRIPTION)

    // Sayfa değişince eski değerlere dönmeye gerek yok; her sayfa kendi mount
    // olduğunda zaten yeni değerleri set ediyor.
  }, [title, description])
}
