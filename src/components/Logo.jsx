import { Link } from 'react-router-dom'

export default function Logo({ small = false }) {
  return (
    <Link to="/" className="logo" aria-label="Müşteri Takip ana sayfa">
      <span className={small ? 'logo-mark small' : 'logo-mark'}>M</span>
      <span className="logo-text">MÜŞTERİ<br />TAKİP</span>
    </Link>
  )
}
