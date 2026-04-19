// 电路模拟器 - ui.js
// 处理拖拽、点击、显示交互

console.log('✅ ui.js 加载成功！');

/**
 * 全局变量
 */
let canvas = null;
let ctx = null;
let selectedComponent = null;
let selectedWire = null; // 选中的导线
let draggedComponent = null;
let isConnecting = false;
let connectionStart = null;
let isDragging = false;
let mouseOffset = { x: 0, y: 0 };
let tempConnection = null; // 临时连线预览
let connectionPoints = []; // 所有连接点
let dragStartPos = null; // 用于判断拖拽距离
let mousePos = { x: 0, y: 0 }; // 当前鼠标位置

/**
 * 初始化函数
 */
function initializeUI() {
    console.log('ui.js 初始化...');

    // 初始化Canvas
    canvas = document.getElementById('circuit-canvas');
    if (!canvas) {
        console.error('无法找到Canvas元素');
        return;
    }
    ctx = canvas.getContext('2d');

    // 绑定事件监听器
    bindEventListeners();

    // 加载默认组件到模拟器
    syncComponentsToSimulator();

    // 绘制初始状态
    redrawCanvas();

    console.log('UI 初始化完成');
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 清空按钮
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearWorkspace);
    }

    // 模拟按钮
    const simulateBtn = document.getElementById('simulate-btn');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', startSimulation);
    }

    // 停止按钮
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    // 撤销按钮
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (globalThis.commandHistory && globalThis.commandHistory.undo()) {
                updateHistoryButtons();
                redrawCanvas();
                updateStatusBar();
            }
        });
    }
    
    // 重做按钮
    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (globalThis.commandHistory && globalThis.commandHistory.redo()) {
                updateHistoryButtons();
                redrawCanvas();
                updateStatusBar();
            }
        });
    }
    
    // 保存按钮
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            try {
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `circuit_${timestamp}.json`;
                globalThis.circuitStorage.saveCircuit(filename);
            } catch (error) {
                console.error('保存失败:', error);
                alert('保存电路失败: ' + error.message);
            }
        });
    }
    
    // 加载按钮
    const loadBtn = document.getElementById('load-btn');
    const loadFileInput = document.getElementById('load-file-input');
    if (loadBtn && loadFileInput) {
        loadBtn.addEventListener('click', () => {
            loadFileInput.click();
        });
        
        loadFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await globalThis.circuitStorage.loadCircuit(file);
                    updateHistoryButtons();
                    redrawCanvas();
                    updateStatusBar();
                    alert('电路已成功加载');
                } catch (error) {
                    console.error('加载失败:', error);
                    alert('加载电路失败: ' + error.message);
                }
                
                // 清除input的值，以便可以重复选择同名文件
                e.target.value = '';
            }
        });
    }

    // Canvas事件
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('click', onCanvasClick);
    
    // 键盘事件
    document.addEventListener('keydown', onKeyDown);

    // 拖拽事件
    const componentItems = document.querySelectorAll('.component-item');
    componentItems.forEach(item => {
        item.addEventListener('dragstart', onComponentDragStart);
    });

    canvas.addEventListener('dragover', onCanvasDragOver);
    canvas.addEventListener('drop', onCanvasDrop);
}

/**
 * 更新撤销/重做按钮状态
 */
function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn && globalThis.commandHistory) {
        undoBtn.disabled = !globalThis.commandHistory.canUndo();
    }
    
    if (redoBtn && globalThis.commandHistory) {
        redoBtn.disabled = !globalThis.commandHistory.canRedo();
    }
}

/**
 * 同步组件到模拟器
 */
function syncComponentsToSimulator() {
    if (globalThis.circuitSimulator) {
        globalThis.circuitSimulator.setCircuit(
            globalThis.circuitComponents,
            globalThis.connections
        );
    }
}

/**
 * 清空工作区
 */
function clearWorkspace() {
    if (confirm('确定要清空所有元件和连接吗？')) {
        globalThis.circuitComponents = [];
        globalThis.connections = [];
        globalThis.nextComponentId = 1;

        syncComponentsToSimulator();
        selectedComponent = null;
        selectedWire = null;
        connectionStart = null;
        isConnecting = false;

        updateStatusBar();
        redrawCanvas();
        updateHistoryButtons();

        console.log('工作区已清空');
    }
}

