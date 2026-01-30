// Stock tick data from socket
export interface Stock {
  stockName: string;
  stocksymbol: string;
  stockPrice: number;
  stockPriceINR: number;
  stockChange: number;
  stockChangeINR: number;
  stockChangePercentage: number;
  ts: string;
}

// User data
export interface User {
  id: string;
  email: string;
  name: string;
  balance: number;
  totalInvested?: number;
  stockNames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Portfolio position
export interface Position {
  id: string;
  userId: string;
  stockSymbol: string;
  stockName: string;
  stockPrice: number;
  stockQuantity: number;
  stockTotal: number;
  createdAt: string;
  updatedAt: string;
}

// Live tick from portfolio:batch
export interface Tick {
  stocksymbol: string;
  stockName: string;
  stockPrice: number;
  stockPriceINR?: number;
  stockChange?: number;
  stockChangeINR?: number;
  stockChangePercentage?: number;
  ts?: string;
}

// Portfolio batch payload
export interface PortfolioBatch {
  ts: string;
  ticks: Tick[];
}

// Portfolio info payload
export interface PortfolioInfo {
  userdata: User;
  positions: Position[];
}

// Order/Trade
export interface Order {
  id: string;
  userId: string;
  transactionId: string;
  stockSymbol: string;
  stockName: string;
  stockPrice: number;
  stockQuantity: number;
  stockTotal: number;
  status: "completed" | "pending" | "failed";
  type: "buy" | "sell";
  description?: string;
  createdAt: string;
}

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  openingBalance: number;
  closingBalance: number;
  usedBalance: number;
  type: "Debit" | "Credit";
  status: "completed" | "pending" | "failed";
  createdAt: string;
}

// Trade request body
export interface TradeRequestBody {
  userId: string;
  stockName: string;
  quantity: number;
  rate: number;
  type: "buy" | "sell";
}

// Auth tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  success: boolean;
  message: string;
  user: User;
}
