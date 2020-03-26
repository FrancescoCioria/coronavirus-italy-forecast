import * as queryString from "query-string";

const forecastElement = document.getElementById("forecast") as HTMLInputElement;
const filterElement = document.getElementById("filter") as HTMLSelectElement;
const filterDailyElement = document.getElementById(
  "filter-daily"
) as HTMLSelectElement;
const scaleElement = document.getElementById("scale") as HTMLSelectElement;

forecastElement.value = String(3);

export const updateUrlHash = (): void => {
  const query = {
    filter: filterElement.value,
    filterDaily: filterDailyElement.value,
    scale: scaleElement.value,
    forecast: parseInt(forecastElement.value)
  };

  location.hash = queryString.stringify(query);
};

export const getHash = (): {
  filter: "italy" | "france" | "spain" | "uk" | "netherlands" | "lombardy";
  filterDaily: "italy" | "france" | "spain" | "uk" | "netherlands" | "lombardy";
  scale: "linear" | "logarithmic";
  forecast: number;
} => {
  return queryString.parse(location.hash, { parseNumbers: true }) as any;
};

if (window.location.hash.length === 0) {
  updateUrlHash();
} else {
  const hash = getHash();

  forecastElement.value = String(hash.forecast) || "3";
  filterElement.value = hash.filter || "italy";
  filterDailyElement.value = hash.filterDaily || "italy";
  scaleElement.value = hash.scale || "linear";

  updateUrlHash();
}

filterElement.addEventListener("change", updateUrlHash);
filterDailyElement.addEventListener("change", updateUrlHash);
scaleElement.addEventListener("change", updateUrlHash);
forecastElement.addEventListener("change", updateUrlHash);
