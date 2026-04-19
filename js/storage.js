// 电路模拟器 - storage.js
// 实现电路保存/加载功能

console.log('✅ storage.js 加载成功！');

/**
 * 电路版本号
 */
const CIRCUIT_VERSION = '1.0.0';

/**
 * 存储管理器
 */
class CircuitStorage {
    constructor() {
        this.version = CIRCUIT_VERSION;
        console.log('Storage: 电路版本号', this.version);
    }

    /**
     * 保存电路到JSON对象
     */
    serialize() {
        try {
            const circuitData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                components: [],
                connections: [],
                nextComponentId: globalThis.nextComponentId
            };

            // 序列化所有组件
            globalThis.circuitComponents.forEach(component => {
                const componentData = {
                    id: component.id,
                    type: component.type,
                    x: component.x,
                    y: component.y,
                    properties: {}
                };

                // 提取组件特定属性
                switch (component.type) {
                    case 'battery':
                        componentData.properties.voltage = component.getVoltage();
                        componentData.properties.internalResistance = component.getInternalResistance();
                        break;
                    case 'resistor':
                        componentData.properties.resistance = component.getResistance();
                        break;
                    case 'switch':
                        componentData.properties.isOpen = component.isOpen();
                        break;
                }

                circuitData.components.push(componentData);
            });

            // 序列化连接关系
            globalThis.connections.forEach(connection => {
                circuitData.connections.push({
                    id: connection.id,
                    fromComponentId: connection.fromComponentId,
                    toComponentId: connection.toComponentId,
                    fromPoint: { x: connection.fromPoint.x, y: connection.fromPoint.y },
                    toPoint: { x: connection.toPoint.x, y: connection.toPoint.y }
                });
            });

            console.log('Storage: 序列化成功，包含', circuitData.components.length, '个组件和', circuitData.connections.length, '个连接');
            return circuitData;
        } catch (error) {
            console.error('Storage: 序列化失败', error);
            throw new Error('电路数据序列化失败: ' + error.message);
        }
    }

    /**
     * 从JSON对象加载电路
     */
    deserialize(circuitData) {
        try {
            // 验证版本兼容性
            if (circuitData.version && circuitData.version !== this.version) {
                console.warn('Storage: 版本不匹配，当前版本', this.version, '数据版本', circuitData.version);
            }

            console.log('Storage: 开始反序列化，包含', circuitData.components.length, '个组件和', circuitData.connections.length, '个连接');

            // 清空当前电路
            globalThis.circuitComponents = [];
            globalThis.connections = [];
            
            // 重新创建所有组件
            circuitData.components.forEach(componentData => {
                try {
                    const component = ComponentFactory.createComponent(
                        componentData.type,
                        componentData.x,
                        componentData.y,
                        componentData.id
                    );
                    
                    // 恢复组件属性
                    if (componentData.properties) {
                        Object.keys(componentData.properties).forEach(key => {
                            const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
                            if (typeof component[setter] === 'function') {
                                component[setter](componentData.properties[key]);
                            } else {
                                component[key] = componentData.properties[key];
                            }
                        });
                    }
                    
                    globalThis.circuitComponents.push(component);
                } catch (error) {
                    console.warn('Storage: 创建组件失败', componentData, error);
                }
            });

            // 更新 nextComponentId
            if (circuitData.nextComponentId) {
                globalThis.nextComponentId = circuitData.nextComponentId;
            } else {
                // 如果没有保存 nextComponentId，从现有组件计算
                const maxId = globalThis.circuitComponents.reduce((max, comp) => Math.max(max, comp.id), 0);
                globalThis.nextComponentId = maxId + 1;
            }

            // 重建连接关系
            circuitData.connections.forEach(connData => {
                try {
                    const fromComponent = globalThis.circuitComponents.find(c => c.id === connData.fromComponentId);
                    const toComponent = globalThis.circuitComponents.find(c => c.id === connData.toComponentId);
                    
                    if (fromComponent && toComponent) {
                        const connection = new Connection(
                            connData.fromComponentId,
                            connData.toComponentId,
                            new Point(connData.fromPoint.x, connData.fromPoint.y),
                            new Point(connData.toPoint.x, connData.toPoint.y)
                        );
                        
                        if (connData.id !== undefined) {
                            connection.id = connData.id;
                        }
                        
                        globalThis.connections.push(connection);
                        
                        // 更新组件的连接列表
                        fromComponent.addConnection(toComponent);
                        toComponent.addConnection(fromComponent);
                    }
                } catch (error) {
                    console.warn('Storage: 创建连接失败', connData, error);
                }
            });

            console.log('Storage: 反序列化成功');
            return true;
        } catch (error) {
            console.error('Storage: 反序列化失败', error);
            throw new Error('电路数据加载失败: ' + error.message);
        }
    }

    /**
     * 保存电路到文件
     */
    saveCircuit(filename = 'circuit.json') {
        try {
            const circuitData = this.serialize();
            const dataStr = JSON.stringify(circuitData, null, 2);
            
            // 创建Blob对象
            const blob = new Blob([dataStr], { type: 'application/json' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            // 清理
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('Storage: 电路已保存到文件', filename);
            return true;
        } catch (error) {
            console.error('Storage: 保存电路失败', error);
            throw error;
        }
    }

    /**
     * 从文件加载电路
     */
    loadCircuit(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        const circuitData = JSON.parse(content);
                        
                        // 清空历史记录
                        if (globalThis.commandHistory) {
                            globalThis.commandHistory.clear();
                        }
                        
                        // 反序列化电路
                        this.deserialize(circuitData);
                        
                        console.log('Storage: 电路已从文件加载');
                        resolve(true);
                    } catch (error) {
                        console.error('Storage: 解析文件失败', error);
                        reject(new Error('文件格式错误: ' + error.message));
                    }
                };
                
                reader.onerror = (error) => {
                    console.error('Storage: 读取文件失败', error);
                    reject(new Error('读取文件失败'));
                };
                
                reader.readAsText(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 保存电路到本地存储
     */
    saveToLocalStorage(name = 'autosave') {
        try {
            const circuitData = this.serialize();
            const key = `circuit_${name}`;
            localStorage.setItem(key, JSON.stringify(circuitData));
            
            console.log('Storage: 电路已保存到本地存储', key);
            return true;
        } catch (error) {
            console.error('Storage: 保存到本地存储失败', error);
            return false;
        }
    }

    /**
     * 从本地存储加载电路
     */
    loadFromLocalStorage(name = 'autosave') {
        try {
            const key = `circuit_${name}`;
            const content = localStorage.getItem(key);
            
            if (content) {
                const circuitData = JSON.parse(content);
                
                // 清空历史记录
                if (globalThis.commandHistory) {
                    globalThis.commandHistory.clear();
                }
                
                // 反序列化电路
                this.deserialize(circuitData);
                
                console.log('Storage: 电路已从本地存储加载', key);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Storage: 从本地存储加载失败', error);
            return false;
        }
    }
}

// 创建全局存储实例
globalThis.circuitStorage = new CircuitStorage();
console.log('存储管理器已初始化');
