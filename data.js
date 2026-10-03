// All data access and API calls happen here
// app.js never fetches directly

const CATEGORIES = [
  ["rent", "Rent"],
  ["food", "Food"],
  ["transport", "Transport"],
  ["utilities", "Utilities"],
  ["fun", "Entertainment"]
];

const LOCAL_CITIES = [
  { name: "Stockholm", region: "Europe", country: "Sweden", flag: "🇸🇪", rent: 1450, food: 520, transport: 85, utilities: 130, fun: 240 },
  { name: "Berlin", region: "Europe", country: "Germany", flag: "🇩🇪", rent: 1300, food: 430, transport: 90, utilities: 260, fun: 220 },
  { name: "London", region: "Europe", country: "United Kingdom", flag: "🇬🇧", rent: 2700, food: 560, transport: 200, utilities: 210, fun: 300 },
  { name: "Lisbon", region: "Europe", country: "Portugal", flag: "🇵🇹", rent: 1500, food: 380, transport: 50, utilities: 120, fun: 190 },
  { name: "Paris", region: "Europe", country: "France", flag: "🇫🇷", rent: 1800, food: 480, transport: 70, utilities: 140, fun: 280 },
  { name: "Amsterdam", region: "Europe", country: "Netherlands", flag: "🇳🇱", rent: 1900, food: 520, transport: 110, utilities: 150, fun: 260 },
  { name: "Barcelona", region: "Europe", country: "Spain", flag: "🇪🇸", rent: 1400, food: 420, transport: 75, utilities: 100, fun: 200 },
  { name: "New York", region: "North America", country: "United States", flag: "🇺🇸", rent: 4100, food: 700, transport: 132, utilities: 180, fun: 350 },
  { name: "Los Angeles", region: "North America", country: "United States", flag: "🇺🇸", rent: 3200, food: 650, transport: 120, utilities: 160, fun: 320 },
  { name: "Toronto", region: "North America", country: "Canada", flag: "🇨🇦", rent: 2300, food: 520, transport: 115, utilities: 150, fun: 260 },
  { name: "Mexico City", region: "North America", country: "Mexico", flag: "🇲🇽", rent: 900, food: 300, transport: 40, utilities: 70, fun: 140 },
  { name: "Tokyo", region: "Asia", country: "Japan", flag: "🇯🇵", rent: 1250, food: 450, transport: 80, utilities: 140, fun: 210 },
  { name: "Bangkok", region: "Asia", country: "Thailand", flag: "🇹🇭", rent: 600, food: 260, transport: 45, utilities: 90, fun: 130 },
  { name: "Singapore", region: "Asia", country: "Singapore", flag: "🇸🇬", rent: 2100, food: 380, transport: 120, utilities: 110, fun: 240 },
  { name: "Hong Kong", region: "Asia", country: "Hong Kong", flag: "🇭🇰", rent: 2800, food: 420, transport: 145, utilities: 100, fun: 280 },
  { name: "Sydney", region: "Oceania", country: "Australia", flag: "🇦🇺", rent: 2600, food: 600, transport: 140, utilities: 170, fun: 280 },
  { name: "Melbourne", region: "Oceania", country: "Australia", flag: "🇦🇺", rent: 2400, food: 580, transport: 130, utilities: 160, fun: 260 },
  { name: "Dubai", region: "Middle East", country: "United Arab Emirates", flag: "🇦🇪", rent: 2400, food: 500, transport: 100, utilities: 120, fun: 250 },
  { name: "Istanbul", region: "Europe/Asia", country: "Turkey", flag: "🇹🇷", rent: 800, food: 280, transport: 35, utilities: 60, fun: 120 },
  { name: "São Paulo", region: "South America", country: "Brazil", flag: "🇧🇷", rent: 1200, food: 380, transport: 55, utilities: 100, fun: 180 },
  { name: "Buenos Aires", region: "South America", country: "Argentina", flag: "🇦🇷", rent: 1000, food: 320, transport: 45, utilities: 90, fun: 150 },
  { name: "Chiang Mai", region: "Asia", country: "Thailand", flag: "🇹🇭", rent: 400, food: 180, transport: 25, utilities: 60, fun: 80 },
  { name: "Manila", region: "Asia", country: "Philippines", flag: "🇵🇭", rent: 500, food: 220, transport: 30, utilities: 70, fun: 100 },
  { name: "Mumbai", region: "Asia", country: "India", flag: "🇮🇳", rent: 700, food: 250, transport: 40, utilities: 80, fun: 110 }
];

// Normalize text for searching (lowercase, remove special chars)
function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Load all city data: use local data only
async function loadAllCityData() {
  const cityEntries = LOCAL_CITIES.map((city) => [
    city.name,
    {
      rent: city.rent,
      food: city.food,
      transport: city.transport,
      utilities: city.utilities,
      fun: city.fun,
      source: "Local dataset",
      date: "Always current"
    }
  ]);

  return Object.fromEntries(cityEntries);
}

// Get cities grouped by region, filtered by search query
function searchCities(query = "") {
  const normalized = normalizeText(query);
  const grouped = {};

  LOCAL_CITIES.forEach(city => {
    const matchesName = normalizeText(city.name).includes(normalized);
    const matchesCountry = normalizeText(city.country).includes(normalized);
    const matchesRegion = normalizeText(city.region).includes(normalized);

    if (matchesName || matchesCountry || matchesRegion) {
      if (!grouped[city.region]) grouped[city.region] = [];
      grouped[city.region].push(city);
    }
  });

  return grouped;
}

// Get popular cities (first 5 in our list)
function getPopularCities() {
  const grouped = {};
  const popular = LOCAL_CITIES.slice(0, 5);
  popular.forEach(city => {
    if (!grouped[city.region]) grouped[city.region] = [];
    grouped[city.region].push(city);
  });
  return grouped;
}

// Exchange rates from Frankfurter API (CORS enabled)
const API_FRANKFURTER = "https://api.frankfurter.dev/v1";
let cachedRates = { USD: 1 };

async function loadExchangeRates() {
  try {
    const response = await fetch(`${API_FRANKFURTER}/latest?base=USD`);
    if (!response.ok) throw new Error("Failed to fetch rates");
    const data = await response.json();
    cachedRates = { USD: 1, ...data.rates };
    return cachedRates;
  } catch (error) {
    console.warn("Could not load live exchange rates, using USD only:", error);
    return { USD: 1 };
  }
}

function getExchangeRates() {
  return cachedRates;
}

// Load 12-month exchange rate trend for chart
async function loadExchangeTrend(currency) {
  if (currency === "USD") {
    return null; // No trend for USD
  }

  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);

    const formatDate = (d) => d.toISOString().slice(0, 10);
    const response = await fetch(
      `${API_FRANKFURTER}/${formatDate(start)}..${formatDate(end)}?base=USD&symbols=${currency}`
    );

    if (!response.ok) throw new Error("Failed to fetch trend");
    const data = await response.json();
    const points = Object.entries(data.rates).map(([date, rates]) => ({
      date,
      value: rates[currency]
    }));
    return points;
  } catch (error) {
    console.warn("Could not load exchange trend:", error);
    return null;
  }
}

// localStorage access with error handling
function loadSavedComparisons() {
  try {
    const stored = localStorage.getItem("col-saved");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Could not read saved comparisons from localStorage:", error);
    return [];
  }
}

function saveSavedComparisons(list) {
  try {
    localStorage.setItem("col-saved", JSON.stringify(list));
    return true;
  } catch (error) {
    console.warn("Could not save comparisons to localStorage:", error);
    return false;
  }
}