/**
 * 键盘事件处理
 */
function onKeyDown(event) {
    const key = event.key;
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    
    switch (key) {
        case 'Delete':
            event.preventDefault();
            deleteSelected();
            break;
            
        case 'z':
            if (ctrlOrCmd) {
                event.preventDefault();
                if (globalThis.commandHistory && globalThis.commandHistory.undo()) {
                    updateHistoryButtons();
                    redrawCanvas();
                    updateStatusBar();
                }
            }
            break;
            
        case 'y':
            if (ctrlOrCmd) {
                event.preventDefault();
                if (globalThis.commandHistory && globalThis.commandHistory.redo()) {
                    updateHistoryButtons();
                    redrawCanvas();
                    updateStatusBar();
                }
            }
            break;
    }
}

/**
 * 删除选中的组件或导线
 */
function deleteSelected() {
    if (selectedComponent) {
        const command = CommandFactory.createCommand(CommandType.REMOVE_COMPONENT, selectedComponent);
        globalThis.commandHistory.execute(command);
        selectedComponent = null;
        clearPropertiesPanel();
        updateHistoryButtons();
        redrawCanvas();
        updateStatusBar();
    } else if (selectedWire) {
        const command = CommandFactory.createCommand(CommandType.DISCONNECT, selectedWire);
        globalThis.commandHistory.execute(command);
        selectedWire = null;
        updateHistoryButtons();
        redrawCanvas();
        updateStatusBar();
    }
}

/**
 * 开始模拟
 */
function startSimulation() {
    console.log('UI: 开始电路模拟');

    // 检查是否有组件
    if (globalThis.circuitComponents.length === 0) {
        alert('请先添加一些电路元件');
        return;
    }

    // 同步到模拟器
    syncComponentsToSimulator();

    // 执行模拟
    const result = globalThis.circuitSimulator.startSimulation();

    if (result.success) {
        // 更新UI显示
        updateMeasurements();
        redrawCanvas();

        // 启动实时更新定时器
        if (!simulationUpdateInterval) {
            simulationUpdateInterval = setInterval(() => {
                if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
                    updateReadings();
                }
            }, 100);
        }

        // 启动动画循环以优化显示效果
        if (!simulationAnimationId) {
            simulationAnimationId = requestAnimationFrame(animationLoop);
        }

        console.log('模拟成功 - 实时更新已启用');
    } else {
        alert(`模拟错误: ${result.error}`);
    }
}

/**
 * 停止模拟
 */
function stopSimulation() {
    console.log('UI: 停止电路模拟');

    if (globalThis.circuitSimulator) {
        globalThis.circuitSimulator.stopSimulation();
    }

    // 重置显示
    updateMeasurements();
    redrawCanvas();
}

/**
 * 更新测量值显示
 */
function updateMeasurements() {
    const results = globalThis.circuitSimulator ? globalThis.circuitSimulator.getResults() : null;

    // 更新总电流、总电压
    const totalCurrentEl = document.getElementById('total-current');
    const totalVoltageEl = document.getElementById('total-voltage');

    if (results && results.isSimulating) {
        if (totalCurrentEl) totalCurrentEl.textContent = results.totalCurrent.toFixed(2);
        if (totalVoltageEl) totalVoltageEl.textContent = results.totalVoltage.toFixed(2);
    } else {
        if (totalCurrentEl) totalCurrentEl.textContent = '0.00';
        if (totalVoltageEl) totalVoltageEl.textContent = '0.00';
    }
}

/**
 * Canvas鼠标按下
 */
function onCanvasMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const point = new Point(x, y);
    
    // 记录拖拽起始位置
    dragStartPos = { x: x, y: y };
    mousePos = { x: x, y: y };

    // 检查是否点击在连接点上
    const connectionPoint = findConnectionPointAt(point);
    
    if (connectionPoint && !isConnecting) {
        // 开始连接
        isConnecting = true;
        connectionStart = connectionPoint;
        console.log('开始连接，起始组件:', connectionPoint.component.id, '连接点:', connectionPoint.index);
        return;
    }

    // 查找被点击的组件
    const component = findComponentAt(point);

    if (component) {
        // 如果正在连接，检查是否点击在另一个组件的连接点上
        if (isConnecting && connectionStart) {
            const targetPoint = component.getNearestConnectionPoint(point);
            const distance = point.distanceTo(targetPoint);
            
            // 如果点击在目标组件的连接点附近且不是同一个组件
            if (distance < 20 && component.id !== connectionStart.component.id) {
                // 完成连接
                completeConnection(connectionStart, { component, point: targetPoint });
            }
            
            // 清除连接状态
            isConnecting = false;
            connectionStart = null;
            tempConnection = null;
        } else {
            // 普通拖拽
            selectedComponent = component;
            selectedWire = null; // 取消导线选择
            isDragging = true;
            mouseOffset.x = x - component.x;
            mouseOffset.y = y - component.y;

            // 更新属性面板
            showComponentProperties(component);
        }
    } else {
        // 点击空白区域，检查是否是点击导线
        const wire = findWireAt(point);
        if (wire) {
            selectedWire = wire;
            selectedComponent = null; // 取消组件选择
            clearPropertiesPanel();
        } else {
            // 点击空白区域
            selectedComponent = null;
            selectedWire = null;
            clearPropertiesPanel();
        }
        
        // 如果正在连接，点击空白处取消连接
        if (isConnecting) {
            isConnecting = false;
            connectionStart = null;
            tempConnection = null;
        }
        
        isDragging = false;
    }

    redrawCanvas();
}

/**
 * Canvas鼠标移动
 */
function onCanvasMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    mousePos = { x: x, y: y }; // 更新当前鼠标位置

    if (isDragging && selectedComponent) {
        // 拖拽组件
        selectedComponent.x = x - mouseOffset.x;
        selectedComponent.y = y - mouseOffset.y;
        redrawCanvas();
    } else if (isConnecting && connectionStart) {
        // 正在连线,更新临时连线
        tempConnection = {
            from: connectionStart.point,
            to: new Point(x, y)
        };
        redrawCanvas();
    }

    // 更新鼠标样式
    const point = new Point(x, y);
    const component = findComponentAt(point);
    const connectionPoint = findConnectionPointAt(point);
    
    if (connectionPoint) {
        canvas.style.cursor = 'crosshair';
    } else if (component) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}

/**
 * Canvas鼠标释放
 */
function onCanvasMouseUp(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 记录组件移动到历史
    if (isDragging && selectedComponent && dragStartPos) {
        const dragDistance = Math.sqrt((x - dragStartPos.x) ** 2 + (y - dragStartPos.y) ** 2);
        if (dragDistance > 5) { // 只记录真正的拖拽
            const oldX = dragStartPos.x - mouseOffset.x;
            const oldY = dragStartPos.y - mouseOffset.y;
            const newX = selectedComponent.x;
            const newY = selectedComponent.y;
            
            if (globalThis.commandHistory && (oldX !== newX || oldY !== newY)) {
                const command = CommandFactory.createCommand(
                    CommandType.MOVE_COMPONENT, 
                    selectedComponent, 
                    oldX, 
                    oldY, 
                    newX, 
                    newY
                );
                globalThis.commandHistory.execute(command);
                updateHistoryButtons();
            }
        }
    }
    
    isDragging = false;
    dragStartPos = null;
    
    // 如果正在连接但没有完成，取消连接
    if (isConnecting && !tempConnection) {
        isConnecting = false;
        connectionStart = null;
        redrawCanvas();
    }
}

/**
 * Canvas点击事件
 */
function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查拖拽距离，如果移动超过5像素，则不触发点击
    if (dragStartPos) {
        const dragDistance = Math.sqrt((x - dragStartPos.x) ** 2 + (y - dragStartPos.y) ** 2);
        if (dragDistance > 5) {
            dragStartPos = null;
            return; // 拖拽过程中不触发点击
        }
        dragStartPos = null;
    }

    const point = new Point(x, y);

    // 查找被点击的组件
    let component = findComponentAt(point);
    if (component) {
        // 切换开关
        if (component.type === 'switch') {
            const command = CommandFactory.createCommand(CommandType.TOGGLE_SWITCH, component);
            globalThis.commandHistory.execute(command);
            updateStatusBar();
            redrawCanvas();
            updateHistoryButtons();
            console.log(`开关 ${component.id} 状态: ${component.isOpen() ? '闭合' : '断开'}`);
        }
    }
}

/**
 * 拖拽开始
 */
