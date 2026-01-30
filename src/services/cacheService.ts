import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Stock,
  Position,
  User,
  PortfolioInfo,
  Order,
  Transaction,
} from "../types";

// Cache keys
const CACHE_KEYS = {
  LANDING_STOCKS: "@stocklabs:landing_stocks",
  PORTFOLIO_INFO: "@stocklabs:portfolio_info",
  USER_PROFILE: "@stocklabs:user_profile",
  TRADE_HISTORY: "@stocklabs:trade_history",
  TRANSACTIONS: "@stocklabs:transactions",
  CACHE_METADATA: "@stocklabs:cache_metadata",
} as const;

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  LANDING_STOCKS: 24 * 60 * 60 * 1000, // 24 hours - stocks list doesn't change often
  PORTFOLIO_INFO: 30 * 60 * 1000, // 30 minutes - positions are more dynamic
  USER_PROFILE: 60 * 60 * 1000, // 1 hour - user profile
  TRADE_HISTORY: 15 * 60 * 1000, // 15 minutes - trade history
  TRANSACTIONS: 15 * 60 * 1000, // 15 minutes - transactions
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheMetadata {
  lastLandingUpdate: number;
  lastPortfolioUpdate: number;
  lastUserUpdate: number;
}

/**
 * Cache Service for StockLabs App
 *
 * This service caches non-volatile data to provide instant app loading:
 * - Landing stocks (the list of available stocks)
 * - Portfolio positions (user's holdings)
 * - User profile data
 *
 * Note: Live tick data is NOT cached as it changes every second
 */
