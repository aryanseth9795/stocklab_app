import api from "./client";
import { TradeRequestBody, Order, Transaction } from "../types";

// Execute a buy/sell order
export async function executeOrder(
  payload: TradeRequestBody,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await api.post("/execute", payload);
    return {
      success: true,
      message: response.data.message || "Order executed successfully",
    };
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to execute order";
    return { success: false, message };
  }
}

// Get trade history
export async function getTradeHistory(): Promise<{
  success: boolean;
  orders: Order[];
  message?: string;
}> {
  try {
    const response = await api.get("/tradehistory");
    return { success: true, orders: response.data.orders || [] };
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch trade history";
    return { success: false, orders: [], message };
  }
}

// Get transactions
export async function getTransactions(): Promise<{
  success: boolean;
  transactions: Transaction[];
  message?: string;
}> {
  try {
    const response = await api.get("/transactions");
    return { success: true, transactions: response.data.transactions || [] };
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch transactions";
    return { success: false, transactions: [], message };
  }
}

// Get portfolio
export async function getPortfolio(): Promise<{
  success: boolean;
  portfolio: any[];
  message?: string;
}> {
  try {
    const response = await api.get("/portfolio");
    return { success: true, portfolio: response.data.portfolio || [] };
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch portfolio";
    return { success: false, portfolio: [], message };
  }
}

// Get account details
export async function getAccountDetails(): Promise<{
  success: boolean;
  user: any;
  message?: string;
}> {
  try {
    const response = await api.get("/account");
    return { success: true, user: response.data.user };
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch account details";
    return { success: false, user: null, message };
  }
}

// Update user profile
export async function updateProfile(data: {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{
  success: boolean;
  user?: any;
  message: string;
}> {
  try {
    const response = await api.put("/profile", data);
    return {
      success: true,
      user: response.data.user,
      message: response.data.message || "Profile updated successfully",
    };
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to update profile";
    return { success: false, message };
  }
}

// Get Profit/Loss statistics
export async function getProfitLoss(days?: number): Promise<{
  success: boolean;
  data?: {
    realizedPL: number;
    totalBuyAmount: number;
    totalSellAmount: number;
    totalBuyCount: number;
    totalSellCount: number;
    totalTrades: number;
    avgTradeSize: number;
    symbolBreakdown: Array<{
      symbol: string;
      realizedPL: number;
      totalBuy: number;
      totalSell: number;
      buyVolume: number;
      sellVolume: number;
      buyCount: number;
      sellCount: number;
    }>;
    period: string;
  };
  message?: string;
}> {
  try {
    const params = days ? { days: days.toString() } : {};
    const response = await api.get("/stats/pl", { params });
    return { success: true, data: response.data.data };
  } catch (error: any) {
    console.error("P/L API Error Details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    const message =
      error.response?.data?.message || "Failed to fetch P/L statistics";
    return { success: false, message };
  }
}