function onComponentDragStart(event) {
    const componentItem = event.target.closest('.component-item');
    if (!componentItem) return;
    const componentType = componentItem.dataset.type;
    event.dataTransfer.setData('component-type', componentType);
    event.dataTransfer.effectAllowed = 'copy';
    console.log('开始拖拽:', componentType);
}

/**
 * Canvas拖拽悬停
 */
function onCanvasDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

/**
 * Canvas放置
 */
function onCanvasDrop(event) {
    event.preventDefault();

    const componentType = event.dataTransfer.getData('component-type');
    if (!componentType) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    try {
        // 创建组件
        const component = ComponentFactory.createComponent(componentType, x, y);
        
        // 使用历史记录
        if (globalThis.commandHistory) {
            const command = CommandFactory.createCommand(CommandType.ADD_COMPONENT, {
                id: component.id,
                type: componentType,
                x: x,
                y: y,
                properties: component.properties || {}
            });
            globalThis.commandHistory.execute(command);
        } else {
            // 备份方式，如果历史记录未初始化
            globalThis.circuitComponents.push(component);
        }

        console.log(`添加 ${componentType} 在 (${x}, ${y})`);

        // 重新绘制
        redrawCanvas();
        updateStatusBar();
        updateHistoryButtons();
    } catch (error) {
        console.error('创建组件失败:', error);
        alert('创建组件失败: ' + error.message);
    }
}

/**
 * 查找组件
 */
function findComponentAt(point) {
    for (const component of globalThis.circuitComponents) {
        if (component.containsPoint(point)) {
            return component;
        }
    }
    return null;
}

/**
 * 查找连接点
 */
function findConnectionPointAt(point) {
    const threshold = 15; // 连接点检测距离阈值
    
    for (const component of globalThis.circuitComponents) {
        const points = component.getConnectionPoints();
        for (let i = 0; i < points.length; i++) {
            const connectionPoint = points[i];
            const distance = point.distanceTo(connectionPoint);
            if (distance < threshold) {
                return { component, point: connectionPoint, index: i };
            }
        }
    }
    return null;
}

/**
 * 查找导线
 */
function findWireAt(point) {
    const threshold = 10; // 导线检测距离阈值
    
    for (const connection of globalThis.connections) {
        const fromComponent = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
        const toComponent = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);
        
        if (fromComponent && toComponent) {
            // 使用存储的端点索引获取实际端点位置
            let fromPoint, toPoint;
            if (connection.fromPointIndex !== null && connection.fromPointIndex !== undefined) {
                fromPoint = fromComponent.getConnectionPoint(connection.fromPointIndex);
            } else {
                fromPoint = fromComponent.getNearestConnectionPoint(connection.fromPoint || new Point(toComponent.x, toComponent.y));
            }
            if (connection.toPointIndex !== null && connection.toPointIndex !== undefined) {
                toPoint = toComponent.getConnectionPoint(connection.toPointIndex);
            } else {
                toPoint = toComponent.getNearestConnectionPoint(connection.toPoint || new Point(fromComponent.x, fromComponent.y));
            }
            
            // 计算点到线段的距离
            const distance = pointToLineDistance(point, fromPoint, toPoint);
            if (distance < threshold) {
                return connection;
            }
        }
    }
    return null;
}

/**
 * 计算点到线段的距离
 */
function pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 完成连接
 */
function completeConnection(start, end) {
    // 检查是否已存在相同连接
    const existingConnection = globalThis.connections.find(conn => {
        const sameDirection = conn.fromComponentId === start.component.id && 
                             conn.toComponentId === end.component.id;
        const reverseDirection = conn.fromComponentId === end.component.id && 
                                conn.toComponentId === start.component.id;
        return sameDirection || reverseDirection;
    });
    
    if (existingConnection) {
        console.log('连接已存在，跳过');
        return;
    }

    // 确保传递端点索引
    const fromPointIndex = start.point && start.point.index !== undefined ? start.point.index : null;
    const toPointIndex = end.point && end.point.index !== undefined ? end.point.index : null;
    
    const connection = new Connection(
        start.component.id,
        end.component.id,
        start.point,
        end.point,
        fromPointIndex,
        toPointIndex
    );
    
    // 使用历史记录
    if (globalThis.commandHistory) {
        const command = CommandFactory.createCommand(CommandType.CONNECT, connection);
        globalThis.commandHistory.execute(command);
    } else {
        // 备份方式，如果历史记录未初始化
        globalThis.connections.push(connection);
        
        // 更新组件的连接列表
        start.component.addConnection(end.component);
        end.component.addConnection(start.component);
    }
    
    console.log('完成连接:', connection.id);
    updateStatusBar();
    updateHistoryButtons();
}