class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  // Track if we've written to cache this session (App Launch)
  private sessionFlags = {
    landingStocks: false,
    portfolioInfo: false,
    userProfile: false,
    tradeHistory: false,
    transactions: false,
  };

  /**
   * Save landing stocks data to cache
   * @param force Force update even if already cached this session
   */
  async saveLandingStocks(stocks: Stock[], force = false): Promise<void> {
    // Only cache once per session unless forced
    if (this.sessionFlags.landingStocks && !force) {
      return;
    }

    try {
      const entry: CacheEntry<Stock[]> = {
        data: stocks,
        timestamp: Date.now(),
      };
      // Save to memory cache for instant access
      this.memoryCache.set(CACHE_KEYS.LANDING_STOCKS, entry);
      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        CACHE_KEYS.LANDING_STOCKS,
        JSON.stringify(entry),
      );

      this.sessionFlags.landingStocks = true;
      console.log("[Cache] Landing stocks saved:", stocks.length, "items");
    } catch (error) {
      console.error("[Cache] Error saving landing stocks:", error);
    }
  }

  /**
   * Get cached landing stocks
   * Returns null if no cache or cache is expired
   */
  async getLandingStocks(): Promise<Stock[] | null> {
    try {
      // Try memory cache first
      const memCached = this.memoryCache.get(CACHE_KEYS.LANDING_STOCKS);
      if (
        memCached &&
        !this.isExpired(memCached, CACHE_EXPIRY.LANDING_STOCKS)
      ) {
        console.log("[Cache] Landing stocks from memory");
        return memCached.data;
      }

      // Fall back to AsyncStorage
      const stored = await AsyncStorage.getItem(CACHE_KEYS.LANDING_STOCKS);
      if (stored) {
        const entry: CacheEntry<Stock[]> = JSON.parse(stored);
        if (!this.isExpired(entry, CACHE_EXPIRY.LANDING_STOCKS)) {
          // Update memory cache
          this.memoryCache.set(CACHE_KEYS.LANDING_STOCKS, entry);
          console.log(
            "[Cache] Landing stocks from storage:",
            entry.data.length,
            "items",
          );
          return entry.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[Cache] Error getting landing stocks:", error);
      return null;
    }
  }

  /**
   * Save portfolio info (positions & user data) to cache
   * @param force Force update even if already cached this session
   */
  async savePortfolioInfo(info: PortfolioInfo, force = false): Promise<void> {
    if (this.sessionFlags.portfolioInfo && !force) return;

    try {
      const entry: CacheEntry<PortfolioInfo> = {
        data: info,
        timestamp: Date.now(),
      };
      this.memoryCache.set(CACHE_KEYS.PORTFOLIO_INFO, entry);
      await AsyncStorage.setItem(
        CACHE_KEYS.PORTFOLIO_INFO,
        JSON.stringify(entry),
      );

      this.sessionFlags.portfolioInfo = true;
      console.log(
        "[Cache] Portfolio info saved:",
        info.positions?.length,
        "positions",
      );
    } catch (error) {
      console.error("[Cache] Error saving portfolio info:", error);
    }
  }

  /**
   * Get cached portfolio info
   */
  async getPortfolioInfo(): Promise<PortfolioInfo | null> {
    try {
      // Try memory cache first
      const memCached = this.memoryCache.get(CACHE_KEYS.PORTFOLIO_INFO);
      if (
        memCached &&
        !this.isExpired(memCached, CACHE_EXPIRY.PORTFOLIO_INFO)
      ) {
        console.log("[Cache] Portfolio info from memory");
        return memCached.data;
      }

      // Fall back to AsyncStorage
      const stored = await AsyncStorage.getItem(CACHE_KEYS.PORTFOLIO_INFO);
      if (stored) {
        const entry: CacheEntry<PortfolioInfo> = JSON.parse(stored);
        if (!this.isExpired(entry, CACHE_EXPIRY.PORTFOLIO_INFO)) {
          this.memoryCache.set(CACHE_KEYS.PORTFOLIO_INFO, entry);
          console.log("[Cache] Portfolio info from storage");
          return entry.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[Cache] Error getting portfolio info:", error);
      return null;
    }
  }

  /**
   * Save user profile to cache
   */
  async saveUserProfile(user: User): Promise<void> {
    // User profile is usually updated explicitly, can keep as is or add flag logic.
    // Usually auth flow fetches once, but if updated, we probable want to save.
    // Given the request was specifically for "Stocks (landing)" and implicitly others being periodic,
    // I'll leave user profile as is (it's not high frequency), OR valid to add flag.
    // Let's add flag for consistency since I declared it.
    if (this.sessionFlags.userProfile) return;

    try {
      const entry: CacheEntry<User> = {
        data: user,
        timestamp: Date.now(),
      };
      this.memoryCache.set(CACHE_KEYS.USER_PROFILE, entry);
      await AsyncStorage.setItem(
        CACHE_KEYS.USER_PROFILE,
        JSON.stringify(entry),
      );
      this.sessionFlags.userProfile = true;
      console.log("[Cache] User profile saved:", user.name);
    } catch (error) {
      console.error("[Cache] Error saving user profile:", error);
    }
  }

  /**
   * Get cached user profile
   */
  async getUserProfile(): Promise<User | null> {
    try {
      const memCached = this.memoryCache.get(CACHE_KEYS.USER_PROFILE);
      if (memCached && !this.isExpired(memCached, CACHE_EXPIRY.USER_PROFILE)) {
        console.log("[Cache] User profile from memory");
        return memCached.data;
      }

      const stored = await AsyncStorage.getItem(CACHE_KEYS.USER_PROFILE);
      if (stored) {
        const entry: CacheEntry<User> = JSON.parse(stored);
        if (!this.isExpired(entry, CACHE_EXPIRY.USER_PROFILE)) {
          this.memoryCache.set(CACHE_KEYS.USER_PROFILE, entry);
          console.log("[Cache] User profile from storage");
          return entry.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[Cache] Error getting user profile:", error);
      return null;
    }
  }

  /**
   * Clear all cache (useful on logout)
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();
      // Reset flags
      this.sessionFlags = {
        landingStocks: false,
        portfolioInfo: false,
        userProfile: false,
        tradeHistory: false,
        transactions: false,
      };
      await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
      console.log("[Cache] All cache cleared");
    } catch (error) {
      console.error("[Cache] Error clearing cache:", error);
    }
  }

  /**
   * Clear user-specific cache (portfolio, user profile, history)
   * Keep landing stocks as they are not user-specific
   */
  async clearUserCache(): Promise<void> {
    try {
      this.memoryCache.delete(CACHE_KEYS.PORTFOLIO_INFO);
      this.memoryCache.delete(CACHE_KEYS.USER_PROFILE);
      this.memoryCache.delete(CACHE_KEYS.TRADE_HISTORY);
      this.memoryCache.delete(CACHE_KEYS.TRANSACTIONS);

      this.sessionFlags.portfolioInfo = false;
      this.sessionFlags.userProfile = false;
      this.sessionFlags.tradeHistory = false;
      this.sessionFlags.transactions = false;

      await AsyncStorage.multiRemove([
        CACHE_KEYS.PORTFOLIO_INFO,
        CACHE_KEYS.USER_PROFILE,
        CACHE_KEYS.TRADE_HISTORY,
        CACHE_KEYS.TRANSACTIONS,
      ]);
      console.log("[Cache] User cache cleared");
    } catch (error) {
      console.error("[Cache] Error clearing user cache:", error);
    }
  }

  /**
   * Save trade history to cache
   */
  async saveTradeHistory(orders: Order[], force = false): Promise<void> {
    if (this.sessionFlags.tradeHistory && !force) return;

    try {
      const entry: CacheEntry<Order[]> = {
        data: orders,
        timestamp: Date.now(),
      };
      this.memoryCache.set(CACHE_KEYS.TRADE_HISTORY, entry);
      await AsyncStorage.setItem(
        CACHE_KEYS.TRADE_HISTORY,
        JSON.stringify(entry),
      );
      this.sessionFlags.tradeHistory = true;
      console.log("[Cache] Trade history saved:", orders.length, "orders");
    } catch (error) {
      console.error("[Cache] Error saving trade history:", error);
    }
  }

  /**
   * Get cached trade history
   */
  async getTradeHistory(): Promise<Order[] | null> {
    try {
      const memCached = this.memoryCache.get(CACHE_KEYS.TRADE_HISTORY);
      if (memCached && !this.isExpired(memCached, CACHE_EXPIRY.TRADE_HISTORY)) {
        console.log("[Cache] Trade history from memory");
        return memCached.data;
      }

      const stored = await AsyncStorage.getItem(CACHE_KEYS.TRADE_HISTORY);
      if (stored) {
        const entry: CacheEntry<Order[]> = JSON.parse(stored);
        if (!this.isExpired(entry, CACHE_EXPIRY.TRADE_HISTORY)) {
          this.memoryCache.set(CACHE_KEYS.TRADE_HISTORY, entry);
          console.log("[Cache] Trade history from storage");
          return entry.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[Cache] Error getting trade history:", error);
      return null;
    }
  }

  /**
   * Save transactions to cache
   */
  async saveTransactions(
    transactions: Transaction[],
    force = false,
  ): Promise<void> {
    if (this.sessionFlags.transactions && !force) return;

    try {
      const entry: CacheEntry<Transaction[]> = {
        data: transactions,
        timestamp: Date.now(),
      };
      this.memoryCache.set(CACHE_KEYS.TRANSACTIONS, entry);
      await AsyncStorage.setItem(
        CACHE_KEYS.TRANSACTIONS,
        JSON.stringify(entry),
      );
      this.sessionFlags.transactions = true;
      console.log("[Cache] Transactions saved:", transactions.length, "items");
    } catch (error) {
      console.error("[Cache] Error saving transactions:", error);
    }
  }

  /**
   * Get cached transactions
   */
  async getTransactions(): Promise<Transaction[] | null> {
    try {
      const memCached = this.memoryCache.get(CACHE_KEYS.TRANSACTIONS);
      if (memCached && !this.isExpired(memCached, CACHE_EXPIRY.TRANSACTIONS)) {
        console.log("[Cache] Transactions from memory");
        return memCached.data;
      }

      const stored = await AsyncStorage.getItem(CACHE_KEYS.TRANSACTIONS);
      if (stored) {
        const entry: CacheEntry<Transaction[]> = JSON.parse(stored);
        if (!this.isExpired(entry, CACHE_EXPIRY.TRANSACTIONS)) {
          this.memoryCache.set(CACHE_KEYS.TRANSACTIONS, entry);
          console.log("[Cache] Transactions from storage");
          return entry.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[Cache] Error getting transactions:", error);
      return null;
    }
  }

  /**
   * Preload cache into memory on app start
   * This ensures instant data availability
   */
  async preloadCache(): Promise<void> {
    try {
      console.log("[Cache] Preloading cache...");
      const keys = [
        CACHE_KEYS.LANDING_STOCKS,
        CACHE_KEYS.PORTFOLIO_INFO,
        CACHE_KEYS.USER_PROFILE,
        CACHE_KEYS.TRADE_HISTORY,
        CACHE_KEYS.TRANSACTIONS,
      ];

      const results = await AsyncStorage.multiGet(keys);

      for (const [key, value] of results) {
        if (value) {
          try {
            const entry = JSON.parse(value);
            this.memoryCache.set(key, entry);
          } catch {
            // Invalid JSON, skip
          }
        }
      }
      console.log(
        "[Cache] Preload complete, items in memory:",
        this.memoryCache.size,
      );
    } catch (error) {
      console.error("[Cache] Error preloading cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    landingStocksAge: number | null;
    portfolioInfoAge: number | null;
    userProfileAge: number | null;
  }> {
    const now = Date.now();
    const stats = {
      landingStocksAge: null as number | null,
      portfolioInfoAge: null as number | null,
      userProfileAge: null as number | null,
    };

    const landing = this.memoryCache.get(CACHE_KEYS.LANDING_STOCKS);
    if (landing) stats.landingStocksAge = now - landing.timestamp;

    const portfolio = this.memoryCache.get(CACHE_KEYS.PORTFOLIO_INFO);
    if (portfolio) stats.portfolioInfoAge = now - portfolio.timestamp;

    const user = this.memoryCache.get(CACHE_KEYS.USER_PROFILE);
    if (user) stats.userProfileAge = now - user.timestamp;

    return stats;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>, maxAge: number): boolean {
    return Date.now() - entry.timestamp > maxAge;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
