import * as regression from "regression";
import * as Chart from "chart.js";
import { Data } from "./server";
import * as LMType from "ml-levenberg-marquardt";
import { getHash } from "./hash";

const annotationPlugin = require("chartjs-plugin-annotation");
const LM = require("ml-levenberg-marquardt").default as typeof LMType;

const chartElement = document.getElementById(
  "chart-cumulative"
) as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const chart = new Chart(ctx, {
  type: "line",

  plugins: [annotationPlugin],

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

const asymmetricalSigmoidalRegression = (
  points: regression.DataPoint[]
): regression.Result => {
  const asymmetricalSigmoidalFunction = ([a, b, c, d, m]: number[]) => (
    x: number
  ): number => d + (a - d) / Math.pow(1 + Math.pow(x / c, b), m);

  const asymmetricalSigmoidalParameters = LM(
    {
      x: points.slice(0, getXPrediction()).map(p => p[0]),
      y: points.slice(0, getXPrediction()).map(p => p[1])
    },
    asymmetricalSigmoidalFunction,
    {
      initialValues: [34.50764, 4.134764, 744.5857, 2549.07, 5114272],
      damping: 1,
      maxIterations: 1000,
      minValues: [
        Number.MIN_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        700,
        Number.MIN_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER
      ]
    } as any
  ).parameterValues;

  return {
    predict: (x: number): regression.DataPoint => [
      x,
      asymmetricalSigmoidalFunction(asymmetricalSigmoidalParameters)(x)
    ]
  } as regression.Result;
};

const sliderElement = document.getElementById("slider") as HTMLInputElement;
sliderElement.setAttribute("min", "1");

const getForecast = (): number => getHash().forecast;
const getXPrediction = (): number => parseInt(sliderElement.value);

export const updateCumulativeGraph = (data: Array<Data>) => {
  sliderElement.setAttribute("value", String(data.length));
  sliderElement.setAttribute("max", String(data.length));

  if (getXPrediction() > data.length) {
    sliderElement.setAttribute("value", String(data.length));
  }

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

  const chartDataFromPoints = (dataPoint: regression.DataPoint): number => {
    return dataPoint[1];
  };

  // regressions
  const exponential = regression.exponential(points.slice(0, getXPrediction()));
  const cubic = regression.polynomial(points.slice(0, getXPrediction()), {
    order: 3
  });
  const quadratic = regression.polynomial(points.slice(0, getXPrediction()), {
    order: 2
  });
  const asymmetricalSigmoidal = asymmetricalSigmoidalRegression(
    points.slice(0, getXPrediction())
  );

  const getProjection = (
    regression: regression.Result,
    numberOfPoints: number
  ): regression.DataPoint[] => {
    return [...new Array(points.length + numberOfPoints)].map((_, i) => [
      i + 1,
      Math.round(regression.predict(i + 1)[1])
    ]);
  };

  const getForecastRegressionLength = () =>
    points.length - getXPrediction() + getForecast();

  const datasets: Chart.ChartDataSets[] = [
    {
      label: "Nº morti ufficiale",
      backgroundColor: "transparent",
      borderColor: "#505050",
      pointRadius: 1,
      yAxisID: "y-axis",
      data: points.map(chartDataFromPoints)
    },
    {
      label: "Esponenziale",
      backgroundColor: "transparent",
      borderColor: "rgba(234, 67, 53, 1)",
      borderDash: [10, 5],
      borderWidth: 1,
      pointRadius: 1,
      yAxisID: "y-axis",
      data: getProjection(exponential, getForecastRegressionLength()).map(
        chartDataFromPoints
      )
    },
    {
      label: "Cubica",
      backgroundColor: "transparent",
      borderColor: "rgba(51, 168, 83, 1)",
      borderDash: [10, 5],
      borderWidth: 1,
      pointRadius: 1,
      yAxisID: "y-axis",
      data: getProjection(cubic, getForecastRegressionLength()).map(
        chartDataFromPoints
      )
    },
    {
      label: "Quadratica",
      backgroundColor: "transparent",
      borderColor: "rgba(66, 133, 244, 1)",
      borderDash: [10, 5],
      borderWidth: 1,
      pointRadius: 1,
      yAxisID: "y-axis",
      data: getProjection(quadratic, getForecastRegressionLength()).map(
        chartDataFromPoints
      )
    },
    {
      label: "Sigmoide asimmetrica (logistica)",
      backgroundColor: "transparent",
      borderColor: "rgb(251,188,3)",
      borderDash: [10, 5],
      borderWidth: 1,
      pointRadius: 1,
      yAxisID: "y-axis",
      data: getProjection(
        asymmetricalSigmoidal,
        getForecastRegressionLength()
      ).map(chartDataFromPoints)
    }
  ]
    .filter(d => d.data.filter(y => y !== null).length > 1)
    .reverse();

  const cubicPoints = getProjection(cubic, getForecastRegressionLength()).map(
    chartDataFromPoints
  );

  const yMaxTemp = cubicPoints[cubicPoints.length - 1] * 1.5;

  const percentage = data.length / (data.length + getForecast());
  const offset = yMaxTemp > 100000 ? 50 : yMaxTemp > 10000 ? 40 : 50;
  sliderElement.style.width = `calc(${percentage} * (70vw - ${offset}px))`;

  const yAxisMax =
    yMaxTemp < 10000
      ? Math.round(yMaxTemp / 1000) * 1000
      : Math.round(yMaxTemp / 10000) * 10000;

  const type = getHash().scale;

  const lockdownDay = ((): number | null => {
    switch (getHash().filter) {
      case "italy":
        return 13;
      case "france":
        return 10;
      case "spain":
        return 8;
      case "uk":
        return 11;
      case "lombardy":
        return 10;
      default:
        return null;
    }
  })();

  chart.data = {
    labels: getLabels(),
    datasets
  };

  chart.options.scales = {
    yAxes: [
      {
        id: "y-axis",
        type,
        ticks:
          type === "linear"
            ? {
                max:
                  yAxisMax < 200
                    ? Math.floor(yAxisMax / 20) * 20
                    : yAxisMax < 1000
                    ? Math.floor(yAxisMax / 50) * 50
                    : Math.floor(yAxisMax / 500) * 500,
                min: 0
              }
            : {
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
  };

  chart.options["annotation" as keyof Chart.ChartOptions] = {
    annotations:
      lockdownDay !== null
        ? [
            {
              id: `vline$`,
              type: "line",
              mode: "vertical",
              scaleID: "x-axis-0",
              value: lockdownDay - 1,
              borderColor: "#505050",
              borderWidth: 1,
              label: {
                backgroundColor: "#505050",
                content: "Lockdown",
                enabled: true,
                position: "top",
                yAdjust: 10
              }
            }
          ]
        : []
  } as any;

  chart.update({ duration: 0 });
};
