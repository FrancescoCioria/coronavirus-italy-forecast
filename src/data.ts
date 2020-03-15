import axios from "axios";

export type Data = {
  date: string;
  value: number;
};

export const getData = () => {
  return axios
    .get<{
      italianData: Array<Data>;
      regionalData: Array<
        Data & {
          region: "Lombardia" | "Emilia Romagna" | "Veneto";
        }
      >;
      globalData: Array<
        Data & {
          country:
            | "France"
            | "Espagne"
            | "Chine"
            | "Royaume-Uni"
            | "États-Unis"
            | "Iran";
        }
      >;
    }>("https://protected-depths-21596.herokuapp.com/")
    .then(res => res.data);
};
