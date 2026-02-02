import { useEffect, useState, useCallback } from "react";
import * as Updates from "expo-updates";
import { Alert } from "react-native";

interface UpdateState {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  isDownloading: boolean;
}

export default function useOTAUpdates() {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    isUpdateAvailable: false,
    isDownloading: false,
  });

  const checkForUpdates = useCallback(async () => {
    // Log current update info for debugging
    console.log("[OTA] Update channel:", Updates.channel);
    console.log("[OTA] Runtime version:", Updates.runtimeVersion);
    console.log("[OTA] Is embedded launch:", Updates.isEmbeddedLaunch);

    // Skip update check if updates are not enabled (development builds)
    if (!Updates.isEnabled) {
      console.log("[OTA] Updates not enabled (development mode)");
      return;
    }

    try {
      setState((prev) => ({ ...prev, isChecking: true }));
      console.log("[OTA] Checking for updates...");

      const update = await Updates.checkForUpdateAsync();
      console.log("[OTA] Check result:", update);

      if (update.isAvailable) {
        console.log("[OTA] Update available! Downloading...");
        setState((prev) => ({
          ...prev,
          isUpdateAvailable: true,
          isDownloading: true,
        }));

        // Download the update
        const fetchResult = await Updates.fetchUpdateAsync();
        console.log("[OTA] Download result:", fetchResult);

        setState((prev) => ({ ...prev, isDownloading: false }));

        // Show popup to restart
        Alert.alert(
          "Update Available",
          "A new version has been downloaded. Restart now to apply the update.",
          [
            {
              text: "Restart Now",
              onPress: async () => {
                console.log("[OTA] Restarting app to apply update...");
                await Updates.reloadAsync();
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        console.log("[OTA] App is up to date");
      }
    } catch (error: any) {
      console.error("[OTA] Error checking for updates:", error);
      console.error("[OTA] Error message:", error?.message);
      console.error("[OTA] Error code:", error?.code);
    } finally {
      setState((prev) => ({ ...prev, isChecking: false }));
    }
  }, []);

  // Check for updates on mount
  useEffect(() => {
    // Small delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
  };
}
