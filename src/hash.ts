import * as queryString from "query-string";

const forecastElement = document.getElementById("forecast") as HTMLInputElement;
const filterCumulativeElement = document.getElementById(
  "filter-cumulative"
) as HTMLSelectElement;
const filterDailyElement = document.getElementById(
  "filter-daily"
) as HTMLSelectElement;
const scaleElement = document.getElementById("scale") as HTMLSelectElement;

forecastElement.value = String(3);

export type FilterCountry =
  | "italy"
  | "france"
  | "spain"
  | "uk"
  | "netherlands"
  | "lombardy"
  | "germany"
  | "usa";

const filterCountry: { [k in FilterCountry]: string } = {
  italy: "Italia",
  lombardy: "Lombardia",
  france: "Francia",
  spain: "Spagna",
  uk: "UK",
  netherlands: "Olanda",
  germany: "Germania",
  usa: "USA"
};

const keys = Object.keys(filterCountry) as FilterCountry[];

const filterOptions = keys
  .map(key => {
    return `<option value="${key}">${filterCountry[key]}</option>`;
  })
  .join("\n");

filterCumulativeElement.innerHTML = filterOptions;
filterDailyElement.innerHTML = filterOptions;

export const updateUrlHash = (): void => {
  const query = {
    filterCumulative: filterCumulativeElement.value,
    filterDaily: filterDailyElement.value,
    scale: scaleElement.value,
    forecast: parseInt(forecastElement.value)
  };

  location.hash = queryString.stringify(query);
};

export const getHash = (): {
  filterCumulative: FilterCountry;
  filterDaily: FilterCountry;
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
  filterCumulativeElement.value = hash.filterCumulative || "italy";
  filterDailyElement.value = hash.filterDaily || "italy";
  scaleElement.value = hash.scale || "linear";

  updateUrlHash();
}

filterCumulativeElement.addEventListener("change", updateUrlHash);
filterDailyElement.addEventListener("change", updateUrlHash);
scaleElement.addEventListener("change", updateUrlHash);
forecastElement.addEventListener("change", updateUrlHash);
