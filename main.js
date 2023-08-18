const {app, Menu, Tray, globalShortcut, BrowserWindow} = require('electron')
const {ipcMain, shell} = require('electron')
const settings = require('electron-settings');
const path = require('path');
const {exec, spawn, execSync} = require('child_process');
const fs = require('fs');
const env = Object.create(process.env);
if (process.platform === "darwin") {
    env.PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
} else {
    env.PATH = path.join(path.dirname(app.getAppPath()), "scrcpy")
}
const indexPath = path.join(__dirname, '/dist/index.html')
let localAdb = true
const adbPath = path.join(path.dirname(app.getAppPath()), 'adb');

app.commandLine.appendSwitch('wm-window-animations-disabled')
var commandCollection = settings.getSync("commandCollection");

let mainWindow
let commandProcess

function createWindow(window_x, window_y) {

    const windows = BrowserWindow.getAllWindows()
    if (mainWindow || windows.length !== 0) {
        if (!mainWindow) mainWindow = windows[0]
        console.log("窗口存在，关闭");
        mainWindow.close()
    }
    let maxWidth = 660
    let window_config = {
        width: maxWidth,
        height: 525,
        show: true,
        frame: true,
        maximizable: false,
        icon: path.join(__dirname, './src/assets/安卓logo/icon_16x16.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: false
        }
    }
    if (process.platform !== "darwin") {
        delete window_config['titleBarStyle']
        const menu = Menu.buildFromTemplate([]);
        Menu.setApplicationMenu(menu);
        maxWidth = 700
        window_config.width = maxWidth
    }

    if (window_x && window_x > 0) window_config.x = window_x
    if (window_y && window_y > 0) window_config.y = window_y
    mainWindow = new BrowserWindow(window_config)
    mainWindow.setMinimumSize(maxWidth, 525); // 设置窗口的最小尺寸

    mainWindow.loadURL(`file://${indexPath}`)

    mainWindow.on('resize', () => {
        const [width, height] = mainWindow.getSize();
        mainWindow.setSize(maxWidth, height);
    });

    mainWindow.on('closed', function () {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length !== 0) {
            mainWindow = windows[0]
        } else {
            mainWindow = null
        }
    })
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === "keyDown" && input.key === "F12") {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        }

    })
}


const currentWindow = BrowserWindow.getFocusedWindow()

// 检查应用是否已经在运行
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    // 如果已经有一个实例在运行，则退出应用
    if (currentWindow) {
        if (currentWindow.isMinimized()) currentWindow.restore()
        currentWindow.focus()
    }
    app.quit()
}


ipcMain.on('check-window-focus', (event) => {
    if (mainWindow.isFocused()) {
        mainWindow.show()
    }
});
ipcMain.on("show_window", (event) => {
    mainWindow.show()
})


function showMainWindow() {
    if (mainWindow === null) {
        createWindow()
    }
    mainWindow.show()

}


var tray = null
app.on('ready', () => {
    // 创建一个 Tray 对象，并设置图标路径
    tray = new Tray(path.join(__dirname, '/src/assets/安卓logo/icon_16x16.png'))
    const contextMenu = Menu.buildFromTemplate([
        {label: '显示', type: 'normal', click: showMainWindow},
        {type: 'separator'},
        {label: 'Quit', role: 'quit'}
    ])
    tray.setContextMenu(contextMenu)
    tray.on("double-click", showMainWindow)

})


app.on('will-quit', () => {
    // app退出时注销所有快捷键
    globalShortcut.unregisterAll()
})

let dragStartBounds; // 记录拖动开始时窗口的位置和大小

app.whenReady().then(() => {
    // 设置mac系统dock栏图标
    createWindow()
    const dockIconPath = path.join(__dirname, 'src/assets', '安卓logo/icon_32x32.png');
    app.dock.setIcon(dockIconPath);

});

ipcMain.on('drag-start', (event) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    dragStartBounds = currentWindow.getBounds();
});

ipcMain.on('dragging', (event, {deltaX, deltaY}) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const {x, y} = dragStartBounds;
    currentWindow.setPosition(x + deltaX, y + deltaY);
});

ipcMain.on('drag-end', () => {
    dragStartBounds = null;
});


ipcMain.on("projectionDisplayReq", (event, args) => {
    console.log("投屏参数：", args)

    const childProcess = spawn('scrcpy', args, {env})

    childProcess.stdout.on('data', (data) => {
        event.sender.send("userLog", {msg: data.toString(), level: "info"})
    })

    childProcess.stderr.on('data', (data) => {
        let level = data.toString().indexOf("WARN") !== -1 ? "warning" : "error"
        event.sender.send("userLog", {msg: data.toString(), level: level})
    })

    childProcess.on('close', (code) => {
        event.sender.send("userLog", {msg: "投屏已关闭", level: 'success'})
    })
    childProcess.on("error", (error) => {
        event.sender.send("userLog", {msg: "投屏失败！", level: 'error'})
    });
})

