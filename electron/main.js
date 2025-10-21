const { app, BrowserWindow, dialog, ipcMain, protocol, screen } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const isDev = process.env.NODE_ENV !== "production";

/** @type {BrowserWindow | null} */
let controlWindow = null;
/** @type {BrowserWindow | null} */
let outputWindow = null;

const defaultState = {
  primaryText: "Live News Update",
  secondaryText: "Breaking details go here",
  primaryBg: "#FF2E63",
  secondaryBg: "#252A34",
  position: "bottom-left",
  visible: false,
  lowerThirdMode: "text",
  lowerThirdVideoSrc: "",
  lowerThirdVideoLoop: false,
  fullscreenVideos: [],
  fullscreenVideoSelectedId: null,
  fullscreenVideoActiveId: null,
  fullscreenVideoVisible: false,
  fullscreenVideoPlaying: false,
  fullscreenVideoTrigger: 0,
  fullscreenVideoFadeMs: 600,
  logoEnabled: false,
  logoSrc: "",
  logoPosition: "top-right",
  logoLoop: true,
  displayId: null,
  outputActive: false,
  backgroundColor: "#00FF00"
};

let lowerThirdState = { ...defaultState };
const MEDIA_PROTOCOL = "app-media";

const encodePath = (filePath) =>
  Buffer.from(filePath, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const decodePath = (token) => {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = `${base64}${"=".repeat(padding)}`;
  return Buffer.from(padded, "base64").toString("utf8");
};

const createMediaUrl = (filePath) => {
  const encodedPath = encodePath(filePath);
  const extension = path.extname(filePath).replace(".", "").toLowerCase();
  const query = extension ? `?ext=${encodeURIComponent(extension)}` : "";
  return `${MEDIA_PROTOCOL}://${encodedPath}${query}`;
};

const resolveUrl = (mode) => {
  if (isDev) {
    return `http://localhost:5173/?mode=${mode}`;
  }

  const fileUrl = pathToFileURL(path.join(__dirname, "../dist/index.html"));
  return `${fileUrl.toString()}?mode=${mode}`;
};

const createControlWindow = () => {
  controlWindow = new BrowserWindow({
    width: 520,
    height: 820,
    minWidth: 400,
    minHeight: 600,
    title: "Lower Thirds Control",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlWindow.loadURL(resolveUrl("control"));

  controlWindow.on("closed", () => {
    controlWindow = null;
  });

  controlWindow.webContents.on("did-finish-load", () => {
    controlWindow?.webContents.send("lowerThird:state", lowerThirdState);
    sendDisplayList();
  });
};

const getDisplayList = () => {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  return displays.map((display, index) => ({
    id: display.id,
    label: display.label || `Display ${index + 1}`,
    isPrimary: display.id === primaryId,
    bounds: display.bounds
  }));
};

const getTargetDisplay = () => {
  const displays = getDisplayList();
  let target =
    displays.find((display) => display.id === lowerThirdState.displayId) || null;

  if (!target) {
    const externalFallback = displays.find((display) => !display.isPrimary);
    target = externalFallback || displays[0];
    if (target && lowerThirdState.displayId !== target.id) {
      lowerThirdState = { ...lowerThirdState, displayId: target.id };
    }
  }

  return target;
};

const focusOutputOnDisplay = (displayId) => {
  if (typeof displayId === "number" || displayId === null) {
    lowerThirdState = { ...lowerThirdState, displayId };
  }

  const targetDisplay = getTargetDisplay();
  if (outputWindow && targetDisplay) {
    outputWindow.setBounds(targetDisplay.bounds);
  }

  broadcastState();
};

const getTargetDisplayBounds = () => {
  const target = getTargetDisplay();
  return target ? target.bounds : screen.getPrimaryDisplay().bounds;
};

const sendDisplayList = () => {
  const list = getDisplayList();
  if (controlWindow) {
    controlWindow.webContents.send("display:list", list);
  }
};

const createOutputWindow = () => {
  const targetDisplay = getTargetDisplay();
  const targetBounds = targetDisplay
    ? targetDisplay.bounds
    : screen.getPrimaryDisplay().bounds;

  if (targetDisplay && lowerThirdState.displayId !== targetDisplay.id) {
    lowerThirdState = { ...lowerThirdState, displayId: targetDisplay.id };
  }

  if (outputWindow) {
    if (targetDisplay) {
      outputWindow.setBounds(targetBounds);
    }
    outputWindow.focus();
    if (!lowerThirdState.outputActive) {
      lowerThirdState = { ...lowerThirdState, outputActive: true };
      broadcastState();
    }
    return outputWindow;
  }

  outputWindow = new BrowserWindow({
    x: targetBounds.x,
    y: targetBounds.y,
    width: targetBounds.width,
    height: targetBounds.height,
    frame: false,
    fullscreen: false,
    kiosk: true,
    resizable: false,
    movable: false,
    focusable: true,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  outputWindow.setAlwaysOnTop(true, "screen-saver");
  outputWindow.setMenuBarVisibility(false);
  outputWindow.loadURL(resolveUrl("display"));

  outputWindow.on("closed", () => {
    outputWindow = null;
    lowerThirdState = { ...lowerThirdState, outputActive: false };
    broadcastState();
  });

  outputWindow.webContents.on("did-finish-load", () => {
    outputWindow?.webContents.send("lowerThird:state", lowerThirdState);
  });

  lowerThirdState = { ...lowerThirdState, outputActive: true };
  broadcastState();
};

const broadcastState = () => {
  if (outputWindow) {
    outputWindow.webContents.send("lowerThird:state", lowerThirdState);
  }
  if (controlWindow) {
    controlWindow.webContents.send("lowerThird:state", lowerThirdState);
  }
};

app.whenReady().then(() => {
  protocol.registerFileProtocol(MEDIA_PROTOCOL, (request, callback) => {
    try {
      const stripped = request.url.replace(`${MEDIA_PROTOCOL}://`, "");
      const [encoded] = stripped.split("?");
      const decodedPath = decodePath(encoded);
      callback({ path: decodedPath });
    } catch (error) {
      console.error("Failed to resolve media protocol path", error);
      callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
    }
  });

  createControlWindow();
  sendDisplayList();
  broadcastState();

  screen.on("display-added", () => {
    sendDisplayList();
    focusOutputOnDisplay(lowerThirdState.displayId);
  });

  screen.on("display-removed", () => {
    sendDisplayList();
    focusOutputOnDisplay(lowerThirdState.displayId);
  });

  screen.on("display-metrics-changed", () => {
    focusOutputOnDisplay(lowerThirdState.displayId);
    sendDisplayList();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("lowerThird:get", () => {
  return lowerThirdState;
});

ipcMain.on("lowerThird:update", (_event, payload) => {
  lowerThirdState = { ...lowerThirdState, ...payload };
  broadcastState();
});

ipcMain.handle("display:list", () => {
  return getDisplayList();
});

ipcMain.handle("display:set", (_event, displayId) => {
  focusOutputOnDisplay(displayId);
  return lowerThirdState;
});

ipcMain.handle("logo:pick", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Animated Logo",
    buttonLabel: "Use Logo",
    filters: [
      {
        name: "Media",
        extensions: ["webm", "mp4", "mov", "gif", "apng", "png"]
      }
    ],
    properties: ["openFile"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  return createMediaUrl(filePath);
});

ipcMain.handle("lowerThirdVideo:pick", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Lower Third Video",
    buttonLabel: "Use Clip",
    filters: [
      {
        name: "Video",
        extensions: ["webm", "mp4", "mov"]
      }
    ],
    properties: ["openFile"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  return createMediaUrl(filePath);
});

ipcMain.handle("fullscreenVideo:pick", async () => {
  const result = await dialog.showOpenDialog({
    title: "Add Fullscreen Videos",
    buttonLabel: "Add Clip",
    filters: [
      {
        name: "Video",
        extensions: ["webm", "mp4", "mov", "m4v", "mkv"]
      }
    ],
    properties: ["openFile", "multiSelections"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  return result.filePaths.map((filePath) => ({
    src: createMediaUrl(filePath),
    name: path.basename(filePath)
  }));
});

ipcMain.handle("output:start", () => {
  createOutputWindow();
  return lowerThirdState;
});

ipcMain.handle("output:stop", () => {
  if (outputWindow) {
    outputWindow.close();
  } else if (lowerThirdState.outputActive) {
    lowerThirdState = { ...lowerThirdState, outputActive: false };
    broadcastState();
  }
  return lowerThirdState;
});
