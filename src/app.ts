import * as regression from "regression";
import * as Chart from "chart.js";
import { getData, Data } from "./data";

Chart.defaults.global.animation!.duration = 0;

const chartElement = document.getElementById("chart") as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const forecastElement = document.getElementById("forecast") as HTMLInputElement;
const sliderElement = document.getElementById("slider") as HTMLInputElement;
const filterElement = document.getElementById("filter") as HTMLInputElement;

forecastElement.value = String(3);
sliderElement.setAttribute("min", "1");

const getForecast = () => parseInt(forecastElement.value);
const getXPrediction = () => parseInt(sliderElement.value);

const createGraph = (data: Array<Data>) => {
  const points: regression.DataPoint[] = data.map((d, i) => [i + 1, d.value]);

  const getLabels = () => {
    return [...new Array(points.length + getForecast())].map((_, i) => {
      const firstDate = new Date(data[0].date.slice(0, 10));
      firstDate.setDate(firstDate.getDate() + i);

      const currentDate = firstDate;

      return `${currentDate.getDate()} ${currentDate.toLocaleString("default", {
        month: "short"
      })}`;
    });
  };

  const chartDataFromPoints = (
    dataPoint: regression.DataPoint
  ): { x: string; y: number } => {
    return { x: getLabels()[dataPoint[0] - 1], y: dataPoint[1] };
  };

  const getChartDatasets = (): Chart.ChartDataSets[] => {
    // regressions
    const exponential = regression.exponential(
      points.slice(0, getXPrediction())
    );
    const cubic = regression.polynomial(points.slice(0, getXPrediction()), {
      order: 3
    });
    const quadratic = regression.polynomial(points.slice(0, getXPrediction()), {
      order: 2
    });

    const getProjection = (
      regression: regression.Result,
      numberOfPoints: number
    ): regression.DataPoint[] => {
      return [...new Array(points.length + numberOfPoints)].map((_, i) =>
        i + 1 >= getXPrediction()
          ? regression.predict(i + 1)
          : ([i + 1, null] as any)
      );
    };

    const getForecastRegressionLength = () =>
      points.length - getXPrediction() + getForecast();

    return [
      {
        label: "Nº morti ufficiale",
        backgroundColor: "transparent",
        borderColor: "#505050",
        pointRadius: 1,
        data: points.map(chartDataFromPoints)
      },
      {
        label: "Esponenziale",
        backgroundColor: "transparent",
        borderColor: "rgb(255, 99, 132)",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        data: getProjection(exponential, getForecastRegressionLength()).map(
          chartDataFromPoints
        )
      },
      {
        label: "Cubica",
        backgroundColor: "transparent",
        borderColor: "rgb(50, 255, 88)",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        data: getProjection(cubic, getForecastRegressionLength()).map(
          chartDataFromPoints
        )
      },
      {
        label: "Quadratica",
        backgroundColor: "transparent",
        borderColor: "cadetblue",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        data: getProjection(quadratic, getForecastRegressionLength()).map(
          chartDataFromPoints
        )
      }
    ]
      .filter(d => d.data.filter(x => x.y !== null).length > 1)
      .reverse();
  };

  const yAxisMax =
    regression.exponential(points).predict(points.length + getForecast())[1] *
    1.5;

  const chart = new Chart(ctx, {
    // The type of chart we want to create
    type: "line",

    // The data for our dataset
    data: {
      labels: getLabels(),
      datasets: getChartDatasets()
    },

    // Configuration options go here
    options: {
      tooltips: {
        mode: "x",
        intersect: false
      },
      scales: {
        yAxes: [
          {
            id: "y-axis",
            type: "linear",
            ticks: {
              max:
                yAxisMax < 200
                  ? Math.floor(yAxisMax / 20) * 20
                  : yAxisMax < 1000
                  ? Math.floor(yAxisMax / 50) * 50
                  : Math.floor(yAxisMax / 500) * 500,
              min: 0
            }
          }
        ]
      }
    }
  });

  return chart;
};

const main = async () => {
  const data = await getData();

  let chart: Chart | null = null;

  const updateChart = () => {
    chart && chart.destroy();

    const filteredData = (() => {
      switch (filterElement.value) {
        case "italy":
          return italianData;
        case "france":
          return data.globalData.filter(
            d =>
              d.country === "France" &&
              d.value > 0 &&
              d.date > "2020-02-28T00:00:00"
          );
        case "spain":
          return data.globalData.filter(
            d => d.country === "Espagne" && d.value > 0
          );
        case "lombardy":
          return data.regionalData.filter(d => d.region === "Lombardia");
        case "emilia-romagna":
          return data.regionalData.filter(
            d => d.region === "Emilia Romagna" && d.value > 0
          );
        case "veneto":
          return data.regionalData.filter(
            d => d.region === "Veneto" && d.value > 0
          );
      }
    })()!;

    sliderElement.setAttribute("value", String(filteredData.length));
    sliderElement.setAttribute("max", String(filteredData.length));

    if (getXPrediction() > filteredData.length) {
      sliderElement.setAttribute("value", String(filteredData.length));
    }

    sliderElement.style.width = `${78.9 *
      (filteredData.length / (filteredData.length + getForecast()))}%`;

    chart = createGraph(filteredData);
  };

  sliderElement.addEventListener("input", updateChart);
  filterElement.addEventListener("change", updateChart);
  forecastElement.addEventListener("change", updateChart);

  updateChart();
};

main();
