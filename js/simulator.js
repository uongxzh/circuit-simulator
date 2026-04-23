// 电路模拟器 - simulator.js
// 实现欧姆定律计算、图论分析、电路拓扑分析

console.log('✅ simulator.js 加载成功！');

/**
 * 电路模拟器主类
 */
class CircuitSimulator {
    constructor() {
        this.components = [];
        this.connections = [];
        this.isSimulating = false;
        this.simulationError = null;
    }

    /**
     * 设置元件和连接
     */
    setCircuit(components, connections) {
        this.components = components;
        this.connections = connections;
        this.simulationError = null;
    }

    /**
     * 开始模拟
     */
    startSimulation() {
        console.log('开始电路模拟...');
        this.isSimulating = true;

        try {
            this.analyzeCircuit();
            console.log('电路分析完成');
            return { success: true, error: null };
        } catch (error) {
            console.error('电路分析错误:', error.message);
            this.isSimulating = false;
            this.simulationError = error.message;
            return { success: false, error: error.message };
        }
    }

    /**
     * 停止模拟
     */
    stopSimulation() {
        console.log('停止电路模拟');
        this.isSimulating = false;
    }

    /**
     * 分析电路
     */
    analyzeCircuit() {
        this.resetCalculations();

        // 步骤1: 构建电路图
        const graph = this.buildGraph();

        // 步骤2: 检测电路有效性
        this.validateCircuit(graph);

        // 步骤3: 识别电路拓扑结构
        const circuits = this.identifyCircuits(graph);

        // 步骤4: 计算每个电路
        for (const circuit of circuits) {
            this.calculateCircuit(circuit);
        }

        // 步骤5: 传播电压和电流值
        this.propagateValues();
    }

    /**
     * 构建电路图（图论模型）
     */
    buildGraph() {
        const graph = new Map();

        // 初始化图中的节点
        for (const component of this.components) {
            graph.set(component.id, {
                component: component,
                neighbors: []
            });
        }

        // 添加边（连接关系）
        for (const connection of this.connections) {
            const fromNode = graph.get(connection.fromComponentId);
            const toNode = graph.get(connection.toComponentId);

            if (fromNode && toNode) {
                fromNode.neighbors.push({
                    id: connection.toComponentId,
                    connection: connection
                });
                toNode.neighbors.push({
                    id: connection.fromComponentId,
                    connection: connection
                });
            }
        }

        return graph;
    }

    /**
     * 验证电路有效性
     */
    validateCircuit(graph) {
        // 检查是否有电源
        const batteries = this.components.filter(c => c.type === 'battery');
        if (batteries.length === 0) {
            throw new Error('错误: 电路中没有电源');
        }

        // 检查是否有至少一个闭合路径包含电源（始终检查，不仅限于有开关时）
        const hasClosedPath = this.hasClosedCircuitPath(graph);
        if (!hasClosedPath) {
            throw new Error('错误: 电路断路（请检查连接是否形成完整回路）');
        }

        // 检查短路（纯电源-导线回路）
        this.checkForShortCircuit(graph);
    }

    /**
     * 检查是否存在包含电源的闭合路径
     */
    hasClosedCircuitPath(graph) {
        const batteries = this.components.filter(c => c.type === 'battery');

        for (const battery of batteries) {
            const visited = new Set();
            if (this.dfsFindClosedPath(graph, battery.id, battery.id, visited, 0)) {
                return true;
            }
        }

        return false;
    }

