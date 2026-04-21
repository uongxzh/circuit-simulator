// 电路模拟器 - components.js
// 定义电路元件的数据结构和基类

console.log('✅ components.js 加载成功！');

/**
 * 全局变量
 */
globalThis.circuitComponents = [];
globalThis.connections = [];
globalThis.nextComponentId = 1;

/**
 * 坐标点类
 */
class Point {
    constructor(x, y, index = 0) {
        this.x = x;
        this.y = y;
        this.index = index; // 添加端点索引，0=上, 1=下
    }

    distanceTo(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
}

/**
 * 元件基类
 */
class Component {
    constructor(type, x, y) {
        this.id = globalThis.nextComponentId++;
        this.type = type;
        this.x = x;
        this.y = y;
        this.connections = []; // 与其他元件的连接
        this.properties = {};
    }

    /**
     * 添加连接
     */
    addConnection(component) {
        if (!this.connections.includes(component.id)) {
            this.connections.push(component.id);
        }
    }

    /**
     * 移除连接
     */
    removeConnection(componentId) {
        const index = this.connections.indexOf(componentId);
        if (index !== -1) {
            this.connections.splice(index, 1);
        }
    }

    /**
     * 获取元件上的连接点
     */
    getConnectionPoints() {
        // 默认返回元件的两个端点，index0=上, index1=下
        return [
            new Point(this.x, this.y - 30, 0), // 上端点
            new Point(this.x, this.y + 30, 1)  // 下端点
        ];
    }

    /**
     * 根据索引获取特定的连接点
     * @param {number} index - 端点索引 (0=上, 1=下)
     * @returns {Point} 对应的连接点
     */
    getConnectionPoint(index) {
        if (index === 0) {
            return new Point(this.x, this.y - 30, 0);
        } else if (index === 1) {
            return new Point(this.x, this.y + 30, 1);
        }
        // 默认返回上端点
        return new Point(this.x, this.y - 30, 0);
    }

    /**
     * 检查点是否在元件附近
     */
    containsPoint(point) {
        const distance = Math.sqrt((point.x - this.x) ** 2 + (point.y - this.y) ** 2);
        return distance < 30;
    }

    /**
     * 获取最近的连接点
     */
    getNearestConnectionPoint(point) {
        const points = this.getConnectionPoints();
        let nearest = points[0];
        let minDistance = point.distanceTo(points[0]);

        for (let i = 1; i < points.length; i++) {
            const distance = point.distanceTo(points[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = points[i];
            }
        }

        return nearest;
    }
}

/**
 * 电池类
 */
class Battery extends Component {
    constructor(x, y, voltage = 12) {
        super('battery', x, y);
        this.properties = {
            voltage: voltage, // 电压（伏特）
            internalResistance: 0.1 // 内阻（欧姆）
        };
    }

    setVoltage(voltage) {
        this.properties.voltage = parseFloat(voltage);
    }

    getVoltage() {
        return this.properties.voltage;
    }

    setInternalResistance(resistance) {
        this.properties.internalResistance = parseFloat(resistance);
    }

    getInternalResistance() {
        return this.properties.internalResistance;
    }
}

/**
 * 电阻类
 */
class Resistor extends Component {
    constructor(x, y, resistance = 10) {
        super('resistor', x, y);
        this.properties = {
            resistance: resistance, // 电阻值（欧姆）
            current: 0, // 通过电阻的电流（安培）
            voltage: 0 // 电阻两端的电压（伏特）
        };
    }

    setResistance(resistance) {
        this.properties.resistance = parseFloat(resistance);
    }

    getResistance() {
        return this.properties.resistance;
    }

    setCurrent(current) {
        this.properties.current = parseFloat(current);
    }

    getCurrent() {
        return this.properties.current;
    }

    setVoltage(voltage) {
        this.properties.voltage = parseFloat(voltage);
    }

    getVoltage() {
        return this.properties.voltage;
    }
}

/**
 * 开关类
 */
class Switch extends Component {
    constructor(x, y) {
        super('switch', x, y);
        this.properties = {
            isOpen: true, // 开关状态：true=断开，false=闭合
            resistance: 0.01 // 闭合时的内阻（欧姆）
        };
    }

    toggle() {
        this.properties.isOpen = !this.properties.isOpen;
        return !this.properties.isOpen; // 返回实际电路状态
    }

