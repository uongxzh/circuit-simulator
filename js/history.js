// 电路模拟器 - history.js
// 实现撤销/重做功能，使用命令模式

console.log('✅ history.js 加载成功！');

/**
 * 操作类型常量
 */
const CommandType = {
    ADD_COMPONENT: 'ADD_COMPONENT',
    REMOVE_COMPONENT: 'REMOVE_COMPONENT',
    MOVE_COMPONENT: 'MOVE_COMPONENT',
    CONNECT: 'CONNECT',
    DISCONNECT: 'DISCONNECT',
    UPDATE_PROPERTY: 'UPDATE_PROPERTY',
    TOGGLE_SWITCH: 'TOGGLE_SWITCH'
};

/**
 * 历史命令基类
 */
class Command {
    constructor(type, data) {
        this.type = type;
        this.data = data;
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('execute() 必须在子类中实现');
    }

    undo() {
        throw new Error('undo() 必须在子类中实现');
    }
}

/**
 * 添加元件命令
 */
class AddComponentCommand extends Command {
    constructor(componentData) {
        super(CommandType.ADD_COMPONENT, componentData);
    }

    execute() {
        const component = ComponentFactory.createComponent(
            this.data.type,
            this.data.x,
            this.data.y,
            this.data.properties
        );
        
        // 恢复属性
        if (this.data.properties) {
            Object.keys(this.data.properties).forEach(key => {
                const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
                if (typeof component[setter] === 'function') {
                    component[setter](this.data.properties[key]);
                } else {
                    component[key] = this.data.properties[key];
                }
            });
        }
        
        globalThis.circuitComponents.push(component);
        return component;
    }

    undo() {
        const index = globalThis.circuitComponents.findIndex(c => c.id === this.data.id);
        if (index !== -1) {
            const component = globalThis.circuitComponents[index];
            
            // 移除相关的连接
            globalThis.connections = globalThis.connections.filter(conn => 
                conn.fromComponentId !== component.id && conn.toComponentId !== component.id
            );
            
            // 从其他组件的连接列表中移除
            globalThis.circuitComponents.forEach(comp => {
                if (comp.connections) {
                    comp.removeConnection(component.id);
                }
            });
            
            // 移除组件
            globalThis.circuitComponents.splice(index, 1);
        }
    }
}

/**
 * 移除元件命令
 */
class RemoveComponentCommand extends Command {
    constructor(component) {
        super(CommandType.REMOVE_COMPONENT, {
            component: component,
            index: globalThis.circuitComponents.indexOf(component),
            connections: globalThis.connections.filter(conn => 
                conn.fromComponentId === component.id || conn.toComponentId === component.id
            )
        });
    }

    execute() {
        const index = globalThis.circuitComponents.findIndex(c => c.id === this.data.component.id);
        if (index !== -1) {
            const component = globalThis.circuitComponents[index];
            
            // 移除相关的连接
            globalThis.connections = globalThis.connections.filter(conn => 
                conn.fromComponentId !== component.id && conn.toComponentId !== component.id
            );
            
            // 从其他组件的连接列表中移除
            globalThis.circuitComponents.forEach(comp => {
                if (comp.connections) {
                    comp.removeConnection(component.id);
                }
            });
            
            // 移除组件
            globalThis.circuitComponents.splice(index, 1);
        }
    }

    undo() {
        // 恢复组件
        globalThis.circuitComponents.splice(this.data.index, 0, this.data.component);
        
        // 恢复属性
        if (this.data.component.properties) {
            Object.keys(this.data.component.properties).forEach(key => {
                this.data.component[key] = this.data.component.properties[key];
            });
        }
        
        // 恢复连接
        if (this.data.connections && this.data.connections.length > 0) {
            this.data.connections.forEach(conn => {
                globalThis.connections.push(conn);
                
                // 恢复组件间的连接关系
                const fromComp = globalThis.circuitComponents.find(c => c.id === conn.fromComponentId);
                const toComp = globalThis.circuitComponents.find(c => c.id === conn.toComponentId);
                if (fromComp && toComp) {
                    fromComp.addConnection(toComp);
                    toComp.addConnection(fromComp);
                }
            });
        }
    }
}

