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
let draggedControlPoint = null; // 正在拖拽的控制点 { connection, index }
let hoveredControlPoint = null; // 悬停的控制点

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
 * 将鼠标/CSS坐标转换为Canvas内部坐标
 */
function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

/**
 * Canvas鼠标按下
 */
function onCanvasMouseDown(event) {
    const coords = getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    const point = new Point(x, y);
    
    // 记录拖拽起始位置
    dragStartPos = { x: x, y: y };
    mousePos = { x: x, y: y };

    // 检查是否点击在控制点上
    const controlPoint = findControlPointAt(point);
    if (controlPoint && !isConnecting) {
        draggedControlPoint = controlPoint;
        selectedWire = controlPoint.connection;
        selectedComponent = null;
        clearPropertiesPanel();
        showWireProperties(controlPoint.connection);
        redrawCanvas();
        return;
    }

    // 检查是否点击在连接点上
    const connectionPoint = findConnectionPointAt(point);

    // 如果正在连接模式下，优先完成连接
    if (isConnecting && connectionStart) {
        if (connectionPoint && connectionPoint.component.id !== connectionStart.component.id) {
            // 点击在另一个组件的连接点上，精确完成连接
            completeConnection(connectionStart, connectionPoint);
        } else {
            // 未点击在有效连接点上，尝试组件最近连接点作为回退
            const component = findComponentAt(point);
            if (component && component.id !== connectionStart.component.id) {
                const targetPoint = component.getNearestConnectionPoint(point);
                const distance = point.distanceTo(targetPoint);
                if (distance < 35) {
                    completeConnection(connectionStart, { component, point: targetPoint, index: targetPoint.index });
                }
            }
        }
        // 清除连接状态
        isConnecting = false;
        connectionStart = null;
        tempConnection = null;
        redrawCanvas();
        return;
    }

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
        // 普通拖拽
        selectedComponent = component;
        selectedWire = null; // 取消导线选择
        isDragging = true;
        mouseOffset.x = x - component.x;
        mouseOffset.y = y - component.y;

        // 更新属性面板
        showComponentProperties(component);
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

        isDragging = false;
    }

    redrawCanvas();
}

/**
 * Canvas鼠标移动
 */
function onCanvasMouseMove(event) {
    const coords = getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    
    mousePos = { x: x, y: y }; // 更新当前鼠标位置

    if (draggedControlPoint) {
        // 拖拽导线控制点
        const cp = draggedControlPoint;
        cp.connection.controlPoints[cp.index] = { x: x, y: y };
        redrawCanvas();
        return;
    }

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
    const cpHover = findControlPointAt(point);
    
    if (cpHover) {
        canvas.style.cursor = 'move';
        hoveredControlPoint = cpHover;
    } else if (connectionPoint) {
        canvas.style.cursor = 'crosshair';
        hoveredControlPoint = null;
    } else if (component) {
        canvas.style.cursor = 'pointer';
        hoveredControlPoint = null;
    } else {
        canvas.style.cursor = 'default';
        hoveredControlPoint = null;
    }
}

/**
 * Canvas鼠标释放
 */
function onCanvasMouseUp(event) {
    const coords = getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    
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
    draggedControlPoint = null;
    
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
    const coords = getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    try {
        // 使用历史记录
        if (globalThis.commandHistory) {
            const command = CommandFactory.createCommand(CommandType.ADD_COMPONENT, {
                type: componentType,
                x: x,
                y: y,
                properties: {}
            });
            globalThis.commandHistory.execute(command);
        } else {
            // 备份方式，如果历史记录未初始化
            const component = ComponentFactory.createComponent(componentType, x, y);
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
    const threshold = 25; // 连接点检测距离阈值（增大以提升连接体验）
    
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
 * 查找导线（支持直线/折线/曲线）
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
            
            let distance;
            if (connection.mode === 'curve' && connection.controlPoints.length > 0) {
                distance = pointToBezierDistance(point, fromPoint, toPoint, connection.controlPoints[0]);
            } else if (connection.mode === 'orthogonal' && connection.controlPoints.length > 0) {
                distance = pointToOrthogonalDistance(point, fromPoint, toPoint, connection.controlPoints[0]);
            } else {
                distance = pointToLineDistance(point, fromPoint, toPoint);
            }
            
            if (distance < threshold) {
                return connection;
            }
        }
    }
    return null;
}

