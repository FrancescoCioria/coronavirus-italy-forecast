import axios from "axios";
import { Response } from "../server/server";

export type Data = {
  date: string;
  value: number;
};

export const getData = () => {
  return axios
    .get<Response>("https://protected-depths-21596.herokuapp.com/")
    .then(res => res.data);
};