/**
 * 移动元件命令
 */
class MoveComponentCommand extends Command {
    constructor(component, oldX, oldY, newX, newY) {
        super(CommandType.MOVE_COMPONENT, {
            componentId: component.id,
            oldX: oldX,
            oldY: oldY,
            newX: newX,
            newY: newY
        });
    }

    execute() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component) {
            globalThis.circuitComponents.forEach(comp => {
                if (comp.selected) {
                    comp.x = this.data.newX;
                    comp.y = this.data.newY;
                }
            });
        }
    }

    undo() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component) {
            globalThis.circuitComponents.forEach(comp => {
                if (comp.selected) {
                    comp.x = this.data.oldX;
                    comp.y = this.data.oldY;
                }
            });
        }
    }
}

/**
 * 连接命令
 */
class ConnectCommand extends Command {
    constructor(connection) {
        super(CommandType.CONNECT, connection);
    }

    execute() {
        const existingConnection = globalThis.connections.find(conn => {
            const sameDirection = conn.fromComponentId === this.data.fromComponentId && 
                                 conn.toComponentId === this.data.toComponentId;
            const reverseDirection = conn.fromComponentId === this.data.toComponentId && 
                                    conn.toComponentId === this.data.fromComponentId;
            return sameDirection || reverseDirection;
        });
        
        if (!existingConnection) {
            globalThis.connections.push(this.data);
            
            // 更新组件的连接列表
            const fromComp = globalThis.circuitComponents.find(c => c.id === this.data.fromComponentId);
            const toComp = globalThis.circuitComponents.find(c => c.id === this.data.toComponentId);
            if (fromComp && toComp) {
                fromComp.addConnection(toComp);
                toComp.addConnection(fromComp);
            }
        }
    }

    undo() {
        const index = globalThis.connections.findIndex(conn => conn.id === this.data.id);
        if (index !== -1) {
            const connection = globalThis.connections[index];
            
            // 从组件的连接列表中移除
            const fromComp = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
            const toComp = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);
            if (fromComp && toComp) {
                fromComp.removeConnection(connection.toComponentId);
                toComp.removeConnection(connection.fromComponentId);
            }
            
            // 移除连接
            globalThis.connections.splice(index, 1);
        }
    }
}

/**
 * 断开连接命令
 */
class DisconnectCommand extends Command {
    constructor(connection) {
        super(CommandType.DISCONNECT, {
            connection: connection,
            index: globalThis.connections.indexOf(connection)
        });
    }

    execute() {
        const index = globalThis.connections.findIndex(conn => conn.id === this.data.connection.id);
        if (index !== -1) {
            const connection = globalThis.connections[index];
            
            // 从组件的连接列表中移除
            const fromComp = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
            const toComp = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);
            if (fromComp && toComp) {
                fromComp.removeConnection(connection.toComponentId);
                toComp.removeConnection(connection.fromComponentId);
            }
            
            // 移除连接
            globalThis.connections.splice(index, 1);
        }
    }

    undo() {
        // 恢复连接
        globalThis.connections.splice(this.data.index, 0, this.data.connection);
        
        // 恢复组件间的连接关系
        const fromComp = globalThis.circuitComponents.find(c => c.id === this.data.connection.fromComponentId);
        const toComp = globalThis.circuitComponents.find(c => c.id === this.data.connection.toComponentId);
        if (fromComp && toComp) {
            fromComp.addConnection(toComp);
            toComp.addConnection(fromComp);
        }
    }
}

/**
 * 更新属性命令
 */
class UpdatePropertyCommand extends Command {
    constructor(component, propertyName, oldValue, newValue) {
        super(CommandType.UPDATE_PROPERTY, {
            componentId: component.id,
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
        });
    }