/**
 * 查找控制点
 */
function findControlPointAt(point) {
    const threshold = 12;
    if (!selectedWire) return null;
    
    for (let i = 0; i < selectedWire.controlPoints.length; i++) {
        const cp = selectedWire.controlPoints[i];
        const dx = point.x - cp.x;
        const dy = point.y - cp.y;
        if (Math.sqrt(dx*dx + dy*dy) < threshold) {
            return { connection: selectedWire, index: i };
        }
    }
    return null;
}

/**
 * 计算点到二次贝塞尔曲线的距离
 */
function pointToBezierDistance(point, p0, p2, p1) {
    // 使用离散采样近似
    const samples = 20;
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 1/samples) {
        const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
        const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
        const d = Math.sqrt((point.x-x)**2 + (point.y-y)**2);
        if (d < minDist) minDist = d;
    }
    return minDist;
}

/**
 * 计算点到正交折线的距离
 */
function pointToOrthogonalDistance(point, fromPoint, toPoint, controlPoint) {
    // 确定先水平还是先垂直
    const midX = (fromPoint.x + toPoint.x) / 2;
    const useHorizontalFirst = controlPoint.x < midX;
    
    let d1, d2;
    if (useHorizontalFirst) {
        // 先水平后垂直
        d1 = pointToLineDistance(point, fromPoint, {x: controlPoint.x, y: fromPoint.y});
        d2 = pointToLineDistance(point, {x: controlPoint.x, y: fromPoint.y}, toPoint);
    } else {
        // 先垂直后水平
        d1 = pointToLineDistance(point, fromPoint, {x: fromPoint.x, y: controlPoint.y});
        d2 = pointToLineDistance(point, {x: fromPoint.x, y: controlPoint.y}, toPoint);
    }
    return Math.min(d1, d2);
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
    // 检查是否已存在完全相同的端点连接（基于端点索引，允许同一对组件的多端点连接）
    const fromPointIndex = start.point && start.point.index !== undefined ? start.point.index : null;
    const toPointIndex = end.point && end.point.index !== undefined ? end.point.index : null;

    const existingConnection = globalThis.connections.find(conn => {
        const sameDirection = conn.fromComponentId === start.component.id &&
                             conn.toComponentId === end.component.id &&
                             conn.fromPointIndex === fromPointIndex &&
                             conn.toPointIndex === toPointIndex;
        const reverseDirection = conn.fromComponentId === end.component.id &&
                                conn.toComponentId === start.component.id &&
                                conn.fromPointIndex === toPointIndex &&
                                conn.toPointIndex === fromPointIndex;
        return sameDirection || reverseDirection;
    });

    if (existingConnection) {
        console.log('连接已存在，跳过');
        return;
    }

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

    // 添加旋转控制
    html += `<div style="margin:8px 0;"><label>旋转: 
        <select id="prop-rotation" onchange="rotateComponent(${component.id}, this.value)">
            <option value="0" ${component.rotation===0?'selected':''}>0° (上下)</option>
            <option value="90" ${component.rotation===90?'selected':''}>90° (左右)</option>
            <option value="180" ${component.rotation===180?'selected':''}>180° (下上)</option>
            <option value="270" ${component.rotation===270?'selected':''}>270° (右左)</option>
        </select>
    </label></div>`;

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

/**
 * 旋转元件
 */
function rotateComponent(componentId, rotation) {
    const component = globalThis.circuitComponents.find(c => c.id === componentId);
    if (!component) return;
    const oldRotation = component.rotation;
    const newRotation = parseInt(rotation);
    if (oldRotation !== newRotation) {
        component.setRotation(newRotation);
        if (globalThis.commandHistory) {
            const command = CommandFactory.createCommand(
                CommandType.UPDATE_PROPERTY,
                component,
                'rotation',
                oldRotation,
                newRotation
            );
            globalThis.commandHistory.execute(command);
            updateHistoryButtons();
        }
        redrawCanvas();
    }
}

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

    // 如果正在模拟，重新分析电路以更新电流/电压显示
    if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
        try {
            globalThis.circuitSimulator.analyzeCircuit();
            updateMeasurements();
            redrawCanvas();
        } catch (e) {
            console.warn('重新分析电路失败:', e.message);
        }
    }
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

