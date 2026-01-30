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
