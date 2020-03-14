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
  "rgb(251,188,3)"
];

export const createCompareGraph = (
  data: Array<{ label: string; data: Data[] }>
) => {
  const chart = new Chart(ctx, {
    type: "line",

    data: {
      labels: data
        .find(d => d.label === "Italia")!
        .data.map((_, i) => String(i + 1)),
      datasets: data.map((d, i) => ({
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
        intersect: false
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
