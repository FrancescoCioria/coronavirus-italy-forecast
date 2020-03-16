import axios from "axios";
import * as express from "express";
import * as cors from "cors";
import sortBy = require("lodash/sortBy");

export type Data = {
  date: string;
  value: number;
};

export type CoronavirusDataFR = {
  PaysData: Array<{
    Date: string;
    Pays:
      | "France"
      | "Espagne"
      | "Iran"
      | "Royaume-Uni"
      | "États-Unis"
      | "Chine";
    Infection: number;
    Deces: number;
    Guerisons: number;
    TauxDeces: number;
    TauxGuerison: number;
    TauxInfection: number;
  }>;
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
  globalData: Array<
    Data & { country: CoronavirusDataFR["PaysData"][number]["Pays"] }
  >;
};

let cachedRequests: { [k: string]: { ts: number; data: unknown } } = {};

const get = <A>(url: string): Promise<A> => {
  cachedRequests[url] && console.log(cachedRequests[url].ts, Date.now());
  if (cachedRequests[url] && cachedRequests[url].ts + 600000 < Date.now()) {
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
  ).then(data => data.map(d => ({ date: d.data, value: d.deceduti })));

export const getGlobalData = (): Promise<Array<
  Data & { country: CoronavirusDataFR["PaysData"][number]["Pays"] }
>> =>
  get<CoronavirusDataFR>(
    "https://coronavirus.politologue.com/data/coronavirus/coronacsv.aspx?format=json"
  )
    .then(data =>
      data.PaysData.filter(
        d =>
          d.Pays === "Espagne" ||
          d.Pays === "France" ||
          d.Pays === "Iran" ||
          d.Pays === "Royaume-Uni" ||
          d.Pays === "États-Unis" ||
          d.Pays === "Chine"
      ).map(d => ({
        date: d.Date,
        value: d.Deces,
        country: d.Pays
      }))
    )
    .then(data => sortBy(data, "date"));

const app = express();

app.use(cors());

app.get("/", async (_, res) => {
  const _italianData = await getItalianData();
  const regionalData = await getRegionalData();
  const globalData = await getGlobalData();

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

  const italianData: Array<Data> = [...firstThreeDays, ..._italianData];

  const response: Response = {
    italianData,
    regionalData,
    globalData
  };

  res.json(response);
});

app.listen(process.env.PORT || 8081);
