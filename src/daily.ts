import * as regression from "regression";
import * as Chart from "chart.js";
import { Data } from "./server";
import { getHash } from "./hash";

const chartElement = document.getElementById(
  "chart-daily"
) as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const chart = new Chart(ctx, {
  type: "line",

  options: {
    tooltips: {
      mode: "x",
      intersect: false,
      position: "nearest"
    },
    elements: {
      line: {
        tension: 0
      }
    }
  }
});

export const updateDailyGraph = (data: Array<Data>) => {
  const getLabels = () => {
    return [...new Array(data.length + getHash().forecast)].map((_, i) => {
      const firstDate = new Date(data[0].date.slice(0, 10));
      firstDate.setDate(firstDate.getDate() + i);

      const currentDate = firstDate;

      return `${currentDate.getDate()} ${currentDate.toLocaleString("default", {
        month: "short"
      })}`;
    });
  };

  chart.data = {
    labels: getLabels(),
    datasets: [
      {
        label: "Nº morti giornaliero",
        backgroundColor: "rgba(80, 80, 80, 0.2)",
        borderColor: "rgb(80, 80, 80)",
        pointRadius: 2,
        data: data.map((d, i) => (i === 0 ? 0 : d.value - data[i - 1].value))
      }
    ]
  };

  chart.update({ duration: 600 });
};
