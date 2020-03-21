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
  | "United States"
  | "France"
  | "Spain"
  | "United Kingdom"
  | "Netherlands"
  | "Germany"
  | "South Korea"
  | "Iran";

export type CoronavirusDataCSV = {
  date: string;
  location: Country;
  new_cases: string;
  new_deaths: string;
  total_cases: string;
  total_deaths: string;
};

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
  globalData: Array<Data & { country: Country }>;
};

const get = <A>(url: string): Promise<A> => {
  return axios.get<A>(url).then(res => res.data);
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

export const getGlobalData = (): Promise<Array<Data & { country: Country }>> =>
  get<string>("https://covid.ourworldindata.org/data/ecdc/full_data.csv")
    .then(csv =>
      csvToJson({
        output: "json"
      }).fromString(csv)
    )
    .then(
      (data: CoronavirusDataCSV[]): Array<Data & { country: Country }> => [
        {
          date: "2020-03-09",
          value: 17,
          country: "Spain"
        },

        ...data.map(d => ({
          date: d.date,
          value: parseInt(d.total_deaths),
          country: d.location
        }))
      ]
    )
    .then(data => {
      return sortBy(
        data.map(d => ({
          ...d,
          date: new Date(new Date(d.date).setHours(-5)).toISOString() // 🙈
        })),
        "date"
      );
    });
