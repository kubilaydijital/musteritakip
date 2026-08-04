import { supabase } from '../supabaseClient'

// Oturum gerektiren Netlify Function çağrılarına kullanıcının Supabase oturumunu ekler.
// Böylece sunucu, isteği yapan kişinin kim olduğunu ve neye yetkisi olduğunu doğrulayabilir.
export async function authenticatedNetlifyFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.')

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(path, { ...options, headers })
}
