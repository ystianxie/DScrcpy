<template>
  <div style='width: 100%;'>
    <el-row :span="24">
      <div id="drag-region" style="flex-grow:1"></div>
    </el-row>
    <el-row>
      <el-col :span="12">
        <div>设备选择</div>
        <el-row style="margin-bottom: 5px;">
          <el-col :span="14" style="flex: 1">
            <el-select v-model="deviceId" placeholder=" ">
              <el-option
                  v-for="device in deviceList"
                  :key="device.value"
                  :label="device.label"
                  :value="device.value"
                  :disabled="device.disabled"
              />

            </el-select>
          </el-col>
          <el-col :span="5" style="margin: 0 5px 0 5px">
            <el-button @click="refreshDevice">刷新</el-button>
          </el-col>
          <el-col :span="5" style="flex: 0">
            <el-button @click="projectionDisplay">投屏</el-button>
          </el-col>
        </el-row>
        <el-row style="margin-bottom: 5px;">
          <el-col :span="6" style="margin-left: 5px">
            <el-checkbox v-model="displayConfig.closeScreen" label="自动息屏" size="small"/>
          </el-col>
          <el-col :span="6">
            <el-checkbox v-model="displayConfig.stayAwake" label="保持唤醒" size="small"/>
          </el-col>
          <el-col :span="6">
            <el-checkbox v-model="displayConfig.alwaysOnTop" label="窗口置顶" size="small"/>
          </el-col>
          <el-col :span="5">
            <el-checkbox v-model="autoRefresh.enabled" @change="autoRefreshEvent" label="自动刷新" size="small"/>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="6" style="margin-left: 5px">
            <el-checkbox v-model="displayConfig.pushToSDCard" label="推到SD卡" size="small"/>
          </el-col>
          <el-col :span="6">
            <el-checkbox v-model="displayConfig.screenPointer" @change="screenPointerEvent" label="屏幕指针"
                         size="small"/>
          </el-col>
        </el-row>
        <div>快捷命令</div>
        <el-row>
          <el-col :span="14" style="flex: 1">
            <el-autocomplete
                v-model="state"
                :fetch-suggestions="commandSearch"
                clearable
                class="inline-input w-50"
                placeholder=""
                @select="handleSelect"
                @change="changeSelect"
            />
          </el-col>
          <el-col :span="5" style="margin: 0 5px 0 5px">
            <el-button @click="sendCommand('Quick')" @contextmenu="sendCommand('Quick',true)" title="右键高级运行！">
              运行
            </el-button>
          </el-col>
          <el-col :span="5" style="flex: 0">
            <el-button @click="CommandDig = true;addCommandSwitch=false">管理</el-button>

          </el-col>
          <el-dialog
              v-model="CommandDig"
              title="命令管理"
              width="50%"
              align-center
          >
            <div v-for="command in restaurants.value" :key="command.value">
              <el-alert :title="`${command.value} --- ${command.link}`" @close="delCommandBtn(command.value)"
                        style="margin-bottom: 2px;color: black" type="success" close-text="删"/>
            </div>

            <el-button @click="addCommandSwitch = !addCommandSwitch" style="margin-top: 10px">新增</el-button>

            <div v-show="addCommandSwitch">
              <div>短语</div>
              <el-input v-model="addCommand.value"></el-input>
              <div>命令</div>
              <el-input v-model="addCommand.link"></el-input>
              <div style="display: flex;justify-content: space-between;align-items: center">
                <span>使用`{}`设置变量,如：`{应用ID}`</span>
                <el-button type="primary" @click="addCommandBtn" style="margin-top: 5px">
                  添加
                </el-button>
              </div>

            </div>

            <template #footer>
      <span class="dialog-footer">
        <el-button @click="CommandDig = false">完成</el-button>

      </span>
            </template>
          </el-dialog>
          <el-col v-if="fillKey">
            <div v-for="(padding,index) in fillKey" :key="index">
              <div>{{ padding.title }}</div>
              <el-input v-model="padding.value"></el-input>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 10px">
          <el-col :span="14" style="flex: 1">
            <el-input v-model="commandInput" placeholder="devices" @keydown="commandInputKeyDown">
              <template #prepend>adb</template>
            </el-input>
          </el-col>
          <el-col :span="5" style="margin: 0 5px 0 5px">
            <el-button @click="sendCommand('input')" @contextmenu="sendCommand('input',true)" title="右键高级运行！">
              运行
            </el-button>
          </el-col>
          <el-col :span="5" style="flex: 0">
            <el-button @click="stopCommand">停止</el-button>
          </el-col>
        </el-row>
        <div style="margin-top: 10px">无线连接</div>
        <el-row>
          <el-col :span="8" style="flex: 1">
            <el-input v-model="wifiConnectionConfig.ip" placeholder="10.0.0.212"/>
          </el-col>
          <el-col :span="1" style="display: flex;justify-content: center">:</el-col>
          <el-col :span="5" style="flex: 1">
            <el-input v-model="wifiConnectionConfig.port" placeholder="5555"/>
          </el-col>
          <el-col :span="5" style="margin: 0 5px 0 5px">
            <el-button @click="sendCommand('wifiC')">连接</el-button>
          </el-col>
          <el-col :span="5" style="flex: 0">
            <el-button @click="sendCommand('wifiD')">断开</el-button>
          </el-col>
        </el-row>
      </el-col>
      <el-col :span="11" style="margin-left: 20px">
        <el-row>
          <div @click="logList = []" style="cursor:pointer" title="清空日志">日志</div>
        </el-row>
        <el-row>
          <el-table
              ref="logContainer"
              :data="logList"
              :style="{width:'100%', height: logFrameHeight}"
              :row-class-name='tableRowClassName'
          >
            <el-table-column prop="date" width="85"/>
            <el-table-column prop="info" width="190"/>

          </el-table>
        </el-row>
      </el-col>
    </el-row>

  </div>

