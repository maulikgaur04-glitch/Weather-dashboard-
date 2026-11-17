"use strict";

// ---------- Config ----------
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const RECENT_KEY = "recentCities";
const THEME_KEY = "theme";
const UNIT_KEY = "unit";

// Weather code -> [description, emoji, background mood]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️", "clear"], 1: ["Mostly clear", "🌤️", "clear"],
  2: ["Partly cloudy", "⛅", "cloudy"], 3: ["Overcast", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "cloudy"], 48: ["Fog", "🌫️", "cloudy"],
  51: ["Light drizzle", "🌦️", "rain"], 53: ["Drizzle", "🌦️", "rain"], 55: ["Heavy drizzle", "🌧️", "rain"],
  61: ["Light rain", "🌧️", "rain"], 63: ["Rain", "🌧️", "rain"], 65: ["Heavy rain", "🌧️", "rain"],
  71: ["Light snow", "🌨️", "snow"], 73: ["Snow", "❄️", "snow"], 75: ["Heavy snow", "❄️", "snow"],
  80: ["Rain showers", "🌦️", "rain"], 81: ["Rain showers", "🌧️", "rain"], 82: ["Violent showers", "🌧️", "rain"],
  95: ["Thunderstorm", "⛈️", "storm"], 96: ["Thunderstorm with hail", "⛈️", "storm"], 99: ["Thunderstorm with hail", "⛈️", "storm"],
};
const describe = (code) => WEATHER_CODES[code] ?? ["Unknown", "🌡️", "clear"];

// ---------- State & DOM ----------
let lastData = null;                       // stored in °C so we can switch units without refetching
let unit = localStorage.getItem(UNIT_KEY) || "C";

const $ = (selector) => document.querySelector(selector);
const cityInput = $("#cityInput");

// Small helper to build elements safely (textContent, not innerHTML)
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---------- 1. FETCH ----------
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }
  return response.json();
}

async function getWeather(city) {
  const geo = await fetchJSON(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1`);
  if (!geo.results?.length) throw new ApiError("City not found", 404);

  const { latitude, longitude, name, country, admin1 } = geo.results[0];
  const params = new URLSearchParams({
    latitude, longitude, timezone: "auto", forecast_days: 5,
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  });
  const weather = await fetchJSON(`${FORECAST_URL}?${params}`);
  return { place: [name, admin1, country].filter(Boolean).join(", "), ...weather };
}

// ---------- 2. DISPLAY ----------
const toUnit = (c) => Math.round(unit === "C" ? c : (c * 9) / 5 + 32);

function makeCard(icon, value, label) {
  const card = el("article", "card");
  card.append(el("div", "icon", icon), el("div", "value", value), el("div", "label", label));
  return card;
}

function displayWeather({ place, current, daily }) {
  const [condition, icon, mood] = describe(current.weather_code);
  document.body.dataset.weather = mood;
  $("#place").textContent = place;

  $("#current").replaceChildren(
    makeCard(icon, `${toUnit(current.temperature_2m)}°${unit}`, condition),
    makeCard("💨", `${current.wind_speed_10m} km/h`, "Wind speed"),
    makeCard("💧", `${current.relative_humidity_2m}%`, "Humidity"),
  );

  const days = daily.time.map((date, i) => {
    const [, dayIcon, ] = describe(daily.weather_code[i]);
    const weekday = new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
    const card = el("article", "card");
    const temps = el("div", "temps", `${toUnit(daily.temperature_2m_max[i])}° `);
    temps.append(el("span", "", `${toUnit(daily.temperature_2m_min[i])}°`));
    card.append(el("div", "label", i === 0 ? "Today" : weekday), el("div", "icon", dayIcon), temps,
      el("div", "label", describe(daily.weather_code[i])[0]));
    return card;
  });
  $("#forecast").replaceChildren(...days);
  $("#result").hidden = false;
}

// ---------- 3. ERRORS & LOADING ----------
function showError(message) {
  $("#result").hidden = true;
  $("#error").textContent = message;
  $("#error").hidden = false;
}

const clearError = () => { $("#error").hidden = true; };
const setLoading = (isLoading) => {
  $("#loading").hidden = !isLoading;
  $("#searchBtn").disabled = isLoading;
};

function friendlyMessage(error) {
  if (error instanceof ApiError && error.status === 404) return "We couldn't find that city. Check the spelling and try again.";
  if (error instanceof ApiError) return `The weather service had a problem (status ${error.status}). Please try again later.`;
  if (error instanceof TypeError) return "No internet connection. Check your network and try again.";
  return "Something went wrong. Please try again.";
}

// ---------- 4. MAIN FLOW ----------
async function searchCity(city = cityInput.value) {
  city = city.trim();
  clearError();
  if (!city) return showError("Please type a city name first.");

  setLoading(true);
  $("#result").hidden = true;
  try {
    lastData = await getWeather(city);
    displayWeather(lastData);
    saveRecent(city);
  } catch (error) {
    console.error(error);
    showError(friendlyMessage(error));
  } finally {
    setLoading(false);
  }
}

// ---------- 5. EXTRAS: recent searches, unit, theme ----------
const loadRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");

function renderRecent() {
  const chips = loadRecent().map((city) => {
    const chip = el("button", "chip", city);
    chip.addEventListener("click", () => { cityInput.value = city; searchCity(city); });
    return chip;
  });
  $("#recent").replaceChildren(...chips);
}

function saveRecent(city) {
  const list = [city, ...loadRecent().filter((c) => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  renderRecent();
}

function toggleUnit() {
  unit = unit === "C" ? "F" : "C";
  localStorage.setItem(UNIT_KEY, unit);
  $("#unitBtn").textContent = `°${unit}`;
  if (lastData) displayWeather(lastData);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ?? (prefersDark ? "dark" : "light"));
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// ---------- Events ----------
$("#searchBtn").addEventListener("click", () => searchCity());
cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchCity(); });
$("#unitBtn").addEventListener("click", toggleUnit);
$("#themeBtn").addEventListener("click", toggleTheme);

initTheme();
$("#unitBtn").textContent = `°${unit}`;
renderRecent();
