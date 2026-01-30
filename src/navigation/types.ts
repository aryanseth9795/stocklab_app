import { NavigatorScreenParams } from "@react-navigation/native";

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Portfolio: undefined;
  History: undefined;
  Account: undefined;
};

// Root Stack (main tabs + auth modals)
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Signup: undefined;
};

// For useNavigation typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