/**
 * 显示导线属性
 */
function showWireProperties(connection) {
    const propertiesContent = document.getElementById('properties-content');
    if (!propertiesContent) return;
    let html = `<h3>导线 ${connection.fromComponentId} → ${connection.toComponentId}</h3>`;
    html += `<p>连接模式:</p>`;
    html += `<select id="wire-mode" onchange="updateWireMode('${connection.id}', this.value)">`;
    html += `<option value="straight" ${connection.mode==='straight'?'selected':''}>直线</option>`;
    html += `<option value="orthogonal" ${connection.mode==='orthogonal'?'selected':''}>正交折线</option>`;
    html += `<option value="curve" ${connection.mode==='curve'?'selected':''}>贝塞尔曲线</option>`;
    html += `</select>`;
    html += `<p style="margin-top:8px;color:#666;font-size:12px;">提示: 选中导线后拖拽控制点可调节形状</p>`;
    propertiesContent.innerHTML = html;
}

/**
 * 更新导线模式
 */
function updateWireMode(connectionId, mode) {
    const conn = globalThis.connections.find(c => c.id === connectionId);
    if (conn && conn.mode !== mode) {
        conn.setMode(mode);
        redrawCanvas();
    }
}

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

    // 绘制元件
    drawComponents();

    // 绘制控制点（如果有选中的导线）
    if (selectedWire) {
        drawControlPoints();
    }
}

/**
 * 绘制网格
 */
