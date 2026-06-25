import Layout from '../components/Layout.jsx'
import { features } from '../data/siteData.js'

export default function Features() {
  return <Layout><main className="page"><section className="container page-hero"><span className="page-no">02</span><h1>İşinizi kolaylaştıran güçlü özellikler</h1><p>Tüm süreçlerinizi tek yerden yönetin, zaman kazanın, daha çok kazanın.</p></section><section className="container features-grid">{features.map((item) => { const Icon = item.icon; return <article className="feature-card" key={item.title}><Icon size={30}/><h3>{item.title}</h3><p>{item.desc}</p></article> })}</section></main></Layout>
}
