import * as regression from "regression";
import * as Chart from "chart.js";
import { getNationalData, getRegionalData } from "./data";

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

const createGraph = (data: Array<{ data: string; deceduti: number }>) => {
  const points: regression.DataPoint[] = data.map((d, i) => [
    i + 1,
    d.deceduti
  ]);

  const getLabels = () => {
    return [...new Array(points.length + getForecast())].map((_, i) => {
      const firstDate = new Date(data[0].data.slice(0, 10));
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
      return [...new Array(numberOfPoints)].map((_, i) =>
        regression.predict(getXPrediction() + i + 1)
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
        data: [
          exponential.points[getXPrediction() - 1],
          ...getProjection(exponential, getForecastRegressionLength())
        ].map(chartDataFromPoints)
      },
      {
        label: "Cubica",
        backgroundColor: "transparent",
        borderColor: "rgb(50, 255, 88)",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        data: [
          cubic.points[getXPrediction() - 1],
          ...getProjection(cubic, getForecastRegressionLength())
        ].map(chartDataFromPoints)
      },
      {
        label: "Quadratica",
        backgroundColor: "transparent",
        borderColor: "cadetblue",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        data: [
          quadratic.points[getXPrediction() - 1],
          ...getProjection(quadratic, getForecastRegressionLength())
        ].map(chartDataFromPoints)
      }
    ].reverse();
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
  const _nationalData = await getNationalData();
  const regionalData = await getRegionalData();

  const firstThreeDays = [
    {
      data: "2020-02-21 18:00:00",
      deceduti: 1
    },
    {
      data: "2020-02-22 18:00:00",
      deceduti: 2
    },
    {
      data: "2020-02-23 18:00:00",
      deceduti: 3
    }
  ];

  const nationalData: Array<{ data: string; deceduti: number }> = [
    ...firstThreeDays,
    ..._nationalData
  ];

  sliderElement.setAttribute("value", String(nationalData.length));

  let chart: Chart | null = null;

  const updateChart = () => {
    chart && chart.destroy();

    const data = (() => {
      switch (filterElement.value) {
        case "italy":
          return nationalData;
        case "lombardy":
          return regionalData.filter(
            d => d.denominazione_regione === "Lombardia"
          );

        case "emilia-romagna":
          return regionalData.filter(
            d => d.codice_regione === 8 && d.deceduti > 0
          );
        case "veneto":
          return regionalData.filter(d => d.denominazione_regione === "Veneto");
      }
    })()!;

    sliderElement.setAttribute("max", String(data.length));

    if (getXPrediction() > data.length) {
      sliderElement.setAttribute("value", String(data.length));
    }

    sliderElement.style.width = `${78.9 *
      (data.length / (data.length + getForecast()))}%`;

    chart = createGraph(data);
  };

  sliderElement.addEventListener("input", updateChart);
  filterElement.addEventListener("change", updateChart);
  forecastElement.addEventListener("change", updateChart);

  updateChart();
};

main();
