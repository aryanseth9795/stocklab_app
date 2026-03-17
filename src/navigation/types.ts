import { NavigatorScreenParams } from "@react-navigation/native";
import { Stock } from "../types";

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Commodities: undefined;
  Portfolio: undefined;
  History: undefined;
  Account: undefined;
};

// Root Stack (main tabs + auth modals + detail screens)
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  StockDetail: { stock: Stock };
  CommodityDetail: { commodity: import("../types").Commodity };
  EditProfile: undefined;
  Dashboard: undefined;
};

// For useNavigation typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
