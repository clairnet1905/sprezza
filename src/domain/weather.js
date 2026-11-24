// Météo : normalisation Open-Meteo, saison, fraîcheur. Ne jamais afficher une météo inventée ou périmée comme actuelle.
export const WEATHER_MAX_AGE_H = 6;

export function seasonFromDate(d = new Date()) {
  const m = d.getMonth() + 1; const day = d.getDate();
  const md = m * 100 + day;
  if (md >= 321 && md < 621) return 'spring';
  if (md >= 621 && md < 923) return 'summer';
  if (md >= 923 && md < 1221) return 'autumn';
  return 'winter';
}
export const SEASON_NAMES = { spring: 'Printemps', summer: 'Été', autumn: 'Automne', winter: 'Hiver' };

/** Convertit une réponse daily Open-Meteo en conditions pour une date (index jour). */
export function parseOpenMeteo(json, { dayIndex = 0, place = '', fetchedAt = new Date().toISOString() } = {}) {
  const d = json?.daily;
  if (!d || !Array.isArray(d.time) || d.time[dayIndex] === undefined) throw new Error('Réponse météo incomplète');
  const num = (arr) => (Array.isArray(arr) && typeof arr[dayIndex] === 'number' ? arr[dayIndex] : null);
  const w = {
    date: d.time[dayIndex], place,
    tMin: num(d.temperature_2m_min), tMax: num(d.temperature_2m_max),
    feelsMin: num(d.apparent_temperature_min), feelsMax: num(d.apparent_temperature_max),
    precip: num(d.precipitation_sum), precipProb: num(d.precipitation_probability_max), wind: num(d.wind_speed_10m_max),
    source: 'Open-Meteo (open-meteo.com)', fetchedAt, manual: false,
  };
  return enrich(w);
}

export function manualWeather({ temp, rain = false, wind = false, date }) {
  return enrich({ date, place: 'Saisie manuelle', tMin: temp, tMax: temp, feelsMin: temp, feelsMax: temp, precip: rain ? 3 : 0, precipProb: rain ? 80 : 0, wind: wind ? 45 : 10, source: 'Saisie manuelle', fetchedAt: new Date().toISOString(), manual: true });
}

export function enrich(w) {
  const feels = [w.feelsMin, w.feelsMax].filter((v) => typeof v === 'number');
  const temps = feels.length ? feels : [w.tMin, w.tMax].filter((v) => typeof v === 'number');
  w.feel = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  w.coldest = temps.length ? Math.min(...temps) : null;
  w.rain = (w.precip ?? 0) >= 1 || (w.precipProb ?? 0) >= 55;
  w.windy = (w.wind ?? 0) >= 40;
  w.cold = w.feel !== null && w.feel < 11;
  w.hot = w.feel !== null && w.feel >= 24;
  w.dropRisk = w.coldest !== null && w.tMax !== null && (w.tMax - w.coldest >= 8 || w.coldest < 8);
  return w;
}

export function isStale(w, now = Date.now()) {
  if (!w || w.manual) return false;
  return now - new Date(w.fetchedAt).getTime() > WEATHER_MAX_AGE_H * 3600e3;
}

export function weatherSummary(w) {
  if (!w) return 'Météo non renseignée';
  const t = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)} °C`);
  const parts = [`${t(w.tMin)} / ${t(w.tMax)}`];
  if (w.feelsMin !== null && !w.manual) parts.push(`ressenti ${t(w.feelsMin)} / ${t(w.feelsMax)}`);
  if (w.precip !== null) parts.push(w.manual ? (w.rain ? 'pluie prévue' : 'pas de pluie') : `pluie ${w.precip} mm${w.precipProb !== null ? ` (${w.precipProb} %)` : ''}`);
  if (w.wind !== null && !w.manual) parts.push(`vent ${Math.round(w.wind)} km/h`);
  return parts.join(' · ');
}
