// Adaptateur météo Open-Meteo (sans clé). Appelé uniquement après consentement explicite.
import { parseOpenMeteo } from '../domain/weather.js';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

async function fetchJSON(url, { timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal, referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!r.ok) throw new Error(`Service météo indisponible (${r.status})`);
    return await r.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Délai dépassé : service météo injoignable');
    throw e;
  } finally { clearTimeout(t); }
}

export async function geocode(name) {
  const url = `${GEO}?name=${encodeURIComponent(name)}&count=5&language=fr&format=json`;
  const json = await fetchJSON(url);
  return (json.results || []).map((r) => ({ name: r.name, admin: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude, tz: r.timezone }));
}

export async function forecast(place, { dayIndex = 0 } = {}) {
  const params = new URLSearchParams({
    latitude: String(place.lat), longitude: String(place.lon),
    daily: 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: place.tz || 'Europe/Paris', forecast_days: '7',
  });
  const json = await fetchJSON(`${FORECAST}?${params}`);
  return parseOpenMeteo(json, { dayIndex, place: [place.name, place.admin].filter(Boolean).join(', ') });
}

export function currentPosition() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(new Error('Géolocalisation indisponible')); return; }
    navigator.geolocation.getCurrentPosition((p) => res({ name: 'Ma position', lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, tz: 'Europe/Paris' }), () => rej(new Error('Localisation refusée')), { timeout: 10000, maximumAge: 3600e3 });
  });
}
