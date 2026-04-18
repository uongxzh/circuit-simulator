# 电路模拟器 API 参考文档

## 📚 目录

1. [项目概览](#项目概览)
2. [代码结构说明](#代码结构说明)
3. [核心类和方法](#核心类和方法)
4. [扩展新元件指南](#扩展新元件指南)
5. [事件系统说明](#事件系统说明)
6. [完整代码示例](#完整代码示例)
7. [常见问题](#常见问题)

---

## 项目概览

电路模拟器是一个基于 Web 的互动教学工具，用于模拟和可视化电路行为。系统采用模块化设计，包含元件定义、电路计算和用户界面三大核心模块。

**技术栈**: Vanilla JavaScript + HTML5 Canvas

**核心功能**:
- 拖拽式电路设计
- 实时电路计算（基于欧姆定律）
- 标准电路符号绘制
- 交互式元件操作

---

## 代码结构说明

### 文件组织

```
circuit-simulator/
├── index.html           # 主页面，应用入口
├── styles.css           # 样式文件
├── js/
│   ├── components.js    # 元件类定义和数据结构
│   ├── simulator.js     # 电路分析和计算逻辑
│   ├── ui.js            # 基础UI交互
│   └── ui-enhanced.js   # 增强版绘制函数
└── API_REFERENCE.md     # 本文档
```

### 模块职责

#### 1. `components.js` - 元件模块
**职责**: 定义电路元件的数据结构和基类

**包含内容**:
- 核心类：`Component`, `Battery`, `Resistor`, `Switch`, `Ammeter`, `Voltmeter`
- 辅助类：`Point`, `Connection`, `ComponentFactory`
- 全局状态：`circuitComponents`, `connections`, `nextComponentId`
- 工具函数：`findComponentById`, `findComponentsByType`, `clearAllComponents`

**关键特性**:
- 面向对象设计，继承体系清晰
- 元件工厂模式，便于扩展新类型
- 内置坐标系统和连接点管理

#### 2. `simulator.js` - 模拟器模块
**职责**: 电路分析和计算引擎

**包含内容**:
- 主类：`CircuitSimulator`
- 算法：欧姆定律计算、图论分析、拓扑识别
- 验证：短路检测、断路检测、参数验证

**关键特性**:
- 基于图论的电路建模
- 支持串联和并联电路分析
- 实时错误检测和异常处理

#### 3. `ui.js` - 用户界面模块
**职责**: 处理用户交互和事件管理

**包含内容**:
- Canvas 事件处理：拖拽、点击、连线
- 属性面板：动态显示和更新元件属性
- 控制按钮：模拟开始/停止、清空工作区
- 实时更新：动画循环和状态显示

**关键特性**:
- 完整的拖拽系统（HTML5 Drag & Drop）
- 交互式连线功能
- 实时属性编辑
- 响应式状态更新

#### 4. `ui-enhanced.js` - 增强绘制模块
**职责**: 专业的电路符号绘制

**包含内容**:
- 标准电路符号绘制函数
- 网格背景和连接线绘制
- 选中高亮和视觉反馈
- 电流方向箭头指示

**关键特性**:
- 符合国际标准的电路符号
- 美观的网格背景
- 模拟运行时的动态效果

---

## 核心类和方法

### 1. `Point` 类 - 坐标点

**位置**: `js/components.js` (第16-25行)

**定义**:
```javascript
class Point {
    constructor(x, y)          // 创建点坐标
    distanceTo(other)          // 计算到另一点的距离
}
```

**用途**: 表示电路中的坐标位置，用于元件定位、连接点计算等

### 2. `Component` 类 - 元件基类

**位置**: `js/components.js` (第30-96行)

**构造函数**:
```javascript
constructor(type, x, y)
```

**属性**:
- `id`: Number - 唯一标识符
- `type`: String - 元件类型（'battery', 'resistor'等）
- `x`, `y`: Number - 画布坐标
- `connections`: Array - 连接的元件ID列表
- `properties`: Object - 元件特定属性

**核心方法**:

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `addConnection(component)` | `Component` 实例 | void | 添加元件连接 |
| `removeConnection(componentId)` | Number | void | 移除连接 |
| `getConnectionPoints()` | - | `Point[]` | 获取连接点坐标 |
| `containsPoint(point)` | `Point` | Boolean | 判断点是否在元件内 |
| `getNearestConnectionPoint(point)` | `Point` | `Point` | 获取最近的连接点 |

### 3. `Battery` 类 - 电池

**位置**: `js/components.js` (第101-125行)

**继承**: `Component`

**构造函数**:
```javascript
constructor(x, y, voltage = 12)
```

**属性**:
- `properties.voltage`: Number - 电压（伏特）
- `properties.internalResistance`: Number - 内阻（欧姆）

**专属方法**:
```javascript
setVoltage(voltage)           // 设置电压
getVoltage()                  // 获取电压
setInternalResistance(r)      // 设置内阻
getInternalResistance()       // 获取内阻
```

### 4. `Resistor` 类 - 电阻

**位置**: `js/components.js` (第130-163行)

**继承**: `Component`

**构造函数**:
```javascript
constructor(x, y, resistance = 10)
```

**属性**:
- `properties.resistance`: Number - 电阻值（欧姆）
- `properties.current`: Number - 电流（安培）
- `properties.voltage`: Number - 电压（伏特）

**专属方法**:
```javascript
setResistance(resistance)     // 设置电阻值
getResistance()               // 获取电阻值
setCurrent(current)           // 设置电流
getCurrent()                  // 获取电流
setVoltage(voltage)           // 设置电压
getVoltage()                  // 获取电压
```

### 5. `Switch` 类 - 开关

**位置**: `js/components.js` (第168-193行)

**继承**: `Component`

**构造函数**:
```javascript
constructor(x, y)
```

**属性**:
- `properties.isOpen`: Boolean - 开关状态（true=断开）
- `properties.resistance`: Number - 闭合时的内阻（欧姆）

**专属方法**:
```javascript
toggle()                      // 切换开关状态
setState(isOpen)              // 设置开关状态
isOpen()                      // 获取开关状态
getResistance()               // 获取当前电阻（∞或内阻）
```

### 6. `Ammeter` 类 - 电流表

**位置**: `js/components.js` (第198-218行)

**继承**: `Component`

**构造函数**:
```javascript
constructor(x, y)
```

**属性**:
- `properties.current`: Number - 测量电流（安培）
- `properties.internalResistance`: Number - 内阻（欧姆，默认0.01）

**专属方法**:
```javascript
setCurrent(current)          // 设置电流读数
getCurrent()                 // 获取电流读数
getResistance()              // 获取内阻
```

### 7. `Voltmeter` 类 - 电压表

**位置**: `js/components.js` (第223-243行)

**继承**: `Component`

**构造函数**:
```javascript
constructor(x, y)
```

**属性**:
- `properties.voltage`: Number - 测量电压（伏特）
- `properties.internalResistance`: Number - 内阻（欧姆，默认10000）

**专属方法**:
```javascript
setVoltage(voltage)          // 设置电压读数
getVoltage()                 // 获取电压读数
getResistance()              // 获取内阻
```

### 8. `Connection` 类 - 连接

**位置**: `js/components.js` (第248-275行)

**构造函数**:
```javascript
constructor(fromId, toId, fromPoint, toPoint)
```

**属性**:
- `id`: String - 连接标识（格式："fromId-toId"）
- `fromComponentId`, `toComponentId`: Number - 连接的元件ID
- `fromPoint`, `toPoint`: `Point` - 连接的坐标点

**方法**:
```javascript
getOtherComponentId(componentId)   // 获取另一端元件ID
containsComponent(componentId)     // 检查是否包含指定元件
```

### 9. `ComponentFactory` 类 - 元件工厂

**位置**: `js/components.js` (第280-301行)

**用途**: 统一创建元件实例，支持扩展新类型

**静态方法**:
```javascript
static createComponent(type, x, y, properties = {})
```

**支持的类型**:
- `'battery'` - 电池
- `'resistor'` - 电阻
- `'switch'` - 开关
- `'ammeter'` - 电流表
- `'voltmeter'` - 电压表

### 10. `CircuitSimulator` 类 - 电路模拟器

**位置**: `js/simulator.js` (第9-653行)

**构造函数**:
```javascript
constructor()
```

**属性**:
- `components`: Array - 元件列表
- `connections`: Array - 连接列表
- `isSimulating`: Boolean - 模拟状态
- `simulationError`: String - 错误信息

**核心方法**:

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `setCircuit(components, connections)` | Array, Array | void | 设置电路数据 |
| `startSimulation()` | - | Object | 开始模拟 {success, error} |
| `stopSimulation()` | - | void | 停止模拟 |
| `analyzeCircuit()` | - | void | 分析电路（核心算法） |
| `buildGraph()` | - | Map | 构建电路图模型 |
| `validateCircuit(graph)` | Map | void | 验证电路有效性 |
| `identifyCircuits(graph)` | Map | Array | 识别电路拓扑 |

**高级方法**:

```javascript
// 电路验证
hasClosedCircuitPath(graph)               // 检查闭合路径
dfsFindClosedPath(...)                    // DFS查找闭合路径
checkForShortCircuit(graph)               // 短路检测
detectShortCircuitDFS(...)                // 短路检测DFS

// 拓扑分析
findCircuitFromBattery(...)               // 从电源找电路
analyzeTopology(circuit)                  // 分析拓扑结构
buildNodeConnections(circuit)             // 构建节点连接
countParallelPaths(...)                   // 计算并联路径

// 计算
calculateEquivalentResistance(analysis)   // 计算等效电阻
calculateParallelResistance(resistors)    // 并联电阻计算
distributeCurrentAndVoltage(...)          // 分配电流电压
distributeSeriesCircuit(...)              // 串联分配
distributeParallelCircuit(...)            // 并联分配
```

---

## 扩展新元件指南

### 步骤1: 创建新元件类

在 `components.js` 中继承 `Component` 基类：

```javascript
/**
 * 电容类 - 新增元件示例
 */
class Capacitor extends Component {
    constructor(x, y, capacitance = 0.001) { // 默认1mF
        super('capacitor', x, y);
        this.properties = {
            capacitance: capacitance,  // 电容值（法拉）
            voltage: 0,                // 电压
            charge: 0                  // 电荷
        };
    }

    // 专属方法
    setCapacitance(capacitance) {
        this.properties.capacitance = parseFloat(capacitance);
    }

    getCapacitance() {
        return this.properties.capacitance;
    }

    setVoltage(voltage) {
        this.properties.voltage = parseFloat(voltage);
        // Q = CV
        this.properties.charge = this.properties.capacitance * this.properties.voltage;
    }

    setCharge(charge) {
        this.properties.charge = parseFloat(charge);
        this.properties.voltage = this.properties.charge / this.properties.capacitance;
    }

    // 重写连接点（电容有两个端点）
    getConnectionPoints() {
        return [
            new Point(this.x - 30, this.y),  // 左端点
            new Point(this.x + 30, this.y)   // 右端点
        ];
    }
}
```

### 步骤2: 更新元件工厂

在 `ComponentFactory.createComponent` 中添加新分支：

```javascript
static createComponent(type, x, y, properties = {}) {
    switch (type) {
        // ... 现有代码 ...
        case 'capacitor':
            return new Capacitor(x, y, properties.capacitance || 0.001);
        default:
            throw new Error(`未知的元件类型: ${type}`);
    }
}
```

### 步骤3: 添加绘制函数

在 `ui-enhanced.js` 中添加绘制函数：

```javascript
/**
 * 绘制电容（两条平行线）
 */
function drawCapacitorEnhanced(component) {
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;

    const x = component.x;
    const y = component.y;

    // 绘制电容符号（两条平行竖线）
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 20);
    ctx.lineTo(x - 10, y + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 10, y - 20);
    ctx.lineTo(x + 10, y + 20);
    ctx.stroke();

    // 绘制连线
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 10, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 显示电容值
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    // 转换为更友好的单位显示
    const capacitance = component.getCapacitance();
    const displayValue = capacitance >= 0.001 ? 
        `${(capacitance * 1000).toFixed(1)}mF` : 
        `${(capacitance * 1000000).toFixed(1)}μF`;
    ctx.fillText(displayValue, x, y + 25);
}
```

### 步骤4: 在绘制调度中添加新分支

更新 `redrawCanvasEnhanced` 函数：

```javascript
function redrawCanvasEnhanced() {
    // ... 现有代码 ...

    // 绘制元件
    switch (component.type) {
        case 'battery':
            drawBatteryEnhanced(component);
            break;
        case 'resistor':
            drawResistorEnhanced(component);
            break;
        case 'switch':
            drawSwitchEnhanced(component);
            break;
        case 'ammeter':
            drawAmmeterEnhanced(component);
            break;
        case 'voltmeter':
            drawVoltmeterEnhanced(component);
            break;
        case 'capacitor':  // 添加新分支
            drawCapacitorEnhanced(component);
            break;
    }

    // ... 现有代码 ...
}
```

### 步骤5: 添加计算逻辑（可选）

如果新元件需要参与电路计算，更新 `simulator.js`：

在 `analyzeTopology` 中添加识别：

```javascript
analyzeTopology(circuit) {
    const batteries = circuit.filter(c => c.type === 'battery');
    const resistors = circuit.filter(c => c.type === 'resistor');
    const switches = circuit.filter(c => c.type === 'switch' && !c.isOpen());
    const ammeters = circuit.filter(c => c.type === 'ammeter');
    const capacitors = circuit.filter(c => c.type === 'capacitor'); // 新增

    return {
        components: circuit,
        batteries: batteries,
        resistors: resistors,
        switches: switches,
        ammeters: ammeters,
        capacitors: capacitors,  // 新增
        isParallel: pathCount > 1,
        nodeConnections: nodeConnections,
        parallelPaths: pathCount
    };
}
```

### 步骤6: 更新HTML界面

在 `index.html` 的元件库中添加新元件：

```html
<div class="component-item" data-type="capacitor" draggable="true">
    <div class="component-icon capacitor-icon"></div>
    <span>电容</span>
</div>
```

并添加CSS样式（在 `styles.css` 中）：

```css
.capacitor-icon {
    background-color: #f39c12;
    /* 其他样式如同其他元件 */
}
```

### 步骤7: 添加属性面板支持

在 `ui.js` 的 `showComponentProperties` 函数中添加：

```javascript
case 'capacitor':
    html += `
        <label>电容 (F): <input type="number" id="prop-capacitance" 
               value="${component.getCapacitance()}" step="0.001"></label><br>
        <button onclick="updateCapacitorProperties(${component.id})">应用</button>
        <hr>
        <p><strong>状态:</strong></p>
        <p>电压: ${component.properties.voltage.toFixed(2)} V</p>
        <p>电荷: ${component.properties.charge.toFixed(6)} C</p>
    `;
    break;
```

并添加更新函数：

```javascript
function updateCapacitorProperties(componentId) {
    const component = globalThis.circuitComponents.find(c => c.id === componentId);
    const capacitanceInput = document.getElementById('prop-capacitance');
    
    if (component && capacitanceInput) {
        component.setCapacitance(parseFloat(capacitanceInput.value));
        redrawCanvas();
        console.log(`更新电容 ${componentId} 电容值: ${capacitanceInput.value}F`);
    }
}
```

### 扩展示例总结

通过以上7个步骤，一个完整的新元件就被成功集成到系统中。为了更好的性能，建议在 `getConnectionPoints` 中缓存连接点计算结果，并在属性变化时清除缓存。

---

## 事件系统说明

### 1. Canvas 事件

#### 鼠标事件

**mousedown** (第197-259行):
- 处理元件选择
- 开始连线操作
- 启动拖拽

**mousemove** (第264-295行):
- 拖拽中更新元件位置
- 连线预览
- 光标样式更新

**mouseup** (第300-309行):
- 结束拖拽
- 清理连线状态

**click** (第314-332行):
- 切换开关状态
- 元件单击操作

### 2. HTML5 拖拽事件

**dragstart** (第337-341行):
- 从元件库开始拖拽
- 记录元件类型

**dragover** (第346-348行):
- 允许放置

**drop** (第353-377行):
- 在工作区放置元件
- 创建新元件实例
- 添加到全局列表

### 3. 按钮控制事件

**清空工作区** (`clear-btn`):
- 触发 `clearWorkspace()`
- 重置所有状态
- 重新绘制Canvas

**开始模拟** (`simulate-btn`):
- 触发 `startSimulation()`
- 同步数据到模拟器
- 启动实时更新

**停止模拟** (`stop-btn`):
- 触发 `stopSimulation()`
- 停止计算引擎
- 重置显示

### 4. 定时器和动画

**实时更新** (第142-147行):
```javascript
setInterval(() => {
    if (globalThis.circuitSimulator?.isSimulating) {
        updateReadings();
    }
}, 100);
```

**动画循环** (第151-152行):
```javascript
requestAnimationFrame(animationLoop);
```

### 5. 全局事件总线

系统使用简单的发布-订阅模式：

```javascript
// 发布事件（在任意位置）
function publishEvent(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
}

// 订阅事件
window.addEventListener('circuit-changed', (e) => {
    console.log('电路变化:', e.detail);
});
```

**内置事件**:
- `component-added`: 元件添加
- `connection-created`: 连接创建
- `simulation-started`: 模拟开始
- `simulation-stopped`: 模拟停止
- `properties-updated`: 属性更新

### 6. 键盘快捷键（可扩展）

可以添加键盘事件监听：

```javascript
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && selectedComponent) {
        deleteSelectedComponent();
    }
    if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        startSimulation();
    }
});
```

---

## 完整代码示例

### 示例1: 创建简单电路

```html
<!DOCTYPE html>
<html>
<head>
    <title>简单电路</title>
    <script src="js/components.js"></script>
    <script src="js/simulator.js"></script>
    <script src="js/ui-enhanced.js"></script>
</head>
<body>
    <canvas id="circuit-canvas" width="600" height="400"></canvas>
    <div id="results"></div>

    <script>
        // 初始化
        const canvas = document.getElementById('circuit-canvas');
        const ctx = canvas.getContext('2d');
        const simulator = new CircuitSimulator();

        // 创建元件
        const battery = new Battery(150, 200, 12);  // 12V电池
        const resistor = new Resistor(350, 200, 20); // 20Ω电阻
        const ammeter = new Ammeter(250, 200);      // 电流表

        // 添加连接
        battery.addConnection(ammeter);
        ammeter.addConnection(resistor);
        resistor.addConnection(battery); // 闭合回路

        // 配置电路
        globalThis.circuitComponents = [battery, ammeter, resistor];
        const connections = [
            new Connection(battery.id, ammeter.id, 
                          battery.getConnectionPoints()[1], 
                          ammeter.getConnectionPoints()[0]),
            new Connection(ammeter.id, resistor.id,
                          ammeter.getConnectionPoints()[1],
                          resistor.getConnectionPoints()[0]),
            new Connection(resistor.id, battery.id,
                          resistor.getConnectionPoints()[1],
                          battery.getConnectionPoints()[0])
        ];
        globalThis.connections = connections;

        // 设置并运行模拟器
        simulator.setCircuit(globalThis.circuitComponents, globalThis.connections);
        const result = simulator.startSimulation();

        // 显示结果
        const resultsDiv = document.getElementById('results');
        if (result.success) {
            resultsDiv.innerHTML = `
                <h3>电路计算结果</h3>
                <p>总电流: ${(battery.getVoltage() / resistor.getResistance()).toFixed(3)} A</p>
                <p>电阻电压: ${resistor.getVoltage().toFixed(2)} V</p>
                <p>电流表读数: ${ammeter.getCurrent().toFixed(3)} A</p>
            `;
        } else {
            resultsDiv.innerHTML = `<p style="color: red;">错误: ${result.error}</p>`;
        }

        // 绘制电路
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawConnectionsEnhanced();
            drawBatteryEnhanced(battery);
            drawResistorEnhanced(resistor);
            drawAmmeterEnhanced(ammeter);
        }
        draw();
    </script>
</body>
</html>
```

### 示例2: 动态添加元件

```javascript
// 动态添加元件的函数
function addComponentToCanvas(type, x, y) {
    try {
        // 1. 创建元件
        const component = ComponentFactory.createComponent(type, x, y);
        
        // 2. 添加到全局列表
        globalThis.circuitComponents.push(component);
        
        // 3. 发布事件
        window.dispatchEvent(new CustomEvent('component-added', {
            detail: { component, x, y }
        }));
        
        // 4. 重新绘制
        redrawCanvasEnhanced();
        
        // 5. 更新状态栏
        updateStatusBar();
        
        console.log(`成功添加 ${type} 在 (${x}, ${y})`);
        return component;
        
    } catch (error) {
        console.error('添加元件失败:', error);
        alert(`添加元件失败: ${error.message}`);
        return null;
    }
}

// 使用示例
const battery = addComponentToCanvas('battery', 100, 100);
if (battery) {
    battery.setVoltage(9); // 设置为9V
}

// 自动连接最近的元件
function autoConnect(component, maxDistance = 100) {
    const nearbyComponents = globalThis.circuitComponents.filter(other => {
        if (other.id === component.id) return false;
        
        const dist = Math.sqrt(
            Math.pow(other.x - component.x, 2) + 
            Math.pow(other.y - component.y, 2)
        );
        return dist < maxDistance;
    });

    if (nearbyComponents.length === 0) return;

    // 找到最近的元件
    const nearest = nearbyComponents.reduce((prev, curr) => {
        const prevDist = Math.sqrt(
            Math.pow(prev.x - component.x, 2) + 
            Math.pow(prev.y - component.y, 2)
        );
        const currDist = Math.sqrt(
            Math.pow(curr.x - component.x, 2) + 
            Math.pow(curr.y - component.y, 2)
        );
        return currDist < prevDist ? curr : prev;
    });

    // 创建连接
    const connection = new Connection(
        component.id,
        nearest.id,
        component.getConnectionPoints()[0],
        nearest.getConnectionPoints()[0]
    );
    
    globalThis.connections.push(connection);
    component.addConnection(nearest);
    nearest.addConnection(component);
    
    redrawCanvasEnhanced();
}
```

### 示例3: 实时数据监控

```javascript
// 实时监控电路数据
class CircuitMonitor {
    constructor(simulator) {
        this.simulator = simulator;
        this.isMonitoring = false;
        this.updateInterval = null;
        this.dataHistory = [];
    }

    start() {
        this.isMonitoring = true;
        this.updateInterval = setInterval(() => {
            this.collectData();
        }, 200); // 每200ms收集一次数据
    }

    stop() {
        this.isMonitoring = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    collectData() {
        if (!this.simulator.isSimulating) return;

        const timestamp = Date.now();
        const data = {
            timestamp,
            components: {}
        };

        // 收集所有元件的数据
        this.simulator.components.forEach(component => {
            const compData = {
                type: component.type,
                x: component.x,
                y: component.y
            };

            // 收集类型特定的数据
            switch (component.type) {
                case 'resistor':
                    compData.resistance = component.getResistance();
                    compData.current = component.getCurrent();
                    compData.voltage = component.getVoltage();
                    compData.power = component.getCurrent() * component.getVoltage(); // 功率
                    break;
                case 'battery':
                    compData.voltage = component.getVoltage();
                    compData.internalResistance = component.getInternalResistance();
                    break;
                case 'ammeter':
                    compData.current = component.getCurrent();
                    break;
                case 'voltmeter':
                    compData.voltage = component.getVoltage();
                    break;
                // ... 其他元件类型
            }

            data.components[component.id] = compData;
        });

        this.dataHistory.push(data);
        
        // 限制历史记录长度
        if (this.dataHistory.length > 1000) {
            this.dataHistory.shift();
        }

        // 触发数据更新事件
        window.dispatchEvent(new CustomEvent('monitor-data', {
            detail: data
        }));
    }

    // 获取历史统计
    getStatistics(componentId, property, duration = 10000) {
        const now = Date.now();
        const relevantData = this.dataHistory.filter(d => 
            now - d.timestamp < duration
        );

        const values = relevantData
            .map(d => d.components[componentId]?.[property])
            .filter(v => v !== undefined);

        if (values.length === 0) return null;

        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            current: values[values.length - 1]
        };
    }

    // 导出CSV数据
    exportCSV() {
        const headers = ['时间戳', '元件ID', '类型', '参数', '值'];
        const rows = [];

        this.dataHistory.forEach(data => {
            Object.entries(data.components).forEach(([id, compData]) => {
                Object.entries(compData).forEach(([param, value]) => {
                    if (typeof value === 'number') {
                        rows.push([data.timestamp, id, compData.type, param, value]);
                    }
                });
            });
        });

        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        // 下载文件
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `circuit-data-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 使用示例
const monitor = new CircuitMonitor(simulator);

// 监听数据更新
window.addEventListener('monitor-data', (e) => {
    console.log('新数据:', e.detail);
    
    // 更新实时显示
    const data = e.detail;
    const resultsDiv = document.getElementById('realtime-results');
    resultsDiv.innerHTML = `
        <h4>实时数据</h4>
        <table>
            <tr><th>元件</th><th>电流 (A)</th><th>电压 (V)</th><th>功率 (W)</th></tr>
            ${Object.entries(data.components).filter(([id, c]) => c.type === 'resistor').map(([id, c]) => `
                <tr>
                    <td>${c.type} #${id}</td>
                    <td>${c.current.toFixed(3)}</td>
                    <td>${c.voltage.toFixed(2)}</td>
                    <td>${(c.power || 0).toFixed(3)}</td>
                </tr>
            `).join('')}
        </table>
    `;
});

// 开始/停止监控
document.getElementById('start-monitor').addEventListener('click', () => {
    monitor.start();
});

document.getElementById('stop-monitor').addEventListener('click', () => {
    monitor.stop();
});

document.getElementById('export-data').addEventListener('click', () => {
    monitor.exportCSV();
    alert('数据已导出！');
});
```

### 示例4: 自定义电路模板

```javascript
// 电路模板系统
const CircuitTemplates = {
    // 串联电路模板
    seriesCircuit: (batteryVoltage = 12, resistorCount = 3) => {
        const components = [];
        const connections = [];
        const resistances = [10, 20, 30]; // 示例电阻值

        // 创建电池
        const battery = new Battery(100, 200, batteryVoltage);
        components.push(battery);

        // 创建电阻
        let prevComponent = battery;
        for (let i = 0; i < Math.min(resistorCount, resistances.length); i++) {
            const resistor = new Resistor(200 + i * 100, 200, resistances[i]);
            components.push(resistor);

            // 创建连接
            const connection = new Connection(
                prevComponent.id,
                resistor.id,
                prevComponent.getConnectionPoints()[1],
                resistor.getConnectionPoints()[0]
            );
            connections.push(connection);
            prevComponent.addConnection(resistor);
            resistor.addConnection(prevComponent);

            prevComponent = resistor;
        }

        // 闭合回路（最后一个电阻连回电池）
        const lastResistor = components[components.length - 1];
        const finalConnection = new Connection(
            lastResistor.id,
            battery.id,
            lastResistor.getConnectionPoints()[1],
            battery.getConnectionPoints()[0]
        );
        connections.push(finalConnection);
        lastResistor.addConnection(battery);
        battery.addConnection(lastResistor);

        return { components, connections };
    },

    // 并联电路模板
    parallelCircuit: (batteryVoltage = 12, branchCount = 3) => {
        const components = [];
        const connections = [];

        // 创建电池
        const battery = new Battery(100, 200, batteryVoltage);
        components.push(battery);

        // 创建分支电阻
        const branchResistances = [10, 20, 30]; // 不同阻值
        const junctionTop = new Point(200, 150);
        const junctionBottom = new Point(200, 250);

        for (let i = 0; i < Math.min(branchCount, branchResistances.length); i++) {
            // 每个分支的电阻
            const resistor = new Resistor(
                300, 
                150 + i * 50, 
                branchResistances[i]
            );
            components.push(resistor);

            // 连接电池到电阻（上端）
            const connTop = new Connection(
                battery.id,
                resistor.id,
                battery.getConnectionPoints()[1],
                resistor.getConnectionPoints()[0]
            );
            connections.push(connTop);
            battery.addConnection(resistor);
            resistor.addConnection(battery);

            // 连接电阻回电池（下端）
            const connBottom = new Connection(
                resistor.id,
                battery.id,
                resistor.getConnectionPoints()[1],
                battery.getConnectionPoints()[0]
            );
            connections.push(connBottom);
            resistor.addConnection(battery);
            battery.addConnection(resistor);
        }

        return { components, connections };
    },

    // 带开关的控制电路
    switchedCircuit: (batteryVoltage = 12, resistorValue = 10) => {
        const components = [];
        const connections = [];

        const battery = new Battery(100, 200, batteryVoltage);
        const switchComp = new Switch(200, 200);
        const resistor = new Resistor(300, 200, resistorValue);
        const ammeter = new Ammeter(250, 200);

        components.push(battery, switchComp, ammeter, resistor);

        // 连接: 电池 -> 开关 -> 电流表 -> 电阻 -> 电池
        const connectionsConfig = [
            { from: battery, to: switchComp },
            { from: switchComp, to: ammeter },
            { from: ammeter, to: resistor },
            { from: resistor, to: battery }
        ];

        connectionsConfig.forEach(({ from, to }) => {
            const connection = new Connection(
                from.id,
                to.id,
                from.getConnectionPoints()[1],
                to.getConnectionPoints()[0]
            );
            connections.push(connection);
            from.addConnection(to);
            to.addConnection(from);
        });

        // 初始时开关闭合
        switchComp.setState(false);

        return { components, connections };
    }
};

// 使用模板
function loadTemplate(templateName, ...args) {
    if (!CircuitTemplates[templateName]) {
        console.error('未知的模板:', templateName);
        return;
    }

    // 清空现有电路
    clearAllComponents();

    // 生成模板
    const { components, connections } = CircuitTemplates[templateName](...args);

    // 应用模板
    globalThis.circuitComponents = components;
    globalThis.connections = connections;

    // 更新UI
    syncComponentsToSimulator();
    redrawCanvasEnhanced();
    updateStatusBar();

    console.log(`加载模板: ${templateName}`);
    
    return { components, connections };
}

// HTML按钮示例
/*
<button onclick="loadTemplate('seriesCircuit', 12, 3)">串联电路</button>
<button onclick="loadTemplate('parallelCircuit', 12, 3)">并联电路</button>
<button onclick="loadTemplate('switchedCircuit', 12, 15)">开关电路</button>
*/
```

---

## 常见问题

### Q1: 如何添加自定义元件属性？

**A**: 在元件类的 `properties` 对象中添加新属性：

```javascript
class CustomComponent extends Component {
    constructor(x, y) {
        super('custom', x, y);
        this.properties = {
            ...this.properties,  // 保留基础属性
            customAttribute: 100,  // 添加自定义属性
            anotherParam: 'value'
        };
    }
}
```

### Q2: 如何修改电路计算算法？

**A**: 重写 `CircuitSimulator` 类的相关方法：

```javascript
// 扩展模拟器类
class AdvancedCircuitSimulator extends CircuitSimulator {
    calculateCircuit(circuit) {
        // 自定义计算逻辑
        // 可以添加基尔霍夫定律、交流电路分析等
        
        // 调用父类方法（可选）
        super.calculateCircuit(circuit);
        
        // 添加额外计算
        this.applyAdvancedAnalysis(circuit);
    }
    
    applyAdvancedAnalysis(circuit) {
        // 你的高级分析代码
    }
}
```

### Q3: 如何导出电路数据？

**A**: 使用JSON序列化：

```javascript
function exportCircuit() {
    const circuitData = {
        components: globalThis.circuitComponents.map(c => ({
            id: c.id,
            type: c.type,
            x: c.x,
            y: c.y,
            properties: c.properties
        })),
        connections: globalThis.connections.map(conn => ({
            id: conn.id,
            from: conn.fromComponentId,
            to: conn.toComponentId
        }))
    };
    
    const json = JSON.stringify(circuitData, null, 2);
    
    // 下载文件
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'circuit.json';
    a.click();
    URL.revokeObjectURL(url);
}
```

### Q4: 如何导入电路数据？

**A**: 反序列化并重建对象：

```javascript
function importCircuit(jsonData) {
    const circuitData = JSON.parse(jsonData);
    
    // 重建元件（保留原始ID）
    const componentMap = new Map();
    globalThis.circuitComponents = circuitData.components.map(c => {
        const component = ComponentFactory.createComponent(c.type, c.x, c.y);
        // 恢复ID和属性
        component.id = c.id;
        Object.assign(component.properties, c.properties);
        componentMap.set(c.id, component);
        return component;
    });
    
    // 重建连接
    globalThis.connections = circuitData.connections.map(conn => {
        const fromComp = componentMap.get(conn.from);
        const toComp = componentMap.get(conn.to);
        const connection = new Connection(conn.from, conn.to,
                                         fromComp.getConnectionPoints()[1],
                                         toComp.getConnectionPoints()[0]);
        fromComp.addConnection(toComp);
        toComp.addConnection(fromComp);
        return connection;
    });
    
    updateStatusBar();
    redrawCanvasEnhanced();
}
```

### Q5: 如何添加键盘快捷键？

**A**: 添加全局键盘事件监听：

```javascript
document.addEventListener('keydown', (e) => {
    // 只有当焦点在Canvas上时才响应
    if (document.activeElement !== canvas) return;
    
    switch(e.key) {
        case 'Delete':
            if (selectedComponent) {
                deleteSelectedComponent();
            }
            break;
        case 'Escape':
            clearSelection();
            break;
        case ' ':
            e.preventDefault();
            if (globalThis.circuitSimulator?.isSimulating) {
                stopSimulation();
            } else {
                startSimulation();
            }
            break;
        case 'r':
            if (e.ctrlKey) {
                e.preventDefault();
                rotateSelectedComponent();
            }
            break;
    }
});
```

### Q6: 如何扩展新的计算方法？

**A**: 实现插件式的计算模块：

```javascript
// 计算模块接口
class CalculationModule {
    constructor(name) {
        this.name = name;
    }
    
    // 必须实现的方法
    calculate(circuitData) {
        throw new Error('必须实现calculate方法');
    }
    
    // 可选：验证方法
    validate(circuitData) {
        return { valid: true, errors: [] };
    }
}

// 欧姆定律模块
class OhmsLawModule extends CalculationModule {
    constructor() {
        super('ohms-law');
    }
    
    calculate(circuitData) {
        const results = {};
        
        circuitData.components.forEach(component => {
            if (component.type === 'resistor') {
                const I = component.getCurrent();
                const R = component.getResistance();
                const V = I * R; // V = IR
                
                results[component.id] = {
                    voltage: V,
                    current: I,
                    resistance: R,
                    power: V * I  // P = VI
                };
            }
        });
        
        return results;
    }
}

// 功率计算模块
class PowerModule extends CalculationModule {
    constructor() {
        super('power-calculation');
    }
    
    calculate(circuitData) {
        const totalPower = circuitData.components.reduce((sum, comp) => {
            if (comp.type === 'resistor') {
                return sum + (comp.getVoltage() * comp.getCurrent());
            }
            return sum;
        }, 0);
        
        return { totalPower };
    }
}

// 模块管理器
class CalculationManager {
    constructor() {
        this.modules = new Map();
    }
    
    register(module) {
        this.modules.set(module.name, module);
    }
    
    calculateAll(circuitData) {
        const allResults = {};
        
        for (const [name, module] of this.modules) {
            try {
                const validation = module.validate(circuitData);
                if (validation.valid) {
                    allResults[name] = {
                        success: true,
                        data: module.calculate(circuitData)
                    };
                } else {
                    allResults[name] = {
                        success: false,
                        errors: validation.errors
                    };
                }
            } catch (error) {
                allResults[name] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return allResults;
    }
}

// 使用
const calcManager = new CalculationManager();
calcManager.register(new OhmsLawModule());
calcManager.register(new PowerModule());

// 在模拟器中集成
class AdvancedCircuitSimulator extends CircuitSimulator {
    constructor() {
        super();
        this.calcManager = new CalculationManager();
        this.calcManager.register(new OhmsLawModule());
        this.calcManager.register(new PowerModule());
    }
    
    calculateCircuit(circuit) {
        // 执行基础计算
        super.calculateCircuit(circuit);
        
        // 执行扩展计算
        const circuitData = {
            components: this.components,
            connections: this.connections
        };
        
        this.advancedResults = this.calcManager.calculateAll(circuitData);
    }
}
```

---

## 性能优化建议

### 1. 批量操作优化

```javascript
// 不推荐: 多次重绘
components.forEach(comp => {
    moveComponent(comp, newX, newY);
    redrawCanvasEnhanced(); // 每次移动都重绘
});

// 推荐: 批量重绘
components.forEach(comp => {
    moveComponent(comp, newX, newY);
});
redrawCanvasEnhanced(); // 只重绘一次
```

### 2. 缓存计算结果

```javascript
class Component {
    constructor(type, x, y) {
        // ... 现有代码 ...
        this._cachedConnectionPoints = null; // 添加缓存
    }

    getConnectionPoints() {
        // 如果缓存有效，直接返回
        if (this._cachedConnectionPoints) {
            return this._cachedConnectionPoints;
        }

        // 计算并缓存
        this._cachedConnectionPoints = [
            new Point(this.x, this.y - 30),
            new Point(this.x, this.y + 30)
        ];
        return this._cachedConnectionPoints;
    }

    // 当位置改变时，清除缓存
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this._cachedConnectionPoints = null; // 清除缓存
    }
}
```

### 3. 虚拟化大量元件

```javascript
// 只绘制可视区域内的元件
function redrawCanvasEnhanced() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridEnhanced();
    drawConnectionsEnhanced();

    // 获取可视区域
    const visibleRect = {
        left: 0,
        top: 0,
        right: canvas.width,
        bottom: canvas.height
    };

    // 只绘制可视区域内的元件
    globalThis.circuitComponents.forEach(component => {
        if (isComponentInRect(component, visibleRect)) {
            // 绘制元件
            switch (component.type) {
                // ... 绘制代码 ...
            }
        }
    });
}

function isComponentInRect(component, rect) {
    return component.x >= rect.left - 50 &&
           component.x <= rect.right + 50 &&
           component.y >= rect.top - 50 &&
           component.y <= rect.bottom + 50;
}
```

---

## API 变更日志

### v1.0.0 (2026-04-18)
- ✨ 初始版本
- ✨ 支持电池、电阻、开关、电流表、电压表
- ✨ 实现欧姆定律计算
- ✨ 拖拽式交互界面
- ✨ 实时电路模拟

### v1.1.0 (计划中)
- 🚧 支持电容、电感元件
- 🚧 交流电路分析
- 🚧 数据导出功能
- 🚧 电路模板系统

### v2.0.0 (计划中)
- 🚧 多电路板支持
- 🚧 高级分析算法（基尔霍夫定律）
- 🚧 元件库扩展插件系统
- 🚧 云端数据同步

---

## 支持与贡献

### 报告问题
如果在使用过程中遇到问题，请：
1. 查看浏览器控制台错误信息
2. 检查元件连接是否正确
3. 确认参数设置是否合理
4. 在项目中提交 Issue

### 提交改进
欢迎提交 Pull Request：
1. Fork 项目
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 创建 Pull Request

### 联系方式
- 📧 邮箱: your-email@example.com
- 🌐 项目地址: https://github.com/username/circuit-simulator
- 📖 文档: https://github.com/username/circuit-simulator/wiki

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-18  
**作者**: 技术文档团队
