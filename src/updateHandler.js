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
            console.log("installing from downloadpath")
          await invoke("install_deb", { path: downloadedPath });
        } else {
            console.log("Doanload and install triggered");
          await update.downloadAndInstall();
        }
        await relaunch();
      }
    }
  } catch (e) {
    console.error("Update check failed:", e);
  }
};