</template>

<script>
import {ElMessage} from 'element-plus'

let isDragging = false;
let mousePosition = {x: 0, y: 0};
export default {
  data() {
    return {
      state: "",
      restaurants: {},
      fillValue: {},
      fillKey: [],
      logFrameHeight: "254px",
      CommandDig: false,
      addCommandSwitch: false,
      addCommand: {},
      deviceList: [],
      deviceId: "",
      displayConfig: {
        closeScreen: true,
        stayAwake: true,
        alwaysOnTop: false,
        borderless: false,
        pushToSDCard: false,
        screenPointer: false
      },
      userCommandValue: {},
      autoRefresh: {
        enabled: true,
        timer: null
      },
      commandInput: "",
      wifiConnectionConfig: {
        ip: "",
        port: ""
      },
      logList: [
        {data: getDate(), info: "author:Dmj", level: "debug"},
        {data: getDate(), info: "github:https://github.com/ystianxie/DScrcpy", level: "debug"},
        {data: getDate(), info: "scrcpy版本2.1.1", level: "debug"},
        {data: getDate(), info: "点击`日志`清空内容", level: "debug"},
        {data: getDate(), info: "右键点击`运行`使用控制台打开", level: "debug"}
      ],
    }
  },
  methods: {
    refreshDevice() {
      console.log('刷新设备')
      if (window.ipcRenderer) {
        window.ipcRenderer.send("sendCommandReq", {onCommand: "adb devices", senior: false, single: true})
        window.ipcRenderer.once("refreshDeviceResp", (event, deviceList) => {
          this.deviceList = []
          for (let device of deviceList) {
            let [deviceId, status] = device.split("\t")
            this.deviceList.push({label: deviceId, value: deviceId, disabled: status !== "device"})
          }
          if (this.deviceList.length > 0 && !this.deviceList.some(device => device.value === this.deviceId)) {
            this.deviceId = this.deviceList[0].value
          } else if (this.deviceList.length === 0) {
            this.deviceId = ""
          }
        })
      }
    },
    projectionDisplay() {
      console.log('投屏')
      let commandBox = []
      if (this.deviceId) {
        commandBox = ['-s', this.deviceId]
      }
      if (this.displayConfig.pushToSDCard) {
        commandBox.push("--push-target=/sdcard")
      } else {
        commandBox.push("--push-target=/data/local/tmp/")
      }
      if (this.displayConfig.stayAwake && this.displayConfig.closeScreen) {
        commandBox.push("-Sw")
      } else if (this.displayConfig.stayAwake) {
        commandBox.push("-w")
      } else if (this.displayConfig.closeScreen) {
        commandBox.push("-S")
      }
      if (this.displayConfig.alwaysOnTop) {
        commandBox.push("--always-on-top")
      }
      if (this.displayConfig.borderless) {
        commandBox.push("--window-borderless")
      }
      if (window.ipcRenderer) {
        window.ipcRenderer.send("projectionDisplayReq", commandBox)
      }
    },
    commandInputKeyDown(event) {
      if (event.altKey && event.keyCode === 13) {
        this.sendCommand("input", true);
      } else if (event.keyCode === 13) {
        this.sendCommand("input", false);
      }
    },
    sendCommand(method, senior) {
      console.log("发送命令")
      let onCommand
      if (method === 'Quick') {
        if (!this.state) return
        let command_ = this.restaurants.value.find(data => data.value === this.state)
        onCommand = command_.link
        for (let key of this.fillKey) {
          if (!key.value) {
            return this.addLog("缺少参数", "error");
          }
          this.userCommandValue[command_.value][key.title] = key.value
          onCommand = onCommand.replace(`{${key.title}}`, key.value)
        }
        if (onCommand.indexOf("-s") === -1 && onCommand.indexOf("adb") !== -1 && this.deviceId) {
          onCommand = onCommand.replace("adb ", "")
          onCommand = `adb -s ${this.deviceId} ${onCommand}`
        }
        this.addLog(`快捷命令：${onCommand}`, 'debug')
      } else if (method === "wifiC") {
        if (!this.wifiConnectionConfig.ip) this.wifiConnectionConfig.ip = "10.0.0.212"
        if (!this.wifiConnectionConfig.port) this.wifiConnectionConfig.port = "5555"
        onCommand = `adb connect ${this.wifiConnectionConfig.ip}:${this.wifiConnectionConfig.port}`
        this.addLog(`连接adb：${onCommand}`, 'debug')
      } else if (method === "wifiD") {
        if (!this.wifiConnectionConfig.ip) return
        if (!this.wifiConnectionConfig.port) this.wifiConnectionConfig.port = "5555"
        onCommand = `adb disconnect ${this.wifiConnectionConfig.ip}:${this.wifiConnectionConfig.port}`
        this.addLog(`断开adb：${onCommand}`, 'debug')
      } else if (method === "screenPointer") {
        onCommand = ` shell settings put system pointer_location `
        onCommand = (this.deviceId ? `adb -s ${this.deviceId}` : "adb") + onCommand
        onCommand = onCommand + (this.displayConfig.screenPointer ? "1" : "0")
      } else {
        onCommand = "adb " + this.commandInput
        if (!this.commandInput) return
        this.addLog(`运行命令：${onCommand}`, 'debug')
      }
      if (window.ipcRenderer) {
        window.ipcRenderer.send("sendCommandReq", {onCommand, senior})
      }
    },
    stopCommand() {
      console.log("停止命令")
      if (window.ipcRenderer) {
        window.ipcRenderer.send("stopCommandReq", 'stopCommand')
        this.addLog(`结束当前命令`, 'success')

      }
    },
    autoRefreshEvent() {
      console.log("自动刷新")
      if (this.autoRefresh.enabled) {
        this.autoRefresh.timer = setInterval(() => {
          this.refreshDevice()
        }, 5000)
      } else if (this.autoRefresh.timer) {
        clearInterval(this.autoRefresh.timer)
      }
    },
    screenPointerEvent() {
      console.log("屏幕指针")
      this.sendCommand('screenPointer', false)
    },
    tableRowClassName({row, rowIndex}) {
      return row.level ? row.level + "-row" : ""
    },
    commandSearch(queryString, cb) {
      const results = queryString
          ? this.restaurants.value.filter(createFilter(queryString))
          : this.restaurants.value
      cb(results)
    },
    handleSelect(item) {
      if (!this.userCommandValue[item.value]) this.userCommandValue[item.value] = {}
      this.fillKey = []
      let fillMay = item.link.match(/\{([^{}]+)\}/g);
      for (let key of fillMay || []) {
        key = key.replace(/\{|\}/g, "");
        this.fillKey.push({title: key, value: this.userCommandValue[item.value][key] || ""})
      }
      // 更改日志框高度
      this.logFrameHeight = 254 + this.fillKey.length * 54 + "px"
    },
    changeSelect(item) {
      if (!this.userCommandValue[item.value]) this.userCommandValue[item.value] = {}
      this.fillKey = []
      let onCommand = this.restaurants.value.find(data => data.value === item)
      if (onCommand) {
        let fillMay = onCommand.link.match(/\{([^{}]+)\}/g);
        for (let key of fillMay || []) {
          key = key.replace(/\{|\}/g, "");
          this.fillKey.push({title: key, value: this.userCommandValue[item.value][key] || ""})
        }
      }
      if (!this.fillKey.length) this.logFrameHeight = "254px";
    },
    addCommandBtn() {
      console.log("添加命令", this.addCommand)
      if (!this.addCommand.value || !this.addCommand.link) {
        return ""
      }
      let allCommandKey = this.restaurants.value.map(item => item.value)
      if (allCommandKey.indexOf(this.addCommand.value) !== -1) {
        return ElMessage.error('短语已存在，请重新输入！')
      }
      this.restaurants.value.push(this.addCommand)
      this.addCommand = {}
      window.ipcRenderer.send("saveCommandCollectionReq", recursiveUnproxy(this.restaurants.value))
    },
    delCommandBtn(commandTitle) {
      console.log("删除命令", commandTitle)
      const index = this.restaurants.value.findIndex(option => option.value === commandTitle);
      console.log(index)
      if (index > -1) {
        this.restaurants.value.splice(index, 1);
        ElMessage.success("删除成功！")
        console.log(recursiveUnproxy(this.restaurants.value))
        window.ipcRenderer.send("saveCommandCollectionReq", recursiveUnproxy(this.restaurants.value))
      } else {
        ElMessage.error("短语不存在！")
      }
    },
    addLog(msg, level) {
      console.log('添加用户日志')
      if (!msg) return
      this.logList.push({date: getDate(), info: msg, level: level})
      this.$nextTick(() => {
        const logContainer = this.$refs.logContainer
        if (!logContainer) return
        const container = logContainer.$el.querySelector(".el-scrollbar__wrap");
        if (container) {
          container.scrollTo(0, container.scrollHeight);
        }
      });
    },
    addLog2(event, args) {
      this.addLog(args.msg, args.level)
    },
    ccLog(event, arg) {
      console.log('接收到日志:', arg)
    }

  },
  created() {
    this.refreshDevice()
    this.autoRefreshEvent()
    if (window.ipcRenderer) {
      window.ipcRenderer.on('log', this.ccLog)
      window.ipcRenderer.on("userLog", this.addLog2)
      window.ipcRenderer.send("CommandCollectionReq", "")
      window.ipcRenderer.once("CommandCollectionResp", (e, args) => {
        this.restaurants.value = args
      })
    }
    setTimeout(() => {
          // 创建支持窗口拖转到div
          const dragHandle = document.getElementById('app');

          dragHandle.addEventListener('mousedown', (event) => {
            if (event.clientY > 30) return
            isDragging = true;
            mousePosition.x = event.screenX;
            mousePosition.y = event.screenY;
            window.ipcRenderer.send('drag-start');
          });

          document.addEventListener('mousemove', (event) => {
            if (isDragging) {
              let deltaX = event.screenX - mousePosition.x;
              let deltaY = event.screenY - mousePosition.y;
              window.ipcRenderer.send('dragging', {deltaX, deltaY});
            }
          });

          document.addEventListener('mouseup', () => {
            if (isDragging) {
              isDragging = false;
              window.ipcRenderer.send('drag-end');

            }
          });
        }, 1000
    )
  },
  beforeUnmount() {
    window.ipcRenderer.removeListener('log', this.ccLog)
    window.ipcRenderer.removeListener('userLog', this.addLog2)
  }

}

function createFilter(queryString) {
  return (restaurant) => {
    return (
        restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
    )
  }
}

function recursiveUnproxy(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => recursiveUnproxy(item));
  }

  const unproxiedObj = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      unproxiedObj[key] = recursiveUnproxy(obj[key]);
    }
  }
  return unproxiedObj;
}


function getDate() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

if (window.require && !window.ipcRenderer) {
  window.ipcRenderer = window.require('electron').ipcRenderer
}
</script>

<style>
.el-table .info-row {
  --el-table-tr-bg-color: var(--el-color-info-light-9);
}

.el-table .warning-row {
  --el-table-tr-bg-color: var(--el-color-warning-light-5);
}

.el-table .success-row {
  --el-table-tr-bg-color: var(--el-color-success-light-5);
}

.el-table .error-row {
  --el-table-tr-bg-color: var(--el-color-error-light-3);
}

.el-table .el-table__header {
  display: none;
}

。el-alert__title {
  margin-right: 10px;
}

</style>