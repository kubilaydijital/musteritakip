import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'
import LandingPage from './pages/LandingPage.jsx'
import Features from './pages/Features.jsx'
import References from './pages/References.jsx'
import About from './pages/About.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Contact from './pages/Contact.jsx'
import Trial from './pages/Trial.jsx'
import DemoPage from './DemoPage.jsx'
import { PanelApp } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ozellikler" element={<Features />} />
        <Route path="/referanslar" element={<References />} />
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
  </React.StrictMode>
)
