# Issue #4: 欧姆定律计算核心 用户指南

## 快速开始

### 启动服务器
```bash
cd ~/circuit-simulator
python3 -m http.server 8000
```

### 访问应用
- **主应用**: http://localhost:8000/index.html
- **测试套件**: http://localhost:8000/complete-test.html

## 核心功能

### 1. 电路组件
支持5种电路元件：
- **🔋 电池**: 提供电压源，可设置电压(V)和内阻(Ω)
- **⚡ 电阻**: 消耗电能，可设置阻值(Ω)
- **🔘 开关**: 控制电路通断，可切换开关状态
- **📊 电流表**: 测量支路电流(A)
- **🌡️ 电压表**: 测量两点间电压(V)

### 2. 电路分析功能

#### 欧姆定律计算
- 自动应用 I = U/R 公式
- 实时计算电流、电压分布
- 支持串并联混合电路

#### 串联电路
```
R_total = R1 + R2 + R3 + ...
I = 相同 (所有元件电流相等)
U = U1 + U2 + U3 + ...
```

#### 并联电路
```
1/R_total = 1/R1 + 1/R2 + 1/R3 + ...
U = 相同 (所有支路电压相等)
I = I1 + I2 + I3 + ...
```

### 3. 错误处理

#### 断路检测
- **提示**: "错误: 电路断路（请闭合开关）"
- **原因**: 开关断开或电路连接不完整
- **解决**: 闭合所有开关，检查连接线

#### 短路警告
- **提示**: "警告: 检测到可能的短路！"
- **原因**: 极低电阻回路（<0.1Ω）
- **警告**: 但允许继续模拟（教学目的）

#### 无效电路
- **提示**: "错误: 电路中没有电源"
- **原因**: 缺少电池组件
- **解决**: 添加至少一个电池

### 4. 使用步骤

1. **添加元件**:
   - 从左侧元件库拖拽组件到画布
   - 或点击选择工具后点击画布

2. **编辑属性**:
   - 单击选中元件
   - 在右侧属性面板中修改参数
   - 点击"应用"按钮保存

3. **开始模拟**:
   - 点击"开始模拟"按钮
   - 系统会自动分析电路拓扑
   - 计算电流、电压分布

4. **观察结果**:
   - 查看底部状态栏总电流、总电压
   - 点击元件查看实时读数
   - 电流表和电压表显示测量值

### 5. 开发接口(Agent 1使用)

#### 创建组件
```javascript
const battery = new Battery(x, y, voltage);  // 创建电池
const resistor = new Resistor(x, y, resistance);  // 创建电阻
```

#### 使用组件工厂
```javascript
const component = ComponentFactory.createComponent('battery', x, y, {
    voltage: 12
});
```

#### 运行模拟
```javascript
simulator.setCircuit(components, connections);
const result = simulator.startSimulation();

if (result.success) {
    const results = simulator.getResults();
    console.log('总电流:', results.totalCurrent);
    console.log('元件读数:', results.componentReadings);
} else {
    console.error('错误:', result.error);
}
```

#### 读取结果
```javascript
// 总电流和电压
const totalCurrent = results.totalCurrent;  // A
const totalVoltage = results.totalVoltage;  // V

// 元件数据
for (const id in results.componentReadings) {
    const reading = results.componentReadings[id];
    if (reading.type === 'ammeter') {
        console.log('电流表读数:', reading.current, 'A');
    } else if (reading.type === 'voltmeter') {
        console.log('电压表读数:', reading.voltage, 'V');
    }
}
```

### 6. 示例电路

#### 示例1: 简单串联
```
电池(12V) → 电阻(10Ω) → 开关(闭合)
```
**计算**: I = 12/10 = 1.2A

#### 示例2: 并联分流
```
      ┌─电阻(10Ω)─┐
电池(12V)         电流表
      └─电阻(20Ω)─┘
```
**计算**: 
- R1电流 = 12/10 = 1.2A
- R2电流 = 12/20 = 0.6A
- 总电流 = 1.8A

#### 示例3: 带仪表测量
```
电池(12V) ┬─电流表─┬─电阻(15Ω)
          └─电压表─┘
```
**测量值**:
- 电流表: 0.8A
- 电压表: 12V

### 7. 教学应用

#### 欧姆定律验证
1. 固定电阻，改变电压，观察电流变化
2. 固定电压，改变电阻，验证反比关系
3. 使用仪表测量验证计算结果

#### 串并联对比
1. 创建相同元件的串联和并联电路
2. 对比总电流、电压分布差异
3. 理解等效电阻计算方法

#### 错误诊断训练
1. 故意创建断路电路
2. 观察错误提示并分析原因
3. 学习电路连接规范

### 8. 技术规格

#### 支持的电压范围
- 电池: 1V - 24V
- 默认: 12V

#### 支持的电阻范围
- 普通电阻: 1Ω - 1000Ω
- 开关闭合: ~0.01Ω
- 电流表内阻: ~0.01Ω
- 电压表内阻: ~10kΩ

#### 计算精度
- 电流: 0.001A (1mA)
- 电压: 0.01V (10mV)
- 电阻: 0.01Ω

#### 性能限制
- 最大元件数: 50个
- 最大递归深度: 50层
- 实时更新频率: 60FPS

### 9. 故障排除

#### 问题1: 模拟无法启动
**原因**: 缺少电源或电路断路
**解决**: 添加电池，闭合所有开关

#### 问题2: 读数为0
**原因**: 开关未闭合或连接不完整
**解决**: 检查开关状态和连接线

#### 问题3: 错误提示"可能短路"
**原因**: 电路总电阻过低
**解决**: 这是警告，可继续模拟，但建议检查电路

#### 问题4: 计算结果异常
**原因**: 参数设置不合理
**解决**: 检查电压、电阻值是否合理

### 10. 开发说明

#### 文件结构
```
circuit-simulator/
├── js/
│   ├── components.js    # 电路组件定义 (7.5KB)
│   ├── simulator.js     # 核心计算逻辑 (19KB)
│   └── ui.js           # UI界面交互 (19KB)
├── complete-test.html   # 测试套件
├── test-simulator.html  # 单元测试
└── index.html          # 主应用
```

#### 接入口
- **components.js**: 导出了所有组件类
- **simulator.js**: 导出了CircuitSimulator类
- **ui.js**: 自动初始化界面事件

#### 依赖关系
```
index.html
  ├── components.js (必须先加载)
  ├── simulator.js (依赖components)
  └── ui.js (依赖前两者)
```

---

**版本**: v1.0.0  
**作者**: Hermes Agent 2 (算法工程师)  
**完成时间**: 2026-04-18  
**上次更新**: 2026-04-18
