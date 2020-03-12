import * as regression from "regression";
import * as Chart from "chart.js";
import { getNationalData } from "./data";

const FORECAST = 3;
Chart.defaults.global.animation!.duration = 0;

const main = async () => {
  const nationalData = await getNationalData();

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

  const data: Array<{ data: string; deceduti: number }> = [
    ...firstThreeDays,
    ...nationalData
  ];

  const points: regression.DataPoint[] = data.map((d, i) => [
    i + 1,
    d.deceduti
  ]);

  // slider
  const sliderElement = document.getElementById("slider") as HTMLInputElement;
  sliderElement.setAttribute("min", "1");
  sliderElement.setAttribute("max", String(points.length));
  sliderElement.setAttribute("value", String(points.length));
  sliderElement.value = String(data.length);
  (sliderElement.style.width as any) = `${86.5 *
    (points.length / (points.length + FORECAST))}%`;

  const getXPrediction = () => parseInt(sliderElement.value);
  const getForecast = () => points.length - getXPrediction() + FORECAST;

  // chart.js
  const chartElement = document.getElementById("chart") as HTMLCanvasElement;
  const ctx = chartElement.getContext("2d")!;

  const getLabels = () => {
    return [...new Array(points.length + FORECAST)].map((_, i) => {
      const firstDate = new Date(firstThreeDays[0].data.slice(0, 10));
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

    return [
      {
        label: "Dati reali",
        backgroundColor: "transparent",
        borderColor: "#505050",
        pointRadius: 1,
        yAxis: "y-axis",
        data: points.map(chartDataFromPoints)
      },
      // {
      //   label: "Approssimazione curva esponenziale",
      //   backgroundColor: "transparent",
      //   borderColor: "rgb(255, 99, 132)",
      //   data: exponential.points
      //     .slice(0, getXPrediction())
      //     .map(chartDataFromPoints)
      // },
      {
        label: "Esponenziale",
        backgroundColor: "transparent",
        borderColor: "rgb(255, 99, 132)",
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 1,
        yAxis: "y-axis",
        data: [
          exponential.points[getXPrediction() - 1],
          ...getProjection(exponential, getForecast())
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
          ...getProjection(cubic, getForecast())
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
          ...getProjection(quadratic, getForecast())
        ].map(chartDataFromPoints)
      }
    ].reverse();
  };

  const yAxisMax =
    regression.exponential(points).predict(points.length + FORECAST)[1] * 2;

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
              max: Math.floor(yAxisMax / 500) * 500,
              min: 0
            }
          }
        ]
      }
    }
  });

  const updateChart = () => {
    chart.data.datasets = getChartDatasets();
    chart.update();
  };

  sliderElement.addEventListener("input", updateChart);
};

main();
