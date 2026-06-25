export default function ReferenceLogo({ item, large = false }) {
  const Icon = item.icon
  return (
    <div className={large ? 'reference-logo large' : 'reference-logo'}>
      <Icon size={large ? 36 : 30} />
      <div><strong>{item.name}</strong><small>{item.sub}</small></div>
    </div>
  )
}