/**
 * 显示组件属性
 */
function showComponentProperties(component) {
    const propertiesContent = document.getElementById('properties-content');
    if (!propertiesContent) return;

    let html = `<h3>元件 ${component.id}</h3>`;
    html += `<p>类型: ${getComponentTypeName(component.type)}</p>`;

    // 根据类型显示不同属性
    switch (component.type) {
        case 'battery':
            html += `
                <label>电压 (V): <input type="number" id="prop-voltage" value="${component.getVoltage()}" step="0.1"></label><br>
                <label>内阻 (Ω): <input type="number" id="prop-internalR" value="${component.getInternalResistance()}" step="0.01"></label><br>
                <button onclick="updateBatteryProperties(${component.id})">应用</button>
            `;
            break;

        case 'resistor':
            html += `
                <label>电阻 (Ω): <input type="number" id="prop-resistance" value="${component.getResistance()}" step="1"></label><br>
                <button onclick="updateResistorProperties(${component.id})">应用</button>
                <hr>
                <p><strong>模拟结果:</strong></p>
                <p>电流: ${component.getCurrent().toFixed(3)} A</p>
                <p>电压: ${component.getVoltage().toFixed(2)} V</p>
            `;
            break;

        case 'switch':
            const state = component.isOpen() ? '断开' : '闭合';
            html += `<p>状态: <span class="switch-state">${state}</span></p>`;
            html += `<button onclick="toggleSwitch(${component.id})">切换开关</button>`;
            break;

        case 'ammeter':
            html += `<p>电流: ${component.getCurrent().toFixed(3)} A</p>`;
            html += `<p>内阻: ${component.getResistance()} Ω</p>`;
            break;

        case 'voltmeter':
            html += `<p>电压: ${component.getVoltage().toFixed(2)} V</p>`;
            html += `<p>内阻: ${component.getResistance()} Ω</p>`;
            break;
    }

    propertiesContent.innerHTML = html;
}

/**
 * 更新电池属性
 */
function updateBatteryProperties(componentId) {
    const component = globalThis.circuitComponents.find(c => c.id === componentId);
    if (!component || component.type !== 'battery') return;

    const voltageInput = document.getElementById('prop-voltage');
    const internalRInput = document.getElementById('prop-internalR');
    
    const oldVoltage = component.getVoltage();
    const oldInternalR = component.getInternalResistance();
    const newVoltage = parseFloat(voltageInput.value);
    const newInternalR = parseFloat(internalRInput.value);

    // 使用历史记录
    if (globalThis.commandHistory) {
        // 更新电压属性
        if (oldVoltage !== newVoltage) {
            const voltageCommand = CommandFactory.createCommand(
                CommandType.UPDATE_PROPERTY, 
                component, 
                'voltage', 
                oldVoltage, 
                newVoltage
            );
            globalThis.commandHistory.execute(voltageCommand);
        }
        
        // 更新内阻属性
        if (oldInternalR !== newInternalR) {
            const internalRCommand = CommandFactory.createCommand(
                CommandType.UPDATE_PROPERTY, 
                component, 
                'internalResistance', 
                oldInternalR, 
                newInternalR
            );
            globalThis.commandHistory.execute(internalRCommand);
        }
        
        updateHistoryButtons();
    } else {
        // 备份方式
        component.setVoltage(newVoltage);
        component.setInternalResistance(newInternalR);
    }

    console.log('电池属性已更新');
}

/**
 * 更新电阻属性
 */
function updateResistorProperties(componentId) {
    const component = globalThis.circuitComponents.find(c => c.id === componentId);
    if (!component || component.type !== 'resistor') return;

    const resistanceInput = document.getElementById('prop-resistance');
    const oldResistance = component.getResistance();
    const newResistance = parseFloat(resistanceInput.value);

    // 使用历史记录
    if (globalThis.commandHistory) {
        const command = CommandFactory.createCommand(
            CommandType.UPDATE_PROPERTY, 
            component, 
            'resistance', 
            oldResistance, 
            newResistance
        );
        globalThis.commandHistory.execute(command);
        updateHistoryButtons();
    } else {
        // 备份方式
        component.setResistance(newResistance);
    }

    console.log('电阻属性已更新');
}