    setState(isOpen) {
        this.properties.isOpen = isOpen;
    }

    isOpen() {
        return this.properties.isOpen;
    }

    getResistance() {
        return this.properties.isOpen ? Infinity : this.properties.resistance;
    }

    setCurrent(current) {
        this.properties.current = parseFloat(current);
    }

    getCurrent() {
        return this.properties.current || 0;
    }

    setVoltage(voltage) {
        this.properties.voltage = parseFloat(voltage);
    }

    getVoltage() {
        return this.properties.voltage || 0;
    }
}

/**
 * 电流表类
 */
class Ammeter extends Component {
    constructor(x, y) {
        super('ammeter', x, y);
        this.properties = {
            current: 0, // 测量的电流（安培）
            internalResistance: 0.01 // 内阻（欧姆）
        };
    }

    setCurrent(current) {
        this.properties.current = parseFloat(current);
    }

    getCurrent() {
        return this.properties.current;
    }

    getResistance() {
        return this.properties.internalResistance;
    }
}

/**
 * 电压表类
 */
class Voltmeter extends Component {
    constructor(x, y) {
        super('voltmeter', x, y);
        this.properties = {
            voltage: 0, // 测量的电压（伏特）
            internalResistance: 10000 // 内阻（欧姆）
        };
    }

    setVoltage(voltage) {
        this.properties.voltage = parseFloat(voltage);
    }

    getVoltage() {
        return this.properties.voltage;
    }

    getResistance() {
        return this.properties.internalResistance;
    }
}

/**
 * 连接类
 */
class Connection {
    constructor(fromId, toId, fromPoint, toPoint, fromPointIndex = null, toPointIndex = null) {
        this.id = `${fromId}-${toId}`;
        this.fromComponentId = fromId;
        this.toComponentId = toId;
        this.fromPoint = fromPoint; // 起始点坐标
        this.toPoint = toPoint; // 终点坐标
        this.fromPointIndex = fromPointIndex; // 起始端点索引 (0=上, 1=下)
        this.toPointIndex = toPointIndex; // 目标端点索引 (0=上, 1=下)

        // 如果没有提供端点索引但是 Point 对象有 index 属性，则使用该属性
        if (this.fromPointIndex === null && fromPoint && fromPoint.index !== undefined) {
            this.fromPointIndex = fromPoint.index;
        }
        if (this.toPointIndex === null && toPoint && toPoint.index !== undefined) {
            this.toPointIndex = toPoint.index;
        }
    }

    /**
     * 获取另一个端点的元件ID
     */
    getOtherComponentId(componentId) {
        if (componentId === this.fromComponentId) {
            return this.toComponentId;
        } else if (componentId === this.toComponentId) {
            return this.fromComponentId;
        }
        return null;
    }

    /**
     * 检查连接是否包含指定的元件
     */
    containsComponent(componentId) {
        return this.fromComponentId === componentId || this.toComponentId === componentId;
    }
}

/**
 * 元件工厂
 */
class ComponentFactory {
    static createComponent(type, x, y, properties = {}) {
        switch (type) {
            case 'battery':
                return new Battery(x, y, properties.voltage || 12);
            case 'resistor':
                return new Resistor(x, y, properties.resistance || 10);
            case 'switch':
                const sw = new Switch(x, y);
                if (properties.isOpen !== undefined) {
                    sw.setState(properties.isOpen);
                }
                return sw;
            case 'ammeter':
                return new Ammeter(x, y);
            case 'voltmeter':
                return new Voltmeter(x, y);
            default:
                throw new Error(`未知的元件类型: ${type}`);
        }
    }
}

// 导出到全局对象
globalThis.ComponentFactory = ComponentFactory;

/**
 * 根据ID查找元件
 */
function findComponentById(id) {
    return globalThis.circuitComponents.find(comp => comp.id === id);
}

/**
 * 根据类型查找元件
 */
function findComponentsByType(type) {
    return globalThis.circuitComponents.filter(comp => comp.type === type);
}

/**
 * 移除所有元件
 */
function clearAllComponents() {
    globalThis.circuitComponents = [];
    globalThis.connections = [];
    globalThis.nextComponentId = 1;
}

/**
 * 初始化（预留函数，供其他模块调用）
 */
function initializeComponents() {
    console.log('components.js 初始化完成');
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', initializeComponents);
