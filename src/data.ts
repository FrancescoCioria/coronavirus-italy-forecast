import {
  Response,
  getItalianData,
  getRegionalData,
  getGlobalData
} from "./server";

export type Data = {
  date: string;
  value: number;
};

export const getData = async (): Promise<Response> => {
  const italianData = await getItalianData();
  const regionalData = await getRegionalData();
  const globalData = await getGlobalData();

  return {
    italianData,
    regionalData,
    globalData
  };
};
