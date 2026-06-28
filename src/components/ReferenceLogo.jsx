export default function ReferenceLogo({ item, large = false }) {
  const Icon = item.icon
  const boxSize = large ? 64 : 52
  return (
    <div className={large ? 'reference-logo large' : 'reference-logo'}>
      <span className="reference-icon-box" style={{ width: boxSize, height: boxSize }}>
        <Icon size={large ? 32 : 26} />
      </span>
      <div><strong>{item.name}</strong><small>{item.sub}</small></div>
    </div>
  )
}
