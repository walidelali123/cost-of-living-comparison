const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "data.js");

function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function flagFromCode(code = "") {
  if (!code) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))
    .map((v) => String.fromCodePoint(v))
    .join("");
}

function findCostValue(costs, keywords) {
  if (!Array.isArray(costs)) return null;

  const target = keywords.map(normalizeText);

  for (const item of costs) {
    const text = normalizeText(item.item || item.name || item.label || item.category || "");
    const value = item.average_price ?? item.cost ?? item.price ?? item.value ?? item.amount ?? null;

    if (value == null) continue;

    const match = target.some((term) => text.includes(term) || term.includes(text));
    if (match) {
      return Number(value);
    }
  }

  return null;
}

function extractCityValues(payload) {
  if (!payload || typeof payload !== "object") return null;

  const costs = Array.isArray(payload.costs) ? payload.costs : [];
  const values = {
    rent: findCostValue(costs, ["rent", "apartment", "housing"]),
    food: findCostValue(costs, ["groceries", "food", "restaurant"]),
    transport: findCostValue(costs, ["transport", "transportation", "public transport"]),
    utilities: findCostValue(costs, ["utilities", "electricity", "internet", "water"]),
    fun: findCostValue(costs, ["entertainment", "recreation", "leisure", "nightlife"]),
  };

  const hasAny = Object.values(values).some((v) => Number(v) > 0);

  if (!hasAny) return null;

  return values;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

async function getCountryList() {
  const url = "https://restcountries.com/v3.1/all?fields=capital,region,name,cca2";
  const data = await fetchJson(url);
  return Array.isArray(data) ? data : [];
}

async function buildCityList() {
  const countries = await getCountryList();
  const cities = [];

  for (const country of countries) {
    const capital = country.capital && country.capital[0];
    if (!capital) continue;

    const slug = slugify(capital);
    const endpoint = `https://api.teleport.org/api/urban_areas/slug:${slug}/cost_of_living/`;
    const payload = await fetchJson(endpoint);

    const costValues = extractCityValues(payload);

    if (!costValues) continue;

    cities.push({
      name: capital,
      region: country.region || "Other",
      country: country.name?.common || country.name?.official || "Unknown",
      flag: flagFromCode(country.cca2),
      ...costValues,
    });
  }

  return cities;
}

async function main() {
  const cities = await buildCityList();

  const content = fs.readFileSync(DATA_PATH, "utf8");
  const startMarker = "const LOCAL_CITIES =";
  const start = content.indexOf(startMarker);
  const end = content.indexOf("];", start);

  if (start === -1 || end === -1) {
    throw new Error("Could not find LOCAL_CITIES array in data.js");
  }

  const replacement = `const LOCAL_CITIES = ${JSON.stringify(cities, null, 2)};`;

  const updated = content.slice(0, start) + replacement + content.slice(end + 2);

  fs.writeFileSync(DATA_PATH, updated, "utf8");
  console.log(`Updated ${cities.length} cities.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
