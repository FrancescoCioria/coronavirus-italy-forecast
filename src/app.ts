import * as Chart from "chart.js";
import { getData } from "./data";
import { createCompareGraph } from "./compare";
import groupBy = require("lodash/groupBy");
import values = require("lodash/values");
import { Response, Country, Data } from "./server";
import { getHash } from "./hash";
import { updateCumulativeGraph } from "./cumulative";
import { updateDailyGraph } from "./daily";

Chart.defaults.global.animation!.duration = 0;

const sliderElement = document.getElementById("slider") as HTMLInputElement;

let cumulativeChart: Chart | null = null;
let dailyChart: Chart | null = null;

const main = async () => {
  const data = await getData();

  const startNumberOfDeaths = 15;

  const italy = {
    label: "Italia",
    data: data.italianData.filter(d => d.value > startNumberOfDeaths)
  };

  const lombardy = {
    label: "Lombardia",
    data: data.regionalData.filter(
      d => d.region === "Lombardia" && d.value > startNumberOfDeaths
    )
  };

  const getDataForCountry = (country: Country): Response["globalData"] =>
    data.globalData.filter(
      d => d.country === country && d.value > startNumberOfDeaths
    );

  // CUMULATIVE
  const updateCumulativeChart = () => {
    const filteredData = ((): Data[] => {
      switch (getHash().filter) {
        case "italy":
          return italy.data;
        case "france":
          return getDataForCountry("France");
        case "spain":
          return getDataForCountry("Spain");
        case "uk":
          return getDataForCountry("United Kingdom");
        case "netherlands":
          return getDataForCountry("Netherlands");
        // case "germany":
        //   return germany.data;
        case "lombardy":
          return lombardy.data;
      }
    })()!;

    updateCumulativeGraph(filteredData);
  };

  sliderElement.addEventListener("input", updateCumulativeChart);

  window.onhashchange = () => {
    updateCumulativeChart();
  };

  updateCumulativeChart();

  // DAILY

  const updateDailyChart = () => {
    const filteredData = ((): Data[] => {
      switch (getHash().filterDaily) {
        case "italy":
          return italy.data;
        case "france":
          return getDataForCountry("France");
        case "spain":
          return getDataForCountry("Spain");
        case "uk":
          return getDataForCountry("United Kingdom");
        case "netherlands":
          return getDataForCountry("Netherlands");
        // case "germany":
        //   return germany.data;
        case "lombardy":
          return lombardy.data;
      }
    })()!;

    updateDailyGraph(filteredData);
  };

  window.onhashchange = () => {
    updateDailyChart();
  };

  updateDailyChart();

  // COMPARE

  createCompareGraph(
    values(groupBy(data.globalData, "country"))
      .map(countryData =>
        countryData.filter(v => v.value >= startNumberOfDeaths)
      )
      .filter(countryData => countryData.length >= 3)
      .sort((a, b) => {
        return b[b.length - 1].value - a[a.length - 1].value;
      })
  );
};

main();
