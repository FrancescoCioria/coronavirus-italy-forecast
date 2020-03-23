import * as regression from "regression";
import * as Chart from "chart.js";
import { getData, Data } from "./data";
import { createCompareGraph } from "./compare";
import * as LMType from "ml-levenberg-marquardt";
import * as queryString from "query-string";

const LM = require("ml-levenberg-marquardt").default as typeof LMType;

Chart.defaults.global.animation!.duration = 0;

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

const chartElement = document.getElementById("chart") as HTMLCanvasElement;
const ctx = chartElement.getContext("2d")!;

const forecastElement = document.getElementById("forecast") as HTMLInputElement;
const sliderElement = document.getElementById("slider") as HTMLInputElement;
const filterElement = document.getElementById("filter") as HTMLSelectElement;
const scaleElement = document.getElementById("scale") as HTMLSelectElement;

forecastElement.value = String(3);
sliderElement.setAttribute("min", "1");

const updateUrlHash = (): void => {
  const query = {
    // slider: sliderElement.value,
    filter: filterElement.value,
    scale: scaleElement.value,
    forecast: parseInt(forecastElement.value)
  };

  location.hash = queryString.stringify(query);
};

const getHash = (): {
  filter: "italy" | "france" | "spain" | "uk" | "netherlands" | "lombardy";
  scale: "linear" | "logarithmic";
  forecast: number;
} => {
  return queryString.parse(location.hash, { parseNumbers: true }) as any;
};

if (window.location.hash.length === 0) {
  updateUrlHash();
} else {
  const hash = getHash();
  forecastElement.value = String(hash.forecast);
  filterElement.value = hash.filter;
  scaleElement.value = hash.scale;
}

filterElement.addEventListener("change", updateUrlHash);
scaleElement.addEventListener("change", updateUrlHash);
forecastElement.addEventListener("change", updateUrlHash);

const getForecast = (): number => getHash().forecast;
const getXPrediction = (): number => parseInt(sliderElement.value);

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

  const chartDataFromPoints = (dataPoint: regression.DataPoint): number => {
    return dataPoint[1];
    // return { x: getLabels()[dataPoint[0] - 1], y: dataPoint[1] };
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

    return [
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
  };

  const yMaxTemp = points[points.length - 1][1] * 10;

  const yAxisMax =
    yMaxTemp < 10000
      ? Math.round((points[points.length - 1][1] * 10) / 1000) * 1000
      : Math.round((points[points.length - 1][1] * 10) / 10000) * 10000;

  const type = getHash().scale;

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
        intersect: false,
        position: "nearest"
      },
      scales: {
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

const main = async () => {
  const data = await getData();

  let chart: Chart | null = null;

  const startNumberOfDeaths = 15;

  const italy = {
    label: "Italia",
    data: data.italianData.filter(d => d.value > startNumberOfDeaths)
  };
  const france = {
    label: "Francia",
    data: data.globalData.filter(
      d => d.country === "France" && d.value > startNumberOfDeaths
    )
  };
  const spain = {
    label: "Spagna",
    data: data.globalData.filter(
      d => d.country === "Spain" && d.value > startNumberOfDeaths
    )
  };
  const uk = {
    label: "UK",
    data: data.globalData.filter(
      d => d.country === "United Kingdom" && d.value >= startNumberOfDeaths
    )
  };
  const germany = {
    label: "Germania",
    data: data.globalData.filter(
      d => d.country === "Germany" && d.value >= startNumberOfDeaths
    )
  };
  const netherlands = {
    label: "Olanda",
    data: data.globalData.filter(
      d => d.country === "Netherlands" && d.value >= startNumberOfDeaths
    )
  };
  const southKorea = {
    label: "Corea del Sud",
    data: data.globalData.filter(
      d => d.country === "South Korea" && d.value >= startNumberOfDeaths
    )
  };
  const hubeiChina = {
    label: "Cina",
    data: data.globalData.filter(
      d => d.country === "China" && d.value > startNumberOfDeaths
    )
  };
  const iran = {
    label: "Iran",
    data: data.globalData.filter(
      d => d.country === "Iran" && d.value > startNumberOfDeaths
    )
  };
  const washingtonUS = {
    label: "USA",
    data: data.globalData.filter(
      d => d.country === "United States" && d.value > startNumberOfDeaths
    )
  };

  // regions
  const lombardy = {
    label: "Lombardia",
    data: data.regionalData.filter(
      d => d.region === "Lombardia" && d.value > startNumberOfDeaths
    )
  };

  const updateChart = () => {
    chart && chart.destroy();

    const filteredData = ((): Data[] => {
      switch (getHash().filter) {
        case "italy":
          return italy.data;
        case "france":
          return france.data;
        case "spain":
          return spain.data;
        case "uk":
          return uk.data;
        case "netherlands":
          return netherlands.data;
        // case "germany":
        //   return germany.data;
        case "lombardy":
          return lombardy.data;
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

  window.onhashchange = () => {
    updateChart();
  };

  updateChart();

  createCompareGraph([
    italy,
    france,
    spain,
    netherlands,
    hubeiChina,
    uk,
    germany,
    washingtonUS,
    southKorea,
    iran
  ]);
};

main();
