import * as Chart from "chart.js";
import { Response, Country } from "./server";
const annotationPlugin = require("chartjs-plugin-annotation");

const chartElement = document.getElementById(
  "chart-compare"
) as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const colors: { [k in Country]: string } = {
  Italy: "#505050",
  France: "rgb(234, 67, 53)",
  Spain: "rgb(51, 168, 83)",
  Netherlands: "rgb(66, 133, 244)",
  China: "rgb(251,188,3)",
  "United Kingdom": "#9D7ACD",
  Germany: "#AE8058",
  "United States": "#5f91c0",
  "South Korea": "#33FF57",
  Belgium: "#F1923D",
  Switzerland: "pink"
};

const translateCountryToItalian: { [k in Country]: string } = {
  Italy: "Italia",
  "South Korea": "Corea del Sud",
  "United Kingdom": "UK",
  "United States": "USA",
  Belgium: "Belgio",
  China: "Cina",
  France: "Francia",
  Germany: "Germania",
  Netherlands: "Olanda",
  Spain: "Spagna",
  Switzerland: "Svizzera"
};

const lockdownAnnotation = (
  country: Country,
  countryISO: string | string[],
  day: number,
  yAdjust?: number
) => ({
  id: `vline${countryISO}`,
  type: "line",
  mode: "vertical",
  scaleID: "x-axis-0",
  value: day - 1,
  borderColor: colors[country],
  borderWidth: 1,
  label: {
    backgroundColor: colors[country],
    content: countryISO,
    enabled: true,
    position: "top",
    yAdjust: yAdjust || 10
  }
});

export const createCompareGraph = (data: Response["globalData"][]) => {
  new Chart(ctx, {
    type: "line",

    plugins: [annotationPlugin],

    data: {
      labels: [
        ...new Array(data.find(d => d[0].country === "Italy")!.length),
        1,
        2,
        3
      ].map((_, i) => String(i + 1)),
      datasets: data.map((d, i) => {
        const country = d[0].country;
        return {
          label: translateCountryToItalian[country] || country,
          backgroundColor: "transparent",
          borderColor: colors[country] || "#999",
          pointRadius: 0.1,
          borderWidth: i === 0 ? 2 : 1,
          yAxisID: "y-axis",
          data: d.map(p => p.value),
          hidden: !translateCountryToItalian[country]
        };
      })
    },

    options: {
      // responsive: false,
      maintainAspectRatio: false,
      tooltips: {
        mode: "x",
        intersect: false,
        position: "nearest"
      },
      scales: {
        yAxes: [
          {
            id: "y-axis",
            type: "logarithmic",
            ticks: {
              max: 100000,
              min: 10,
              callback: value => {
                return Math.log10(value) % 1 === 0
                  ? Number(value.toString())
                  : (null as any);
              }
            }
          }
        ]
      },
      elements: {
        line: {
          tension: 0
        }
      },
      ["annotation" as any]: {
        annotations: [
          lockdownAnnotation("Italy", "IT", 13),
          lockdownAnnotation("Italy", "IT-LB", 11, 50),
          lockdownAnnotation("Spain", "ES", 8),
          lockdownAnnotation("France", "FR", 10),
          lockdownAnnotation("United Kingdom", "UK", 11)
        ]
      }
    }
  });
};