    execute() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component) {
            const setter = `set${this.data.propertyName.charAt(0).toUpperCase() + this.data.propertyName.slice(1)}`;
            if (typeof component[setter] === 'function') {
                component[setter](this.data.newValue);
            } else {
                component[this.data.propertyName] = this.data.newValue;
            }
        }
    }

    undo() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component) {
            const setter = `set${this.data.propertyName.charAt(0).toUpperCase() + this.data.propertyName.slice(1)}`;
            if (typeof component[setter] === 'function') {
                component[setter](this.data.oldValue);
            } else {
                component[this.data.propertyName] = this.data.oldValue;
            }
        }
    }
}

/**
 * 切换开关命令
 */
class ToggleSwitchCommand extends Command {
    constructor(switchComponent) {
        super(CommandType.TOGGLE_SWITCH, {
            componentId: switchComponent.id,
            currentState: switchComponent.isOpen()
        });
    }

    execute() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component && component.type === 'switch') {
            component.toggle();
        }
    }

    undo() {
        const component = globalThis.circuitComponents.find(c => c.id === this.data.componentId);
        if (component && component.type === 'switch') {
            // 切换回原来的状态
            if (component.isOpen() !== this.data.currentState) {
                component.toggle();
            }
        }
    }
}

/**
 * 历史记录管理器
 */
class HistoryManager {
    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.currentIndex = -1;
    }

    /**
     * 执行命令并记录在历史中
     */
    execute(command) {
        // 清除当前位置之后的历史记录（重做栈）
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // 执行命令
        command.execute();
        
        // 添加到历史记录
        this.history.push(command);
        this.currentIndex++;
        
        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
        
        console.log(`执行命令: ${command.type}, 历史记录数: ${this.history.length}, 当前索引: ${this.currentIndex}`);
    }

    /**
     * 撤销上一步操作
     */
    undo() {
        if (this.canUndo()) {
            const command = this.history[this.currentIndex];
            command.undo();
            this.currentIndex--;
            
            console.log(`撤销命令: ${command.type}, 当前索引: ${this.currentIndex}`);
            return true;
        }
        return false;
    }

    /**
     * 重做下一步操作
     */
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            command.execute();
            
            console.log(`重做命令: ${command.type}, 当前索引: ${this.currentIndex}`);
            return true;
        }
        return false;
    }

    /**
     * 是否可以撤销
     */
    canUndo() {
        return this.currentIndex >= 0;
    }

    /**
     * 是否可以重做
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * 清除所有历史记录
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        console.log('历史记录已清除');
    }

    /**
     * 获取当前状态信息
     */
    getStatus() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            historyCount: this.history.length,
            currentIndex: this.currentIndex,
            maxHistory: this.maxHistory
        };
    }
}

/**
 * 命令工厂类
 */
class CommandFactory {
    static createCommand(type, ...args) {
        switch (type) {
            case CommandType.ADD_COMPONENT:
                return new AddComponentCommand(args[0]);
            case CommandType.REMOVE_COMPONENT:
                return new RemoveComponentCommand(args[0]);
            case CommandType.MOVE_COMPONENT:
                return new MoveComponentCommand(args[0], args[1], args[2], args[3], args[4]);
            case CommandType.CONNECT:
                return new ConnectCommand(args[0]);
            case CommandType.DISCONNECT:
                return new DisconnectCommand(args[0]);
            case CommandType.UPDATE_PROPERTY:
                return new UpdatePropertyCommand(args[0], args[1], args[2], args[3]);
            case CommandType.TOGGLE_SWITCH:
                return new ToggleSwitchCommand(args[0]);
            default:
                throw new Error(`未知的命令类型: ${type}`);
        }
    }
}

// 创建全局历史管理器实例
globalThis.commandHistory = new HistoryManager(20);
console.log('命令历史管理器已初始化，最大历史记录数: 20');
