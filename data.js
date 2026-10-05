// All data access and API calls happen here
// app.js never fetches directly

const CATEGORIES = [
  ["rent", "Rent"],
  ["food", "Food"],
  ["transport", "Transport"],
  ["utilities", "Utilities"],
  ["fun", "Entertainment"]
];

const LOCAL_CITIES = [];

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
