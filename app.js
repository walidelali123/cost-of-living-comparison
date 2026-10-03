// Main app logic: reads from data.js, renders to UI

let cityData = {};
let rates = { USD: 1 };

const $ = (id) => document.getElementById(id);
const fmt = (v, cur) => new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);
const total = (cityName) => CATEGORIES.reduce((sum, [key]) => sum + (cityData[cityName]?.[key] || 0), 0);

// Show error toast at bottom right
function showError(message) {
  const toast = $("error-toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 5000);
}

// Create and return a city picker element for City A or City B
function createCityPicker(pickerId, defaultCityName) {
  const picker = $(pickerId);
  const region = pickerId === "pickerA" ? "A" : "B";

  // Hidden element to store selected city name
  const valueEl = document.createElement("span");
  valueEl.id = `value${region}`;
  valueEl.style.display = "none";
  valueEl.textContent = defaultCityName;
  picker.appendChild(valueEl);

  // Search input
  const input = document.createElement("input");
  input.type = "text";
  input.className = "city-input";
  input.placeholder = "Search cities...";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-label", `Search for ${pickerId === "pickerA" ? "City A" : "City B"}`);
  picker.appendChild(input);

  // Dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "city-dropdown";
  picker.appendChild(dropdown);

  function renderDropdown(results) {
    if (Object.keys(results).length === 0) {
      dropdown.innerHTML = '<div style="padding:14px;color:var(--muted);text-align:center">No cities found</div>';
      dropdown.classList.add("open");
      return;
    }

    let html = "";
    const regionOrder = ["Europe", "North America", "South America", "Asia", "Oceania", "Middle East", "Europe/Asia"];

    regionOrder.forEach((r) => {
      if (results[r]) {
        html += `<div class="city-dropdown-section">
          <div class="city-section-label">${r}</div>
          ${results[r]
            .map(
              (city) => `
            <button class="city-option" type="button" data-city="${city.name}" aria-label="Select ${city.name}, ${city.country}">
              <span class="city-option-flag">${city.flag}</span>
              <div class="city-option-text">
                <div class="city-option-name">${city.name}</div>
                <div class="city-option-country">${city.country}</div>
              </div>
            </button>
          `
            )
            .join("")}
        </div>`;
      }
    });

    dropdown.innerHTML = html;
    dropdown.classList.add("open");

    // Attach click handlers
    dropdown.querySelectorAll(".city-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const city = btn.dataset.city;
        selectCity(region, city);
      });
    });
  }

  function selectCity(r, city) {
    input.value = city;
    valueEl.textContent = city;
    dropdown.classList.remove("open");
    render();
  }

  // On input, search
  input.addEventListener("input", (e) => {
    const query = e.target.value;
    if (query === "") {
      // Show popular cities
      const popular = getPopularCities();
      renderDropdown(popular);
    } else {
      // Search for matching cities
      const results = searchCities(query);
      renderDropdown(results);
    }
  });

  // On focus, show popular cities if empty
  input.addEventListener("focus", () => {
    if (input.value === "") {
      const popular = getPopularCities();
      renderDropdown(popular);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Set initial value
  input.value = defaultCityName;
}

// Render the comparison view
function render() {
  const cityA = $("valueA").textContent;
  const cityB = $("valueB").textContent;
  const cur = $("cur").value;
  const rate = rates[cur] || 1;

  $("nameA").textContent = cityA;
  $("nameB").textContent = cityB;

  // Display source info
  const dataA = cityData[cityA];
  const dataB = cityData[cityB];
  $("sourceA").textContent = dataA ? `${dataA.source} • ${dataA.date}` : "";
  $("sourceB").textContent = dataB ? `${dataB.source} • ${dataB.date}` : "";

  // Calculate totals
  const totalA = total(cityA) * rate;
  const totalB = total(cityB) * rate;
  $("totA").textContent = fmt(totalA, cur);
  $("totB").textContent = fmt(totalB, cur);

  // Verdict
  if (cityA === cityB) {
    $("verdict").textContent = "Choose two different cities to compare.";
  } else {
    const cheaper = totalA < totalB ? cityA : cityB;
    const pct = Math.abs(totalA - totalB) / Math.max(totalA, totalB) * 100;
    $("verdict").textContent = `${cheaper} is about ${pct.toFixed(0)}% cheaper per month.`;
  }

  // Category breakdown
  const max = Math.max(...CATEGORIES.map(([key]) => Math.max(cityData[cityA]?.[key] || 0, cityData[cityB]?.[key] || 0))) * rate;
  $("rows").innerHTML = CATEGORIES.map(([key, label]) => {
    const valA = (cityData[cityA]?.[key] || 0) * rate;
    const valB = (cityData[cityB]?.[key] || 0) * rate;
    return `<div class="row">
      <strong>${label}</strong>
      <div class="bars">
        <div class="bar a">
          <div class="bar-track"><i style="width:${max ? (valA / max) * 100 : 0}%"></i></div>
          <span>${fmt(valA, cur)}</span>
        </div>
        <div class="bar b">
          <div class="bar-track"><i style="width:${max ? (valB / max) * 100 : 0}%"></i></div>
          <span>${fmt(valB, cur)}</span>
        </div>
      </div>
    </div>`;
  }).join("");

  renderSaved();
}

// Render the exchange rate trend chart
async function renderTrend(currency) {
  const el = $("trend");
  const note = $("trendNote");

  if (currency === "USD") {
    el.innerHTML = "";
    note.textContent = "Costs are stored in USD. Choose another currency to see its trend against the dollar.";
    return;
  }

  const trend = await loadExchangeTrend(currency);

  if (!trend || trend.length === 0) {
    el.innerHTML = "";
    note.textContent = "Trend data could not be loaded.";
    return;
  }

  // Build SVG chart
  const vals = trend.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const W = 700,
    H = 220,
    P = 30;
  const x = (i) => P + (i * (W - 2 * P)) / (trend.length - 1);
  const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const path = trend.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="1 USD in ${currency} over 12 months">
    <path d="${path}" fill="none" stroke="var(--a)" stroke-width="2.8"/>
    <text x="${P}" y="16" fill="var(--muted)" font-size="12">high ${max.toFixed(2)}</text>
    <text x="${P}" y="${H - 6}" fill="var(--muted)" font-size="12">low ${min.toFixed(2)}</text>
  </svg>`;
  note.textContent = `1 USD in ${currency}, ${trend[0].date} to ${trend[trend.length - 1].date}.`;
}

// Render saved comparisons
function renderSaved() {
  const list = loadSavedComparisons();
  $("saved").innerHTML = list.length
    ? list
        .map(
          (s, i) => `<div class="chip">
        <button class="load-btn" type="button" data-load="${i}" aria-label="Load comparison: ${s.a} vs ${s.b} in ${s.cur}">${s.a} vs ${s.b} (${s.cur})</button>
        <button class="del-btn" type="button" data-del="${i}" aria-label="Delete this comparison">×</button>
      </div>`
        )
        .join("")
    : '<span class="empty-note">Nothing saved yet.</span>';
}

// Load a saved comparison
function loadSavedComparison(index) {
  const list = loadSavedComparisons();
  const s = list[index];
  if (!s) return;
  $("valueA").textContent = s.a;
  $("valueB").textContent = s.b;
  $("cur").value = s.cur;
  document.querySelector("#pickerA .city-input").value = s.a;
  document.querySelector("#pickerB .city-input").value = s.b;
  render();
  renderTrend(s.cur);
}

// Delete a saved comparison
function deleteSavedComparison(index) {
  const list = loadSavedComparisons();
  list.splice(index, 1);
  saveSavedComparisons(list);
  renderSaved();
}

// Save current comparison
function saveCurrentComparison() {
  const cityA = $("valueA").textContent;
  const cityB = $("valueB").textContent;
  const cur = $("cur").value;
  const s = { a: cityA, b: cityB, cur };

  const list = loadSavedComparisons();
  if (!list.some((x) => x.a === s.a && x.b === s.b && x.cur === s.cur)) {
    list.push(s);
    if (saveSavedComparisons(list)) {
      renderSaved();
    } else {
      showError("Could not save comparison");
    }
  }
}

// Attach event listeners
$("saved").addEventListener("click", (e) => {
  const loadIdx = e.target.dataset.load;
  const delIdx = e.target.dataset.del;
  if (loadIdx !== undefined) {
    loadSavedComparison(parseInt(loadIdx));
  } else if (delIdx !== undefined) {
    deleteSavedComparison(parseInt(delIdx));
  }
});

$("save").addEventListener("click", saveCurrentComparison);

// On currency change, update display and trend
$("cur").addEventListener("change", () => {
  render();
  renderTrend($("cur").value);
});

// Initialize the app
async function init() {
  try {
    cityData = await loadAllCityData();
  } catch (error) {
    showError("Could not load city data");
    console.error("Error loading city data:", error);
  }

  try {
    rates = await loadExchangeRates();
  } catch (error) {
    showError("Could not load exchange rates");
    console.error("Error loading exchange rates:", error);
  }

  // Populate currency selector
  const currencyList = Object.keys(rates).sort();
  $("cur").innerHTML = currencyList.map((c) => `<option ${c === "USD" ? "selected" : ""}>${c}</option>`).join("");

  // Create city pickers
  createCityPicker("pickerA", "New York");
  createCityPicker("pickerB", "London");

  // Initial render
  render();
  renderTrend("USD");
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
