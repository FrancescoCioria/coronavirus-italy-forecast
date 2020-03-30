import * as regression from "regression";
import * as Chart from "chart.js";
import { Data } from "./server";
import * as LMType from "ml-levenberg-marquardt";
import { getHash } from "./hash";

const annotationPlugin = require("chartjs-plugin-annotation");
const zoomPlugin = require("chartjs-plugin-zoom");
const draggablePlugin = require("chartjs-plugin-draggable/src").default;

const LM = require("ml-levenberg-marquardt").default as typeof LMType;

const chartElement = document.getElementById(
  "chart-cumulative"
) as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const chart = new Chart(ctx, {
  type: "line",

  plugins: [annotationPlugin, zoomPlugin, draggablePlugin],

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
    },
    plugins: {
      zoom: {
        pan: {
          enabled: false,
          mode: "x"
        },
        zoom: {
          enabled: false,
          mode: "x"
        }
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

// const getXAxisRange = (): { min: string; max: string } => {
//   return {
//     min: chart.config.options?.scales?.xAxes![0].ticks?.min,
//     max: chart.config.options?.scales?.xAxes![0].ticks?.max
//   };
// };

let sliderValue: null | number = null;

const getForecast = (): number => getHash().forecast;
const getXPrediction = (): number => (sliderValue || 0) + 1;

export const updateCumulativeGraph = (data: Array<Data>) => {
  if (sliderValue === null || sliderValue > data.length) {
    sliderValue = data.length - 1;
  }

  const points: regression.DataPoint[] = data.map((d, i) => [i + 1, d.value]);

  const getLabels = () => {
    return [...new Array(data.length + getForecast())].map((_, i) => {
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

  const yAxisMax =
    yMaxTemp < 10000
      ? Math.round(yMaxTemp / 1000) * 1000
      : Math.round(yMaxTemp / 10000) * 10000;

  const type = getHash().scale;

  const lockdownDay = ((): number | null => {
    switch (getHash().filterCumulative) {
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

  const labels = getLabels();

  chart.data = {
    labels,
    datasets
  };

  chart.options.scales = {
    // xAxes: [
    //   {
    //     id: "x-axis-0",
    //     ticks: {
    //       min:
    //         getXAxisRange().min ||
    //         labels[Math.floor(Math.min(data.length / 2, data.length - 10))]
    //     }
    //   }
    // ],
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

  const draggableAnnotation = {
    id: "slider" + Math.random(),
    type: "line",
    mode: "vertical",
    scaleID: "x-axis-0",
    value: sliderValue,
    borderColor: "gray",
    borderWidth: 2,
    xMin: 1,
    // xMax: data.length - chart.options.scales.xAxes![0].ticks!.min,
    draggable: true,
    onDragEnd: (event: any) => {
      sliderValue = event.subject.config.value;
      updateCumulativeGraph(data);
    },
    label: {
      backgroundColor: "gray",
      content: "Forecast",
      enabled: true,
      position: "top",
      yAdjust: 10
    }
  };

  chart.options["annotation" as keyof Chart.ChartOptions] = {
    drawTime: "afterDraw",
    events: ["click"],
    annotations:
      lockdownDay !== null
        ? [
            draggableAnnotation,
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
        : [draggableAnnotation]
  } as any;

  chart.update({ duration: 0 });
};
