import {
  Response,
  getItalianData,
  getRegionalData,
  getGlobalData
} from "./server";

export const getData = async (): Promise<Response> => {
  const [italianData, regionalData, globalData] = await Promise.all<
    Response["italianData"],
    Response["regionalData"],
    Response["globalData"]
  >([getItalianData(), getRegionalData(), getGlobalData()]);

  return {
    italianData,
    regionalData,
    globalData
  };
};
