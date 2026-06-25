import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import LandingPage from './LandingPage.jsx'
import Features from './Features.jsx'
import Testimonials from './Testimonials.jsx'
import About from './About.jsx'
import Blog from './Blog.jsx'
import BlogPost from './BlogPost.jsx'
import Contact from './Contact.jsx'
import Trial from './Trial.jsx'
import DemoPage from './DemoPage.jsx'
import { PanelApp } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ozellikler" element={<Features />} />
        <Route path="/referanslar" element={<Testimonials />} />
        <Route path="/hakkimizda" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/iletisim" element={<Contact />} />
        <Route path="/deneme" element={<Trial />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/giris" element={<PanelApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
