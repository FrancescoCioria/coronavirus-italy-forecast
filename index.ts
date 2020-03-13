import axios from "axios";
import * as express from "express";
import * as cors from "cors";

export type Data = {
  date: string;
  value: number;
};

export type CoronavirusDataFR = {
  PaysData: Array<{
    Date: string;
    Pays: "France" | "Espagne";
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

export const getRegionalData = (): Promise<Array<
  Data & { region: CoronavirusRegionalDataITA["denominazione_regione"] }
>> =>
  axios
    .get<CoronavirusRegionalDataITA[]>(
      "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json"
    )
    .then(res =>
      res.data.map(d => ({
        date: d.data,
        value: d.deceduti,
        region: d.denominazione_regione
      }))
    );

export const getItalianData = (): Promise<Data[]> =>
  axios
    .get<CoronavirusNationalDataITA[]>(
      "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json"
    )
    .then(res => res.data.map(d => ({ date: d.data, value: d.deceduti })));

export const getGlobalData = (): Promise<Array<
  Data & { country: "France" | "Espagne" }
>> =>
  axios
    .get<CoronavirusDataFR>(
      "https://coronavirus.politologue.com/data/coronavirus/coronacsv.aspx?format=json"
    )
    .then(res =>
      res.data.PaysData.map(d => ({
        date: d.Date,
        value: d.Deces,
        country: d.Pays
      }))
    );

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

  res.json({
    italianData,
    regionalData,
    globalData
  });
});

app.listen(process.env.PORT || 8081);
