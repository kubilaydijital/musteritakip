export default function ReferenceLogo({ item, large = false }) {
  return (
    <div className={large ? 'reference-logo large' : 'reference-logo'}>
      <div><strong>{item.name}</strong><small>{item.sub}</small></div>
    </div>
  )
}