/**
 * 切换开关
 */
function toggleSwitch(componentId) {
    const component = globalThis.circuitComponents.find(c => c.id === componentId);
    if (!component || component.type !== 'switch') return;

    const state = component.toggle();
    console.log(`开关 ${componentId} 已切换: ${state ? '闭合' : '断开'}`);

    showComponentProperties(component);
    redrawCanvas();
}

/**
 * 清除属性面板
 */
function clearPropertiesPanel() {
    const propertiesContent = document.getElementById('properties-content');
    if (propertiesContent) {
        propertiesContent.innerHTML = '<p>请选择一个元件查看属性</p>';
    }
}

/**
 * 获取组件类型名称
 */
function getComponentTypeName(type) {
    const names = {
        battery: '电池',
        resistor: '电阻',
        switch: '开关',
        ammeter: '电流表',
        voltmeter: '电压表'
    };
    return names[type] || type;
}

/**
 * 更新状态栏
 */
function updateStatusBar() {
    const selectedComponentEl = document.getElementById('selected-component');
    const connectionStatusEl = document.getElementById('connection-status');

    if (selectedComponentEl) {
        if (selectedComponent) {
            selectedComponentEl.textContent = `已选择: ${getComponentTypeName(selectedComponent.type)} #${selectedComponent.id}`;
        } else {
            selectedComponentEl.textContent = '未选择元件';
        }
    }

    if (connectionStatusEl) {
        const count = globalThis.circuitComponents ? globalThis.circuitComponents.length : 0;
        connectionStatusEl.textContent = `元件数: ${count}, 连接数: ${globalThis.connections ? globalThis.connections.length : 0}`;
    }

    // 也更新测量值
    updateMeasurements();
}

/**
 * 重绘画布
 */
function redrawCanvas() {
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景网格
    drawGrid();

    // 绘制连接（导线）
    drawConnections();

    // 绘制组件
    drawComponents();
}

/**
 * 绘制网格
 */
function drawGrid() {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

/**
 * 绘制连接
 */
function drawConnections() {
    // 绘制已完成的连接（黑色实线）
    for (const connection of globalThis.connections) {
        const fromComponent = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
        const toComponent = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);
        
        if (fromComponent && toComponent) {
            // 设置样式，选中的导线使用红色高亮
            if (selectedWire && selectedWire.id === connection.id) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
            } else {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
            }

            // 计算连接点 - 使用存储的端点索引获取实际端点位置
            let fromPoint, toPoint;
            if (connection.fromPointIndex !== null && connection.fromPointIndex !== undefined) {
                fromPoint = fromComponent.getConnectionPoint(connection.fromPointIndex);
            } else {
                fromPoint = fromComponent.getNearestConnectionPoint(connection.fromPoint || new Point(toComponent.x, toComponent.y));
            }
            if (connection.toPointIndex !== null && connection.toPointIndex !== undefined) {
                toPoint = toComponent.getConnectionPoint(connection.toPointIndex);
            } else {
                toPoint = toComponent.getNearestConnectionPoint(connection.toPoint || new Point(fromComponent.x, fromComponent.y));
            }

            ctx.beginPath();
            ctx.moveTo(fromPoint.x, fromPoint.y);
            ctx.lineTo(toPoint.x, toPoint.y);
            ctx.stroke();
        }
    }
    
    // 绘制临时连线预览（灰色虚线）
    if (tempConnection && isConnecting) {
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(tempConnection.from.x, tempConnection.from.y);
        ctx.lineTo(tempConnection.to.x, tempConnection.to.y);
        ctx.stroke();
        
        ctx.setLineDash([]); // 重置虚线
    }
}

/**
 * 绘制组件
 */
function drawComponents() {
    for (const component of globalThis.circuitComponents) {
        // 设置样式
        if (component === selectedComponent) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
        }

        // 根据类型绘制不同形状
        drawComponent(component);

        // 绘制元件ID
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(component.id), component.x, component.y - 40);

        // 如果是模拟中，显示读数
        if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
            drawComponentReadings(component);
        }
    }
    
    // 绘制连接点（蓝色圆点）
    drawConnectionPoints();
}

