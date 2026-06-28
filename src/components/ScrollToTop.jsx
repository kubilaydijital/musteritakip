import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Her route değişiminde sayfayı en üste kaydırır.
// React Router varsayılan olarak scroll pozisyonunu korur; bu davranış mobilde
// özellikle kafa karıştırıcı (örn. "14 Gün Dene" linkine basınca formun göründüğü
// üst kısım değil, önceki sayfada kalınan kaydırma konumu görünüyordu).
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
