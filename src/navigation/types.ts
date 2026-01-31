import { NavigatorScreenParams } from "@react-navigation/native";
import { Stock } from "../types";

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Portfolio: undefined;
  History: undefined;
  Account: undefined;
};

// Root Stack (main tabs + auth modals + detail screens)
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Signup: undefined;
  StockDetail: { stock: Stock };
  EditProfile: undefined;
  Dashboard: undefined;
};

// For useNavigation typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