ipcMain.on("sendCommandReq", (event, args) => {
    console.log("运行命令：", args)
    if (args.senior) {
        if (process.platform === "darwin") {
            let text = args.onCommand + "\nread -p \"Press any key to exit\"\n"
            fs.writeFile('userCommand.sh', text, (err) => {
                if (err) {
                    return event.sender.send("userLog", {msg: "命令运行失败", level: "error"})
                }
            })
            exec("chmod +x userCommand.sh")
            return shell.openPath("userCommand.sh")
        } else {
            let text = args.onCommand + "\npause"
            fs.writeFile('userCommand.bat', text, (err) => {
                if (err) {
                    return event.sender.send("userLog", {msg: "命令运行失败", level: "error"})
                }
            })
            return shell.openPath("userCommand.bat")
        }
    }
    if (commandProcess) {
        return event.sender.send("userLog", {msg: "有命令正在运行", level: "error"})
    }
    if (args.onCommand === "adb shell") {
        return event.sender.send("userLog", {msg: "请使用右键运行！", level: "warning"})
    } else if (args.onCommand === "adb devices" && args.single) {
        let childProcess
        if (localAdb) {
            childProcess = spawn('adb', ['devices'], {env})
        } else {
            childProcess = spawn(adbPath, ['devices'])
        }
        childProcess.stdout.on('data', (data) => {
            let devices = []
            for (let row of data.toString().split("\n")) {
                if (!row || row === " " || escape(row) === "%0D") continue
                let level = row.indexOf("device") !== -1 && row.indexOf("attached") === -1 ? "success" : "info"
                if (row.indexOf("attached") === -1) {
                    devices.push(row)
                    console.log("连接设备：", row)
                }
                event.sender.send("userLog", {msg: row, level: level})
            }
            event.reply("refreshDeviceResp", devices)

        })
        childProcess.stderr.on("data", (data) => {
            event.sender.send("userLog", {msg: data.toString(), level: 'error'})
        });
        childProcess.on("error", (error) => {
            commandProcess = null
            if (!localAdb) {
                event.sender.send("userLog", {msg: error.toString(), level: 'error'})
            }
            localAdb = false

        });
        return
    }
    let app = args.onCommand.split(" ")[0]
    let args_ = args.onCommand.split(" ").slice(1)
    if (localAdb) {
        commandProcess = spawn(app, args_, {env})
    } else if (app === "adb") {
        commandProcess = spawn(adbPath, args_)
    } else {
        commandProcess = spawn(app, args_)
    }
    commandProcess.stdout.on('data', (data) => {
        for (let row of data.toString().split("\n")) {
            if (!row) continue
            event.sender.send("userLog", {msg: row, level: 'info'})
        }
    })
    commandProcess.stderr.on('data', (msg) => {
        let level = msg.toString().indexOf("WARN") !== -1 ? "warning" : "error"
        commandProcess = null
        msg = msg.toString()
        event.sender.send("userLog", {msg, level})
    })
    commandProcess.on("error", (error) => {
        commandProcess = null
        event.sender.send("userLog", {msg: "高级命令，请使用右键运行", level: 'error'})
    });
    commandProcess.on('close', (code) => {
        commandProcess = null
        event.sender.send("userLog", {msg: "命令完成", level: 'success'})
    })
})

ipcMain.on("stopCommandReq", (event, args) => {
    if (commandProcess) {
        commandProcess.kill()
        commandProcess = null
    }
})

ipcMain.on("CommandCollectionReq", (event, args) => {
    if (!commandCollection) {
        commandCollection = [
            {value: '启动工具', link: 'adb shell su "/data/local/tmp/{tools}"'},
            {value: '查看目录文件', link: 'adb shell su -c "ls /data/local/tmp/"'},
            {
                value: 'iptable转发',
                link: 'adb shell su -c "iptables -t nat -A OUTPUT -p tcp ! -d 127.0.0.1 -m owner --uid-owner {appID} --dport 0:65535 -j DNAT --to-destination 127.0.0.1:16666"'
            }
        ]
        if (process.platform === "darwin"){
            commandCollection.push({value: '获取当前app包名', link: 'adb shell dumpsys window | grep mCurrentFocus'})
            commandCollection.push({value: '通过包名获取app userId', link: 'adb shell dumpsys package {包名} | grep userId='})
        }else {
            commandCollection.push({value: '获取当前app包名', link: 'adb shell dumpsys window | findstr mCurrentFocus'})
            commandCollection.push({value: '通过包名获取app userId', link: 'adb shell dumpsys package {包名} | findstr userId='})
        }
    }
    event.reply("CommandCollectionResp", commandCollection)

})
ipcMain.on("saveCommandCollectionReq", (event, args) => {
    settings.setSync("commandCollection", args)
})