function drawGrid() {
    ctx.strokeStyle = '#e8e8e8';
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

    // 网格交点小圆点
    ctx.fillStyle = '#ddd';
    for (let x = 0; x <= canvas.width; x += 40) {
        for (let y = 0; y <= canvas.height; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * 绘制连接
 */
function drawConnections() {
    for (const connection of globalThis.connections) {
        const fromComponent = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
        const toComponent = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);

        if (fromComponent && toComponent) {
            let fromPoint, toPoint;
            if (connection.fromPointIndex !== null && connection.fromPointIndex !== undefined) {
                fromPoint = fromComponent.getConnectionPoint(connection.fromPointIndex);
            } else {
                fromPoint = fromComponent.getNearestConnectionPoint(connection.toPoint || new Point(toComponent.x, toComponent.y));
            }
            if (connection.toPointIndex !== null && connection.toPointIndex !== undefined) {
                toPoint = toComponent.getConnectionPoint(connection.toPointIndex);
            } else {
                toPoint = toComponent.getNearestConnectionPoint(connection.fromPoint || new Point(fromComponent.x, fromComponent.y));
            }

            // 更新连接点坐标
            connection.updateEndpoints(fromPoint, toPoint);

            // 设置样式
            if (selectedWire && selectedWire.id === connection.id) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2.5;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            drawWirePath(ctx, connection, fromPoint, toPoint);

            // 模拟运行时显示电流方向
            if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
                drawCurrentArrowOnWire(fromPoint, toPoint, connection);
            }
        }
    }

    // 绘制临时连线预览（灰色虚线）
    if (tempConnection && isConnecting) {
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(tempConnection.from.x, tempConnection.from.y);
        ctx.lineTo(tempConnection.to.x, tempConnection.to.y);
        ctx.stroke();

        ctx.setLineDash([]);
    }
}

/**
 * 绘制单根导线路径
 */
function drawWirePath(ctx, connection, fromPoint, toPoint) {
    ctx.beginPath();
    ctx.moveTo(fromPoint.x, fromPoint.y);

    if (connection.mode === 'curve' && connection.controlPoints.length > 0) {
        const cp = connection.controlPoints[0];
        ctx.quadraticCurveTo(cp.x, cp.y, toPoint.x, toPoint.y);
    } else if (connection.mode === 'orthogonal' && connection.controlPoints.length > 0) {
        const cp = connection.controlPoints[0];
        const midX = (fromPoint.x + toPoint.x) / 2;
        const useHorizontalFirst = cp.x < midX;
        if (useHorizontalFirst) {
            ctx.lineTo(cp.x, fromPoint.y);
            ctx.lineTo(cp.x, toPoint.y);
        } else {
            ctx.lineTo(fromPoint.x, cp.y);
            ctx.lineTo(toPoint.x, cp.y);
        }
        ctx.lineTo(toPoint.x, toPoint.y);
    } else {
        ctx.lineTo(toPoint.x, toPoint.y);
    }
    ctx.stroke();
}

/**
 * 绘制导线上的电流方向箭头
 */
function drawCurrentArrowOnWire(fromPoint, toPoint, connection) {
    let midX, midY, angle;
    if (connection.mode === 'curve' && connection.controlPoints.length > 0) {
        const cp = connection.controlPoints[0];
        const t = 0.5;
        midX = (1-t)*(1-t)*fromPoint.x + 2*(1-t)*t*cp.x + t*t*toPoint.x;
        midY = (1-t)*(1-t)*fromPoint.y + 2*(1-t)*t*cp.y + t*t*toPoint.y;
        // 近似切线角度
        const dt = 0.01;
        const nx = (1-(t+dt))*(1-(t+dt))*fromPoint.x + 2*(1-(t+dt))*(t+dt)*cp.x + (t+dt)*(t+dt)*toPoint.x;
        const ny = (1-(t+dt))*(1-(t+dt))*fromPoint.y + 2*(1-(t+dt))*(t+dt)*cp.y + (t+dt)*(t+dt)*toPoint.y;
        angle = Math.atan2(ny - midY, nx - midX);
    } else if (connection.mode === 'orthogonal' && connection.controlPoints.length > 0) {
        const cp = connection.controlPoints[0];
        const midX_avg = (fromPoint.x + toPoint.x) / 2;
        if (cp.x < midX_avg) {
            midX = cp.x;
            midY = (fromPoint.y + toPoint.y) / 2;
            angle = fromPoint.y < toPoint.y ? Math.PI/2 : -Math.PI/2;
        } else {
            midX = (fromPoint.x + toPoint.x) / 2;
            midY = cp.y;
            angle = fromPoint.x < toPoint.x ? 0 : Math.PI;
        }
    } else {
        midX = (fromPoint.x + toPoint.x) / 2;
        midY = (fromPoint.y + toPoint.y) / 2;
        angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
    }

    const arrowSize = 8;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(midX + arrowSize * Math.cos(angle), midY + arrowSize * Math.sin(angle));
    ctx.lineTo(midX + arrowSize * Math.cos(angle + 2.5), midY + arrowSize * Math.sin(angle + 2.5));
    ctx.lineTo(midX + arrowSize * Math.cos(angle - 2.5), midY + arrowSize * Math.sin(angle - 2.5));
    ctx.closePath();
    ctx.fill();
}

/**
 * 绘制控制点
 */
function drawControlPoints() {
    if (!selectedWire || !selectedWire.controlPoints) return;

    for (let i = 0; i < selectedWire.controlPoints.length; i++) {
        const cp = selectedWire.controlPoints[i];

        // 控制点外圈
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 7, 0, Math.PI * 2);
        ctx.stroke();

        // 控制点填充
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // 控制点中心
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * 绘制组件
 */
function drawComponents() {
    for (const component of globalThis.circuitComponents) {
        ctx.save();

        // 移动到元件中心并旋转
        ctx.translate(component.x, component.y);
        ctx.rotate(component.rotation * Math.PI / 180);

        // 选中高亮边框
        if (component === selectedComponent) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-35, -35, 70, 70);
            ctx.setLineDash([]);
        }

        // 绘制元件本体
        drawComponentBody(component);

        ctx.restore();

        // 绘制元件ID（不旋转）
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`#${component.id}`, component.x, component.y - 38);

        // 模拟运行时读数
        if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
            drawComponentReadings(component);
        }
    }

    // 绘制连接点
    drawConnectionPoints();
}

