import * as Chart from "chart.js";
import { Data } from "./data";

Chart.defaults.global.animation!.duration = 0;

const chartElement = document.getElementById(
  "chart-compare"
) as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const colors = [
  "#505050",
  "rgb(234, 67, 53)",
  "rgb(51, 168, 83)",
  "rgb(66, 133, 244)",
  "rgb(251,188,3)",
  "#9D7ACD",
  "#AE8058",
  "#5f91c0",
  "#33FF57",
  "#F1923D",
  "#ababab"
];

export const createCompareGraph = (
  data: Array<{ label: string; data: Data[] }>
) => {
  const chart = new Chart(ctx, {
    type: "line",

    data: {
      labels: [
        ...new Array(data.find(d => d.label === "Italia")!.data.length),
        1,
        2,
        3
      ].map((_, i) => String(i + 1)),
      datasets: data
        .filter(d => d.data.length > 1)
        .map((d, i) => ({
          label: d.label,
          backgroundColor: "transparent",
          borderColor: colors[i],
          pointRadius: 0.1,
          borderWidth: i === 0 ? 2 : 1,
          yAxisID: "y-axis",
          data: d.data.map(p => p.value)
        }))
    },

    options: {
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
      }
    }
  });

  return chart;
};
