# Weather Dashboard

A responsive weather app built with plain HTML, CSS and JavaScript. It uses the free
[Open-Meteo](https://open-meteo.com/) API (no API key needed).

**Live demo:** _add your Vercel / Netlify link here_

## Features
- Search by city (button or Enter key)
- Current temperature, condition, wind speed and humidity
- 5-day forecast
- Loading message and friendly errors (empty input, city not found, HTTP errors, no internet)
- °C / °F switch (remembered)
- Dark / Light mode (remembered in localStorage)
- Recent searches as clickable chips (localStorage)
- Background colour changes with the weather
- Responsive: cards in a row on laptop, stacked on phone

## How it works
1. `getWeather()` calls the geocoding endpoint to turn a city name into latitude/longitude.
2. It then calls the forecast endpoint with those coordinates.
3. `fetchJSON()` checks `response.ok` and throws an error with the HTTP status.
4. `displayWeather()` builds the cards using DOM methods; `showError()` shows messages.

## Concepts practised
async/await, Promises, try/catch/finally, Fetch API, HTTP status codes, JSON,
template strings, arrow functions, destructuring, optional chaining, DOM creation, localStorage, Flexbox.

## Run locally
Open `index.html` in a browser (or use the VS Code Live Server extension).