/**
 * 绘制连接点（金属触点）
 */
function drawConnectionPoints() {
    for (const component of globalThis.circuitComponents) {
        const points = component.getConnectionPoints();
        for (const point of points) {
            // 引脚金属圆点
            ctx.fillStyle = '#bdc3c7';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 内部高光
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.arc(point.x - 1, point.y - 1, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * 绘制单个元件本体（已在旋转后的坐标系中）
 */
function drawComponentBody(component) {
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
 * 绘制引脚线
 */
function drawLead(ctx, yStart, yEnd) {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, yStart);
    ctx.lineTo(0, yEnd);
    ctx.stroke();
}

/**
 * 绘制电池
 */
function drawBattery(component) {
    // 引脚线
    drawLead(ctx, -30, -18);
    drawLead(ctx, 18, 30);

    // 电池主体（圆柱形）
    const grad = ctx.createLinearGradient(-12, 0, 12, 0);
    grad.addColorStop(0, '#7f8c8d');
    grad.addColorStop(0.25, '#ecf0f1');
    grad.addColorStop(0.5, '#bdc3c7');
    grad.addColorStop(0.75, '#95a5a6');
    grad.addColorStop(1, '#546e7a');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-10, -18, 20, 36);
    ctx.fill();
    ctx.stroke();

    // 顶部正极金属帽（凸起）
    ctx.fillStyle = '#bdc3c7';
    ctx.strokeStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.rect(-4, -22, 8, 4);
    ctx.fill();
    ctx.stroke();

    // 底部负极金属帽
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.rect(-10, 18, 20, 4);
    ctx.fill();
    ctx.stroke();

    // 正极标识（红色 +）
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 5, -10);

    // 负极标识（蓝色 -）
    ctx.fillStyle = '#3498db';
    ctx.fillText('−', -5, 10);

    // 电压标注
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`${component.getVoltage()}V`, 0, -26);
}

/**
 * 绘制电阻
 */
function drawResistor(component) {
    // 引脚线
    drawLead(ctx, -30, -16);
    drawLead(ctx, 16, 30);

    // 电阻陶瓷主体
    const grad = ctx.createLinearGradient(-8, 0, 8, 0);
    grad.addColorStop(0, '#d35400');
    grad.addColorStop(0.3, '#e67e22');
    grad.addColorStop(0.7, '#d35400');
    grad.addColorStop(1, '#a04000');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#6e2c00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-8, -16, 16, 32);
    ctx.fill();
    ctx.stroke();

    // 电阻体（锯齿形）——画在主体上方
    ctx.strokeStyle = '#fdfefe';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -10);
    ctx.lineTo(-5, -6);
    ctx.lineTo(5, -2);
    ctx.lineTo(-5, 2);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 10);
    ctx.lineTo(0, 14);
    ctx.stroke();

    // 电阻值标注
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${component.getResistance()}Ω`, 0, -22);
}

/**
 * 绘制开关
 */
function drawSwitch(component) {
    const isOpen = component.isOpen();

    // 引脚线
    drawLead(ctx, -30, -14);
    drawLead(ctx, 14, 30);

    // 底座
    ctx.fillStyle = '#ecf0f1';
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-14, -14, 28, 28);
    ctx.fill();
    ctx.stroke();

    // 左侧触点（金属圆）
    ctx.fillStyle = '#95a5a6';
    ctx.strokeStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 右侧触点（金属圆）
    ctx.beginPath();
    ctx.arc(0, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 闸刀（金属杆）
    ctx.strokeStyle = isOpen ? '#c0392b' : '#27ae60';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    if (isOpen) {
        ctx.lineTo(10, -2);
    } else {
        ctx.lineTo(0, 14);
    }
    ctx.stroke();

    // 状态标签
    ctx.fillStyle = isOpen ? '#c0392b' : '#27ae60';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOpen ? '断开' : '闭合', 14, 0);
}

/**
 * 绘制电流表
 */
function drawAmmeter(component) {
    // 引脚线
    drawLead(ctx, -30, -22);
    drawLead(ctx, 22, 30);

    // 金属外框
    const rimGrad = ctx.createLinearGradient(-22, -22, 22, 22);
    rimGrad.addColorStop(0, '#5dade2');
    rimGrad.addColorStop(0.5, '#85c1e9');
    rimGrad.addColorStop(1, '#2e86c1');
    ctx.fillStyle = rimGrad;
    ctx.strokeStyle = '#1f618d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 表盘背景（玻璃白）
    ctx.fillStyle = '#fbfcfc';
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    // 刻度线
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    for (let i = -60; i <= 60; i += 30) {
        const rad = (i - 90) * Math.PI / 180;
        const r1 = 14;
        const r2 = 17;
        ctx.beginPath();
        ctx.moveTo(r1 * Math.cos(rad), r1 * Math.sin(rad));
        ctx.lineTo(r2 * Math.cos(rad), r2 * Math.sin(rad));
        ctx.stroke();
    }

    // 指针（模拟时偏转）
    let current = component.getCurrent();
    let angle = -60 + Math.min(current * 30, 120);
    if (!globalThis.circuitSimulator || !globalThis.circuitSimulator.isSimulating) {
        angle = 0;
    }
    const rad = (angle - 90) * Math.PI / 180;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12 * Math.cos(rad), 12 * Math.sin(rad));
    ctx.stroke();

    // 中心轴
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 文字 A
    ctx.fillStyle = '#2980b9';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, 5);
}

/**
 * 绘制电压表
 */
function drawVoltmeter(component) {
    // 引脚线
    drawLead(ctx, -30, -22);
    drawLead(ctx, 22, 30);

    // 金属外框
    const rimGrad = ctx.createLinearGradient(-22, -22, 22, 22);
    rimGrad.addColorStop(0, '#af7ac5');
    rimGrad.addColorStop(0.5, '#d2b4de');
    rimGrad.addColorStop(1, '#7d3c98');
    ctx.fillStyle = rimGrad;
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 表盘背景
    ctx.fillStyle = '#fbfcfc';
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    // 刻度线
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    for (let i = -60; i <= 60; i += 30) {
        const rad = (i - 90) * Math.PI / 180;
        const r1 = 14;
        const r2 = 17;
        ctx.beginPath();
        ctx.moveTo(r1 * Math.cos(rad), r1 * Math.sin(rad));
        ctx.lineTo(r2 * Math.cos(rad), r2 * Math.sin(rad));
        ctx.stroke();
    }

    // 指针
    let voltage = component.getVoltage();
    let angle = -60 + Math.min(voltage * 5, 120);
    if (!globalThis.circuitSimulator || !globalThis.circuitSimulator.isSimulating) {
        angle = 0;
    }
    const rad = (angle - 90) * Math.PI / 180;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12 * Math.cos(rad), 12 * Math.sin(rad));
    ctx.stroke();

    // 中心轴
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 文字 V
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 0, 5);
}

/**
 * 绘制组件读数（模拟时）
 */
function drawComponentReadings(component) {
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';

    switch (component.type) {
        case 'ammeter':
            ctx.fillText(`${component.getCurrent().toFixed(3)}A`, component.x, component.y + 32);
            break;
        case 'voltmeter':
            ctx.fillText(`${component.getVoltage().toFixed(1)}V`, component.x, component.y + 32);
            break;
        case 'resistor':
            const current = component.getCurrent();
            if (current > 0) {
                ctx.fillStyle = '#27ae60';
                ctx.fillText(`${current.toFixed(3)}A`, component.x, component.y + 26);
            }
            break;
    }
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', initializeUI);
