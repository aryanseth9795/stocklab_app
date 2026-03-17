import api from "./client";
import {
  CommodityPortfolioItem,
  CommodityOrderRequest,
  ShortPosition,
} from "../types";

const COMMODITY_SSE_URL = process.env.EXPO_PUBLIC_SERVER_URL
  ? `${process.env.EXPO_PUBLIC_SERVER_URL}/api/v1/commodity/stream`
  : "http://localhost:4000/api/v1/commodity/stream";

// Re-export for convenience
export { COMMODITY_SSE_URL };

export async function executeCommodityOrder(
  payload: CommodityOrderRequest,
): Promise<{
  success: boolean;
  message: string;
  shortPosition?: ShortPosition;
}> {
  try {
    const response = await api.post("/commodity/execute", payload);
    return {
      success: true,
      message: response.data.message || "Commodity order executed successfully",
      shortPosition: response.data.shortPosition,
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to execute commodity order",
    };
  }
}

export async function getCommodityPortfolio(): Promise<{
  success: boolean;
  holdings: CommodityPortfolioItem[];
  message?: string;
}> {
  try {
    const response = await api.get("/commodity/portfolio");
    return { success: true, holdings: response.data.holdings || [] };
  } catch (error: any) {
    return {
      success: false,
      holdings: [],
      message:
        error.response?.data?.message || "Failed to fetch commodity portfolio",
    };
  }
}
