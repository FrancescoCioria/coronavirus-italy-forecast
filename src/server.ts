import axios from "axios";
import values = require("lodash/values");
import omit = require("lodash/omit");
import flatten = require("lodash/flatten");
import * as csvToJson from "csvtojson";

export type Data = {
  date: string;
  value: number;
};

export type Country =
  | "China"
  | "US"
  | "France"
  | "Spain"
  | "United Kingdom"
  | "Netherlands"
  | "Germany"
  | "Korea, South"
  | "Iran";

export type CoronavirusDataCSV = Array<{
  "Province/State": string;
  "Country/Region": Country;
  Lat: string;
  Long: string;
  [k: string]: string;
}>;

export type CoronavirusDataITA = {
  ricoverati_con_sintomi: number;
  terapia_intensiva: number;
  totale_ospedalizzati: number;
  isolamento_domiciliare: number;
  totale_attualmente_positivi: number;
  nuovi_attualmente_positivi: number;
  dimessi_guariti: number;
  deceduti: number;
  totale_casi: number;
  tamponi: number;
};

export type CoronavirusNationalDataITA = CoronavirusDataITA & {
  data: string;
  stato: "ITA";
};

export type CoronavirusRegionalDataITA = CoronavirusNationalDataITA & {
  codice_regione: number;
  denominazione_regione: "Lombardia" | "Emilia Romagna" | "Veneto";
  lat: number;
  long: number;
};

export type Response = {
  italianData: Data[];
  regionalData: Array<
    Data & { region: CoronavirusRegionalDataITA["denominazione_regione"] }
  >;
  globalData: Array<Data & { country: Country; province: string }>;
};

let cachedRequests: { [k: string]: { ts: number; data: unknown } } = {};

const get = <A>(url: string): Promise<A> => {
  if (cachedRequests[url] && Date.now() - cachedRequests[url].ts < 600000) {
    // cache for 10 minutes
    console.log(`results from cache (${url})`);
    return Promise.resolve(cachedRequests[url].data as A);
  }

  console.log(`fetching data (${url})`);

  return axios.get<A>(url).then(res => {
    cachedRequests[url] = {
      ts: Date.now(),
      data: res.data
    };

    return res.data;
  });
};

export const getRegionalData = (): Promise<Array<
  Data & { region: CoronavirusRegionalDataITA["denominazione_regione"] }
>> =>
  get<CoronavirusRegionalDataITA[]>(
    "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json"
  ).then(data =>
    data.map(d => ({
      date: d.data,
      value: d.deceduti,
      region: d.denominazione_regione
    }))
  );

export const getItalianData = (): Promise<Data[]> =>
  get<CoronavirusNationalDataITA[]>(
    "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json"
  )
    .then(data => data.map(d => ({ date: d.data, value: d.deceduti })))
    .then(
      (data): Array<Data> => {
        const firstThreeDays = [
          {
            date: "2020-02-21 18:00:00",
            value: 1
          },
          {
            date: "2020-02-22 18:00:00",
            value: 2
          },
          {
            date: "2020-02-23 18:00:00",
            value: 3
          }
        ];

        return [...firstThreeDays, ...data];
      }
    );

export const getGlobalData = (): Promise<Array<
  Data & { country: Country; province: string }
>> =>
  get<string>(
    "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv"
  )
    .then(csv =>
      csvToJson({
        output: "json"
      }).fromString(csv)
    )
    .then((data: CoronavirusDataCSV) => {
      return data.map(d => {
        const countryValues = values(
          omit(d, ["Province/State", "Country/Region", "Lat", "Long"])
        );

        const getDate = (i: number) => {
          const firstDate = new Date("2020-01-22T18:00:00");
          firstDate.setDate(firstDate.getDate() + i);
          return firstDate.toISOString();
        };

        return countryValues.map((value, i) => ({
          date: getDate(i),
          value: parseInt(value),
          province: d["Province/State"],
          country: d["Country/Region"]
        }));
      });
    })
    .then(flatten)
    .then(data =>
      data.filter(
        d =>
          d.country === "Spain" ||
          (d.country === "France" && d.province === "France") ||
          d.country === "Iran" ||
          d.country === "US" ||
          (d.country === "United Kingdom" && d.province === "United Kingdom") ||
          (d.country === "Netherlands" && d.province === "Netherlands") ||
          d.country === "Germany" ||
          d.country === "China" ||
          d.country === "Korea, South"
      )
    );
