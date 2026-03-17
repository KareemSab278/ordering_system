import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";

export { updateHandler };

const updateHandler = async () => {
    console.log("Attempting to find updates");
  try {
    const update = await check();
    console.log("update found", update);
    if (update) {
      const yes = await ask(
        `A new version (${update.version}) is available.\n${update.notes}\n\nInstall now?`,
        { title: "Update Available", type: "info" }
      );
      if (yes) {
        let downloadedPath = null;
        console.log("Downloading update...")
        await update.download((event) => {
          if (event.event === "Finished") {
            downloadedPath = event.data?.path;
          }
        });

        if (downloadedPath) {
          console.log("installing from downloadpath");
          try {
            await invoke("install_deb", { path: downloadedPath });
            console.log("install_deb succeeded");
          } catch (err) {
            console.error("install_deb failed:", err);
            await ask(`Failed to install update: ${err}`, { title: "Install Error", type: "error" });
            return;
          }
        } else {
          console.log("Download and install triggered");
          try {
            await update.downloadAndInstall();
            console.log("downloadAndInstall succeeded");
          } catch (err) {
            console.error("downloadAndInstall failed:", err);
            await ask(`Failed to install update: ${err}`, { title: "Install Error", type: "error" });
            return;
          }
        }
        await relaunch();
      }
    } else if (update == null || !update){
      await ask ("You are already running the latest version.", { title: "No Update Available", type: "info" });
    }
  } catch (e) {
    console.error("Update check failed:", e);
  }
};