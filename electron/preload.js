const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  updateLowerThird: (payload) => ipcRenderer.send("lowerThird:update", payload),
  requestLowerThirdState: () => ipcRenderer.invoke("lowerThird:get"),
  listDisplays: () => ipcRenderer.invoke("display:list"),
  setDisplay: (displayId) => ipcRenderer.invoke("display:set", displayId),
  startOutput: () => ipcRenderer.invoke("output:start"),
  stopOutput: () => ipcRenderer.invoke("output:stop"),
  chooseLogoFile: () => ipcRenderer.invoke("logo:pick"),
  chooseLowerThirdVideo: () => ipcRenderer.invoke("lowerThirdVideo:pick"),
  onLowerThirdUpdate: (callback) => {
    if (typeof callback !== "function") return;
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("lowerThird:state", listener);
    return () => ipcRenderer.removeListener("lowerThird:state", listener);
  },
  onDisplayList: (callback) => {
    if (typeof callback !== "function") return;
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("display:list", listener);
    return () => ipcRenderer.removeListener("display:list", listener);
  }
});
