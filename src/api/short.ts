import api from "./client";
import { ShortPosition, ShortSellRequest, ShortCoverRequest } from "../types";

export async function executeShortSell(payload: ShortSellRequest): Promise<{
  success: boolean;
  message: string;
  shortPosition?: ShortPosition;
}> {
  try {
    const response = await api.post("/short/sell", payload);
    return {
      success: true,
      message: response.data.message || "Short position opened",
      shortPosition: response.data.shortPosition,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to open short position",
    };
  }
}

export async function closeShortPosition(payload: ShortCoverRequest): Promise<{
  success: boolean;
  message: string;
  profitLoss?: number;
  shortPosition?: ShortPosition;
}> {
  try {
    const response = await api.post("/short/cover", payload);
    return {
      success: true,
      message: response.data.message || "Short position closed",
      profitLoss: response.data.profitLoss,
      shortPosition: response.data.shortPosition,
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to close short position",
    };
  }
}

export async function getShortPositions(status?: string): Promise<{
  success: boolean;
  positions: ShortPosition[];
  message?: string;
}> {
  try {
    const params = status ? { status } : {};
    const response = await api.get("/short/positions", { params });
    return { success: true, positions: response.data.positions || [] };
  } catch (error: any) {
    return {
      success: false,
      positions: [],
      message:
        error.response?.data?.message || "Failed to fetch short positions",
    };
  }
}
