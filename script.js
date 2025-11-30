const icons = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "⛈️", 71: "❄️", 73: "❄️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️", 95: "⛈️", 96: "⛈️", 99: "⛈️" };

function getGradient(weatherCode) {
  // sunny
  if (weatherCode >= 0 && weatherCode <= 1) {
    return 'linear-gradient(135deg, #FFD700, #FF8C00)';
  }
  // cloudy
  else if (weatherCode >= 2 && weatherCode <= 3) {
    return 'linear-gradient(135deg, #B0C4DE, #708090)';
  }
  // foggy
  else if (weatherCode >= 45 && weatherCode <= 48) {
    return 'linear-gradient(135deg, #A9A9A9, #696969)';
  }
  // rainy
  else if ((weatherCode >= 51 && weatherCode <= 55) || (weatherCode >= 61 && weatherCode <= 65) || (weatherCode >= 80 && weatherCode <= 82)) {
    return 'linear-gradient(135deg, #4682B4, #2F4F4F)';
  }
  // thunderstorm
  else if (weatherCode >= 95 && weatherCode <= 99) {
    return 'linear-gradient(135deg, #4B0082, #191970)';
  }
  // snow
  else if (weatherCode >= 71 && weatherCode <= 75) {
    return 'linear-gradient(135deg, #87CEEB, #F0F8FF)';
  }
  // default
  else {
    return 'linear-gradient(135deg, #667eea, #764ba2)';
  }
}

async function fetchWeather(lat, lon, cityName, changeBackground = true) {
  try {
    document.getElementById("error").textContent = "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=8`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5&timezone=auto`;

    const [weatherRes, aqiRes] = await Promise.all([
      fetch(url),
      fetch(aqiUrl)
    ]);

    if (!weatherRes.ok) throw new Error("Failed to fetch weather");
    if (!aqiRes.ok) throw new Error("Failed to fetch AQI");

    const weatherData = await weatherRes.json();
    const aqiData = await aqiRes.json();

    const c = weatherData.current;
    const aqi = aqiData.current;

    const sunriseTime = new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(weatherData.daily.sunset[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (changeBackground) {
      document.body.style.background = getGradient(c.weather_code);
    }
    document.getElementById("currentWeather").innerHTML = `
    <div class="weather-left">
        <h3>${cityName}</h3>
        <div class="icon">${icons[c.weather_code] || "❓"}</div>
        <div class="temp-big">${c.temperature_2m}°C</div>
        
        <div class="humidity">
        <p><b>Wind:</b> ${c.wind_speed_10m} km/h</p>
        <p><b>Sunrise:</b> ${sunriseTime}</p>
        </div>
        <div class="humidity">
          <p><b>Humidity:</b> ${c.relative_humidity_2m}%</p>
          <p><b>Sunset:</b> ${sunsetTime}</p>
        </div>
        <div class="aqi-block">
            <h4>Air Quality</h4>
            <p>AQI: ${aqi.us_aqi}</p>
            <p>PM2.5: ${aqi.pm2_5} µg/m³</p>
        </div>
        <div>
        <h4></div>
    </div>
    <div class="weather-right">
        <div class="tomorrow-box">
            <h4>Tomorrow</h4>
            <div class="icon">${icons[weatherData.daily.weather_code[1]] || "❓"}</div>
            <p>${weatherData.daily.temperature_2m_max[1]}°/${weatherData.daily.temperature_2m_min[1]}°</p>
        </div>
        <div class="forecast-grid">
            ${weatherData.daily.time.slice(2, 9).map((day, i) => `
                <div class="forecast-item">
                    <h4>${new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}</h4>
                    <div class="icon">${icons[weatherData.daily.weather_code[i + 2]] || "❓"}</div>
                    <p>${weatherData.daily.temperature_2m_max[i + 2]}°/${weatherData.daily.temperature_2m_min[i + 2]}°</p>
                </div>
            `).join('')}
        </div>
    </div>
`;
  } catch (e) {
    document.getElementById("error").textContent = e.message;
  }
}
async function showSuggestions(query) {
  const box = document.getElementById("suggestions");
  if (query.length < 2) { box.style.display = "none"; return; }
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10`);
    const j = await geo.json();
    if (!j.results) { box.style.display = "none"; return; }
    box.innerHTML = "";
    j.results.forEach(r => {
      const div = document.createElement("div");
      const displayName = `${r.name}${r.admin1 ? ", " + r.admin1 : ""}, ${r.country}`;
      div.textContent = displayName;
      div.onclick = () => {
        document.getElementById("cityInput").value = r.name;
        fetchWeather(r.latitude, r.longitude, r.name);
        box.style.display = "none";
      };
      box.appendChild(div);
    });
    box.style.display = "block";
  }
  catch (e) { box.style.display = "none"; }
}

async function searchCity() {
  const city = document.getElementById("cityInput").value;
  if (!city) return;
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const j = await geo.json();
    if (!j.results || j.results.length === 0) { document.getElementById("error").textContent = "City not found"; return; }
    const p = j.results[0];
    fetchWeather(p.latitude, p.longitude, p.name);
  } catch (e) { document.getElementById("error").textContent = "Failed to find city"; }
}

function useMyLocation() {
  if (!navigator.geolocation) { document.getElementById("error").textContent = "Geolocation not supported"; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    fetchWeather(pos.coords.latitude, pos.coords.longitude, "My Location");
  }, err => { document.getElementById("error").textContent = err.message; });
}

fetchWeather(12.8443, 77.6559, "Scaler's School Of Technology", false);
