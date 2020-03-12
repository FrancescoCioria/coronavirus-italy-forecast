import axios from "axios";

export type CoronavirusData = {
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

export type CoronavirusNationalData = CoronavirusData & {
  data: string;
  stato: "ITA";
};

export type CoronavirusRegionalData = CoronavirusNationalData & {
  codice_regione: number;
  denominazione_regione: "Lombardia" | "Emilia Romagna" | "Veneto";
  lat: number;
  long: number;
};

export const getRegionalData = (): Promise<CoronavirusRegionalData[]> =>
  axios
    .get(
      "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json"
    )
    .then(res => res.data);

export const getNationalData = (): Promise<CoronavirusNationalData[]> =>
  axios
    .get(
      "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json"
    )
    .then(res => res.data);

export const getLastNationalData = (
  nationalData: CoronavirusNationalData[]
): CoronavirusData => {
  return nationalData[nationalData.length - 1];
};

export const getLastRegionalData = (
  regionalData: CoronavirusRegionalData[],
  region: CoronavirusRegionalData["denominazione_regione"]
): CoronavirusData => {
  const filteredRegionalData = regionalData.filter(
    d => d.denominazione_regione === region
  );

  return filteredRegionalData[filteredRegionalData.length - 1];
};