/**
 * 绘制连接点（蓝色圆点）
 */
function drawConnectionPoints() {
    // 收集所有连接点位置
    const allPoints = new Map(); // 使用Map去重，键为"x,y"
    
    for (const component of globalThis.circuitComponents) {
        const points = component.getConnectionPoints();
        for (const point of points) {
            const key = `${point.x},${point.y}`;
            allPoints.set(key, point);
        }
    }
    
    // 绘制所有连接点
    for (const point of allPoints.values()) {
        ctx.fillStyle = '#2196f3'; // 蓝色
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制白色边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

/**
 * 绘制单个组件
 */
function drawComponent(component) {
    switch (component.type) {
        case 'battery':
            drawBattery(component);
            break;
        case 'resistor':
            drawResistor(component);
            break;
        case 'switch':
            drawSwitch(component);
            break;
        case 'ammeter':
            drawAmmeter(component);
            break;
        case 'voltmeter':
            drawVoltmeter(component);
            break;
    }
}

/**
 * 绘制电池
 */
function drawBattery(component) {
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(component.x - 30, component.y - 10, 60, 20);
    ctx.strokeRect(component.x - 30, component.y - 10, 60, 20);

    // 绘制极性
    ctx.fillStyle = '#000';
    ctx.fillRect(component.x + 10, component.y - 20, 4, 40);
    ctx.fillRect(component.x - 14, component.y - 15, 4, 30);

    // 显示电压
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.fillText(`${component.getVoltage()}V`, component.x, component.y - 25);
}

/**
 * 绘制电阻
 */
function drawResistor(component) {
    ctx.fillStyle = '#e91e63';
    drawZigzag(component.x - 30, component.y, component.x + 30, component.y);

    // 显示电阻值
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.fillText(`${component.getResistance()}Ω`, component.x, component.y - 15);
}

/**
 * 绘制折线（电阻形状）
 */
function drawZigzag(x1, y1, x2, y2) {
    const length = x2 - x1;
    const segments = 5;
    const segmentWidth = length / segments;

    ctx.beginPath();
    ctx.moveTo(x1, y1);

    for (let i = 1; i <= segments; i++) {
        const x = x1 + (i * segmentWidth);
        const y = (i % 2 === 1) ? y1 - 15 : y1 + 15;
        ctx.lineTo(x - segmentWidth / 2, y);
        ctx.lineTo(x, y1);
    }

    ctx.stroke();
}

/**
 * 绘制开关
 */
function drawSwitch(component) {
    const isOpen = component.isOpen();
    ctx.strokeStyle = isOpen ? '#f44336' : '#4caf50';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(component.x - 30, component.y);

    if (isOpen) {
        ctx.lineTo(component.x - 10, component.y);
        ctx.moveTo(component.x + 10, component.y - 10);
        ctx.lineTo(component.x + 30, component.y);
    } else {
        ctx.lineTo(component.x + 30, component.y);
    }

    ctx.stroke();

    // 恢复样式
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // 显示状态
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.fillText(isOpen ? '断开' : '闭合', component.x, component.y - 15);
}

/**
 * 绘制电流表
 */
function drawAmmeter(component) {
    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(component.x, component.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 绘制字母A
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', component.x, component.y);
}

/**
 * 绘制电压表
 */
function drawVoltmeter(component) {
    ctx.fillStyle = '#9c27b0';
    ctx.beginPath();
    ctx.arc(component.x, component.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 绘制字母V
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', component.x, component.y);
}

/**
 * 绘制组件读数（模拟时）
 */
function drawComponentReadings(component) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';

    switch (component.type) {
        case 'ammeter':
            ctx.fillText(`${component.getCurrent().toFixed(3)}A`, component.x, component.y + 35);
            break;
        case 'voltmeter':
            ctx.fillText(`${component.getVoltage().toFixed(1)}V`, component.x, component.y + 35);
            break;
        case 'resistor':
            const current = component.getCurrent();
            if (current > 0) {
                ctx.fillStyle = '#4caf50';
                ctx.fillText(`${current.toFixed(3)}A`, component.x, component.y + 20);
            }
            break;
    }
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', initializeUI);