    /**
     * DFS查找闭合路径
     */
    dfsFindClosedPath(graph, startId, currentId, visited, depth) {
        if (depth > 50) return false; // 防止无限递归

        visited.add(currentId);
        const currentNode = graph.get(currentId);

        for (const neighbor of currentNode.neighbors) {
            const neighborId = neighbor.id;
            const neighborComponent = graph.get(neighborId).component;

            // 跳过断开的开关
            if (neighborComponent.type === 'switch' && neighborComponent.isOpen()) {
                continue;
            }

            if (neighborId === startId && depth > 1) {
                return true; // 找到闭合路径
            }

            if (!visited.has(neighborId)) {
                if (this.dfsFindClosedPath(graph, startId, neighborId, visited, depth + 1)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 短路检测（基于端点图）
     */
    checkForShortCircuit(graph) {
        const batteries = this.components.filter(c => c.type === 'battery');
        for (const battery of batteries) {
            if (this.detectShortCircuitPinBased(battery.id)) {
                throw new Error('警告: 检测到可能的短路！');
            }
        }
    }

    /**
     * 基于端点图的短路检测
     * 从电池的一个端点出发，寻找回到起点的低阻回路
     */
    detectShortCircuitPinBased(startCompId) {
        const startPin = `${startCompId}-0`;
        return this.shortCircuitPinDFS(startPin, startPin, new Set(), 0, 0, false);
    }

    /**
     * 端点图短路检测 DFS
     * 路径模式: wire -> component -> wire -> component -> ...
     */
    shortCircuitPinDFS(startPin, currentPin, visited, resistance, depth, hasLoad) {
        if (depth > 50) return false;
        visited.add(currentPin);

        // 解析当前端点
        const parts = currentPin.split('-');
        const compId = parseInt(parts[0]);
        const pinIdx = parseInt(parts[1]);
        const comp = this.components.find(c => c.id === compId);
        if (!comp) return false;

        // 走到该元件的另一个端点（元件内部边）
        const otherPinIdx = pinIdx === 0 ? 1 : 0;
        const otherPin = `${compId}-${otherPinIdx}`;

        // 更新电阻
        let nextResistance = resistance;
        if (comp.type === 'resistor') {
            nextResistance += comp.getResistance();
        } else if (comp.type === 'switch' && !comp.isOpen()) {
            nextResistance += comp.getResistance();
        } else if (comp.type === 'ammeter') {
            nextResistance += comp.getResistance();
        } else if (comp.type === 'battery') {
            nextResistance += comp.getInternalResistance ? comp.getInternalResistance() : 0.1;
        }

        // 更新负载标记
        const nextHasLoad = hasLoad || comp.type === 'resistor' || comp.type === 'ammeter' || comp.type === 'voltmeter';

        // 检查是否通过元件边回到起点
        if (otherPin === startPin && depth >= 1) {
            if (!nextHasLoad && nextResistance <= 0.5) {
                return true;
            }
        }

        // 从 otherPin 出发，通过导线走到其他端点
        if (!visited.has(otherPin)) {
            for (const conn of this.connections) {
                const fromIdx = conn.fromPointIndex !== null ? conn.fromPointIndex : 0;
                const toIdx = conn.toPointIndex !== null ? conn.toPointIndex : 1;
                const connFromPin = `${conn.fromComponentId}-${fromIdx}`;
                const connToPin = `${conn.toComponentId}-${toIdx}`;

                let nextPin = null;
                if (connFromPin === otherPin) nextPin = connToPin;
                else if (connToPin === otherPin) nextPin = connFromPin;

                if (nextPin) {
                    if (nextPin === startPin && depth >= 1) {
                        if (!nextHasLoad && nextResistance <= 0.5) return true;
                    }
                    if (!visited.has(nextPin)) {
                        if (this.shortCircuitPinDFS(startPin, nextPin, new Set(visited), nextResistance, depth + 1, nextHasLoad)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * 识别电路拓扑结构
     */
    identifyCircuits(graph) {
        const circuits = [];
        const visited = new Set();

        // 从每个电源开始识别电路
        const batteries = this.components.filter(c => c.type === 'battery');

        for (const battery of batteries) {
            if (!visited.has(battery.id)) {
                const circuit = this.findCircuitFromBattery(graph, battery.id, visited);
                if (circuit.length > 1) {
                    circuits.push(circuit);
                }
            }
        }

        return circuits;
    }

    /**
     * 从电源开始寻找完整电路
     */
    findCircuitFromBattery(graph, batteryId, visited) {
        const circuit = [];
        const stack = [batteryId];
        const tempVisited = new Set();

        while (stack.length > 0) {
            const currentId = stack.pop();

            if (tempVisited.has(currentId)) continue;
            tempVisited.add(currentId);

            const component = graph.get(currentId).component;
            circuit.push(component);
            visited.add(currentId);

            // 如果是断开的开关，停止搜索此路径
            if (component.type === 'switch' && component.isOpen()) {
                continue;
            }

            // 探索邻居
            const node = graph.get(currentId);
            for (const neighbor of node.neighbors) {
                const neighborComponent = graph.get(neighbor.id).component;

                if (!tempVisited.has(neighbor.id)) {
                    stack.push(neighbor.id);
                }
            }
        }

        return circuit;
    }

    /**
     * 计算单个电路
     */
    calculateCircuit(circuit) {
        // 分离串联和并联部分
        const analysis = this.analyzeTopology(circuit);

        // 计算等效电阻
        const totalResistance = this.calculateEquivalentResistance(analysis);

        // 获取总电压
        const totalVoltage = this.getTotalVoltage(analysis);

        // 应用欧姆定律：I = U/R
        const totalCurrent = totalVoltage / totalResistance;

        if (!isFinite(totalCurrent)) {
            throw new Error('错误: 电路参数异常（电阻或电压无效）');
        }

        // 分配电流和电压
        this.distributeCurrentAndVoltage(analysis, totalCurrent, totalVoltage);
    }

    /**
     * 分析电路拓扑结构
     */
    analyzeTopology(circuit) {
        // 简单地识别串联/并联结构
        const batteries = circuit.filter(c => c.type === 'battery');
        const resistors = circuit.filter(c => c.type === 'resistor');
        const switches = circuit.filter(c => c.type === 'switch' && !c.isOpen());
        const ammeters = circuit.filter(c => c.type === 'ammeter');
        // 电压表是测量仪器，不参与电路等效电阻计算
        const voltmeters = circuit.filter(c => c.type === 'voltmeter');

        // 判断是串联还是并联
        // 在串联电路中，所有元件在同一路径上
        // 在并联电路中，存在多个独立路径

        // 构建节点连接关系
        const nodeConnections = this.buildNodeConnections(circuit);
        const pathCount = this.countParallelPaths(nodeConnections);

        return {
            components: circuit,
            batteries: batteries,
            resistors: resistors,
            switches: switches,
            ammeters: ammeters,
            voltmeters: voltmeters, // 电压表单独记录
            isParallel: pathCount > 2,
            nodeConnections: nodeConnections,
            parallelPaths: pathCount
        };
    }

    /**
     * 构建节点连接关系（基于端点的电气节点）
     */
    buildNodeConnections(circuit) {
        // 使用并查集合并导线连接的端点，形成电气节点
        const circuitIds = new Set(circuit.map(c => c.id));
        const pinParent = new Map();

        function find(pin) {
            if (!pinParent.has(pin)) pinParent.set(pin, pin);
            if (pinParent.get(pin) !== pin) {
                const parent = find(pinParent.get(pin));
                pinParent.set(pin, parent);
                return parent;
            }
            return pinParent.get(pin);
        }

        function union(pin1, pin2) {
            const root1 = find(pin1);
            const root2 = find(pin2);
            if (root1 !== root2) pinParent.set(root1, root2);
        }

        // 为电路中的每个元件注册端点
        for (const comp of circuit) {
            find(`${comp.id}-0`);
            find(`${comp.id}-1`);
        }

        // 合并导线连接的端点（只处理与当前电路相关的连接）
        for (const conn of this.connections) {
            if (!circuitIds.has(conn.fromComponentId) || !circuitIds.has(conn.toComponentId)) {
                continue;
            }
            const fromIdx = conn.fromPointIndex !== null ? conn.fromPointIndex : 0;
            const toIdx = conn.toPointIndex !== null ? conn.toPointIndex : 1;
            union(`${conn.fromComponentId}-${fromIdx}`, `${conn.toComponentId}-${toIdx}`);
        }

        // 计算每个电气节点连接的元件数量
        const nodeMap = new Map(); // unionId -> Set of component IDs

        for (const comp of circuit) {
            const u0 = find(`${comp.id}-0`);
            const u1 = find(`${comp.id}-1`);

            if (!nodeMap.has(u0)) nodeMap.set(u0, new Set());
            if (!nodeMap.has(u1)) nodeMap.set(u1, new Set());
            nodeMap.get(u0).add(comp.id);
            nodeMap.get(u1).add(comp.id);
        }

        return nodeMap;
    }

    /**
     * 计算并联路径数量
     * 基于电气节点的最大度数判断
     * 串联电路 maxBranch=2，并联电路 maxBranch>=3
     */
    countParallelPaths(nodeConnections) {
        let maxBranch = 0;
        nodeConnections.forEach((componentSet) => {
            maxBranch = Math.max(maxBranch, componentSet.size);
        });
        return maxBranch;
    }

    /**
     * 计算等效电阻
     */
    calculateEquivalentResistance(analysis) {
        // 分离串联电阻和并联电阻
        // 串联元件：按顺序累加电阻
        // 并联元件：使用 1/Rp = 1/R1 + 1/R2 + ... 公式

        // 收集所有电阻值用于并联计算
        const allResistances = [];

        // 电阻（可能是串联或并联）
        for (const resistor of analysis.resistors) {
            allResistances.push(resistor.getResistance());
        }

        // 开关闭合时的电阻（串联）
        for (const sw of analysis.switches) {
            allResistances.push(sw.getResistance());
        }

        // 电流表内阻（串联）
        for (const ammeter of analysis.ammeters) {
            allResistances.push(ammeter.getResistance());
        }

        // 电压表内阻很大（并联测量），不计入总电阻
        // 电压表是测量仪器，应该被排除在电路等效电阻计算之外

        let totalResistance = 0;

        if (analysis.isParallel && analysis.resistors.length > 0) {
            // 并联电路：所有电阻、闭合开关、电流表都参与并联计算
            const parallelComponents = [];
            for (const resistor of analysis.resistors) {
                parallelComponents.push(resistor);
            }
            for (const sw of analysis.switches) {
                parallelComponents.push(sw);
            }
            for (const ammeter of analysis.ammeters) {
                parallelComponents.push(ammeter);
            }
            
            // 计算并联等效电阻
            totalResistance = this.calculateParallelResistance(parallelComponents);
        } else {
            // 串联电路：所有电阻直接相加
            for (const r of allResistances) {
                if (r > 0 && r !== Infinity) {
                    totalResistance += r;
                }
            }
        }

        return totalResistance;
    }

    /**
     * 计算并联电阻
     */
    calculateParallelResistance(resistors) {
        let sumOfReciprocal = 0;

        for (const resistor of resistors) {
            const r = resistor.getResistance();
            if (r > 0) {
                sumOfReciprocal += 1 / r;
            }
        }

        return sumOfReciprocal > 0 ? 1 / sumOfReciprocal : 0;
    }

    /**
     * 获取总电压
     */
    getTotalVoltage(analysis) {
        let totalVoltage = 0;

        for (const battery of analysis.batteries) {
            totalVoltage += battery.getVoltage();
        }

        return totalVoltage;
    }

    /**
     * 分配电流和电压
     */
    distributeCurrentAndVoltage(analysis, totalCurrent, totalVoltage) {
        if (analysis.isParallel) {
            // 并联电路：电压相同，电流分流
            this.distributeParallelCircuit(analysis, totalVoltage);
        } else {
            // 串联电路：电流相同，电压分压
            this.distributeSeriesCircuit(analysis, totalCurrent, totalVoltage);
        }
    }

    /**
     * 串联电路分配
     */
    distributeSeriesCircuit(analysis, totalCurrent, totalVoltage) {
        // 计算串联电路的总电阻
        let totalResistance = 0;
        const seriesComponents = [];

        // 收集所有串联元件及其电阻
        for (const resistor of analysis.resistors) {
            seriesComponents.push({ component: resistor, resistance: resistor.getResistance() });
            totalResistance += resistor.getResistance();
        }

        for (const sw of analysis.switches) {
            seriesComponents.push({ component: sw, resistance: sw.getResistance() });
            totalResistance += sw.getResistance();
        }

        for (const ammeter of analysis.ammeters) {
            seriesComponents.push({ component: ammeter, resistance: ammeter.getResistance() });
            totalResistance += ammeter.getResistance();
        }

        // 电池电压用于分压计算
        let remainingVoltage = totalVoltage;

        // 分配电压和电流给所有串联元件
        for (let i = 0; i < seriesComponents.length; i++) {
            const { component, resistance } = seriesComponents[i];

            // 所有元件电流相同
            component.setCurrent(totalCurrent);

            // 电压分配：按电阻比例分压
            // 最后一个元件获得剩余电压（避免浮点误差）
            if (i === seriesComponents.length - 1) {
                component.setVoltage(remainingVoltage);
            } else {
                const voltageDrop = totalCurrent * resistance;
                component.setVoltage(voltageDrop);
                remainingVoltage -= voltageDrop;
            }
        }
    }

    /**
     * 并联电路分配
     */
    distributeParallelCircuit(analysis, totalVoltage) {
        // 各元件电压相同
        for (const resistor of analysis.resistors) {
            resistor.setVoltage(totalVoltage);
            const current = totalVoltage / resistor.getResistance();
            resistor.setCurrent(current);
        }

        // 闭合开关（视为小电阻）
        for (const sw of analysis.switches) {
            sw.setVoltage(totalVoltage);
            const current = totalVoltage / sw.getResistance();
            sw.setCurrent(current);
        }

        // 电流表读数
        for (const ammeter of analysis.ammeters) {
            // 查找与电流表直接相连的电阻，显示该支路电流
            const connectedResistors = analysis.resistors.filter(r =>
                ammeter.connections.includes(r.id) || r.connections.includes(ammeter.id)
            );
            if (connectedResistors.length > 0) {
                ammeter.setCurrent(connectedResistors[0].getCurrent());
            } else {
                // 如果没有直接相连的电阻，显示所有支路电流之和
                let totalCurrent = 0;
                for (const r of analysis.resistors) {
                    totalCurrent += r.getCurrent();
                }
                ammeter.setCurrent(totalCurrent);
            }
        }
    }

    /**
     * 计算支路电流
     */
    calculateBranchCurrent(ammeter, analysis) {
        // 简化的支路电流计算
        const connectedResistors = analysis.resistors.filter(r =>
            r.connections.includes(ammeter.id) || ammeter.connections.includes(r.id)
        );

        if (connectedResistors.length > 0) {
            const resistor = connectedResistors[0];
            return resistor.getCurrent();
        }

        return 0;
    }

    /**
     * 传播电压值（处理电表）
     */
    propagateValues() {
        for (const component of this.components) {
            if (component.type === 'voltmeter') {
                // 查找与电压表并联连接的元件
                // 电压表应该测量与其直接相连的元件两端的电压
                const connectedComponents = this.components.filter(c =>
                    component.connections.includes(c.id) || c.connections.includes(component.id)
                );

                // 电压表应该测量与其并联的电阻或电池的电压
                // 由于电压表内阻很大，它不影响被测电路
                let measuredVoltage = 0;

                for (const connected of connectedComponents) {
                    if (connected.type === 'resistor') {
                        // 测量电阻两端的电压
                        measuredVoltage = connected.getVoltage();
                        break;
                    } else if (connected.type === 'battery') {
                        // 测量电池两端的电压
                        measuredVoltage = connected.getVoltage();
                        break;
                    }
                }

                component.setVoltage(measuredVoltage);
            }
        }
    }

    /**
     * 获取模拟结果
     */
    getResults() {
        const results = {
            totalCurrent: this.getTotalCurrent(),
            totalVoltage: this.getTotalVoltageFromComponents(),
            errors: this.simulationError,
            isSimulating: this.isSimulating,
            componentReadings: {}
        };

        // 收集各元件的读数
        for (const component of this.components) {
            if (component.type === 'ammeter') {
                results.componentReadings[`ammeter_${component.id}`] = {
                    type: 'ammeter',
                    id: component.id,
                    current: component.getCurrent()
                };
            } else if (component.type === 'voltmeter') {
                results.componentReadings[`voltmeter_${component.id}`] = {
                    type: 'voltmeter',
                    id: component.id,
                    voltage: component.getVoltage()
                };
            } else if (component.type === 'resistor') {
                results.componentReadings[`resistor_${component.id}`] = {
                    type: 'resistor',
                    id: component.id,
                    current: component.getCurrent(),
                    voltage: component.getVoltage(),
                    resistance: component.getResistance()
                };
            }
        }

        return results;
    }

    /**
     * 获取总电流
     * 优先使用已计算的结果，确保与 distributeSeriesCircuit 分配的值一致
     */
    getTotalCurrent() {
        // 如果模拟正在运行且已计算过，直接取主回路电阻的电流作为总电流
        const resistors = this.components.filter(c => c.type === 'resistor');
        if (this.isSimulating && resistors.length > 0) {
            // 所有串联电阻电流相同，取第一个有电流值的即可
            for (const r of resistors) {
                const c = r.getCurrent();
                if (c > 0) return c;
            }
        }

        // 计算总电压
        let totalVoltage = 0;
        for (const component of this.components) {
            if (component.type === 'battery') {
                totalVoltage += component.getVoltage();
            }
        }

        if (totalVoltage === 0 || this.components.length === 0) {
            return 0;
        }

        // 尝试通过拓扑分析计算等效电阻（排除电压表，电压表是测量仪器不影响主电路）
        try {
            const mainCircuitComponents = this.components.filter(c => c.type !== 'voltmeter');
            const analysis = this.analyzeTopology(mainCircuitComponents);
            const totalResistance = this.calculateEquivalentResistance(analysis);
            if (totalResistance > 0 && isFinite(totalResistance)) {
                return totalVoltage / totalResistance;
            }
        } catch (e) {
            // 拓扑分析失败时回退到简单相加
        }

        // 回退：简单串联计算
        let totalResistance = 0;
        const closedSwitches = this.components.filter(c => c.type === 'switch' && !c.isOpen());
        const ammeters = this.components.filter(c => c.type === 'ammeter');

        for (const resistor of resistors) {
            totalResistance += resistor.getResistance();
        }
        for (const sw of closedSwitches) {
            totalResistance += sw.getResistance();
        }
        for (const ammeter of ammeters) {
            totalResistance += ammeter.getResistance();
        }

        return totalResistance > 0 ? totalVoltage / totalResistance : 0;
    }

    /**
     * 获取总电压
     */
    getTotalVoltageFromComponents() {
        let totalVoltage = 0;
        for (const component of this.components) {
            if (component.type === 'battery') {
                totalVoltage += component.getVoltage();
            }
        }
        return totalVoltage;
    }

    /**
     * 重置计算
     */
    resetCalculations() {
        for (const component of this.components) {
            if (component.type === 'resistor') {
                component.setCurrent(0);
                component.setVoltage(0);
            } else if (component.type === 'ammeter') {
                component.setCurrent(0);
            } else if (component.type === 'voltmeter') {
                component.setVoltage(0);
            }
        }
    }
}

// 全局变量
globalThis.circuitSimulator = new CircuitSimulator();

/**
 * 初始化函数
 */
function initializeSimulator() {
    console.log('simulator.js 初始化完成');
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', initializeSimulator);
