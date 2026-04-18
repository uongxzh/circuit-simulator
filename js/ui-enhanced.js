// 电路模拟器 - 增强版UI绘制
// 提供改进的Canvas绘制功能，符合电路标准符号

console.log('✅ ui-enhanced.js 加载成功！');

/**
 * Canvas绘制配置
 */
const DRAW_CONFIG = {
    componentWidth: 60,
    componentHeight: 30,
    wireLength: 30,
    gridSize: 20,
    componentColors: {
        battery: '#ffeb3b',
        resistor: '#ff9800',
        switch: '#4caf50',
        ammeter: '#2196f3',
        voltmeter: '#9c27b0'
    }
};

/**
 * 增强的Canvas绘制函数
 * 重新实现绘制函数，使用更标准的电路符号
 */

/**
 * 绘制电池（标准符号：两条竖线，一长一短）
 */
function drawBatteryEnhanced(component) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;

    // 绘制电池符号（两条竖线）
    const x = component.x;
    const y = component.y;

    // 短竖线（负极）
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 18);
    ctx.lineTo(x - 8, y + 18);
    ctx.stroke();

    // 长竖线（正极）
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 22);
    ctx.lineTo(x + 8, y + 22);
    ctx.stroke();

    // 绘制连线
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 8, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 显示电压值
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${component.getVoltage()}V`, x, y - 28);

    // 显示正负极标识
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('+', x + 8, y - 25);
    ctx.fillStyle = '#3498db';
    ctx.fillText('-', x - 8, y - 25);
}

/**
 * 绘制电阻（标准符号：锯齿形）
 */
function drawResistorEnhanced(component) {
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;

    const x = component.x;
    const y = component.y;

    // 绘制标准电阻符号（矩形锯齿形）
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 20, y);
    ctx.lineTo(x - 15, y - 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.lineTo(x - 5, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x + 5, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x + 15, y - 10);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 显示电阻值
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${component.getResistance()}Ω`, x, y + 20);
}

/**
 * 绘制开关（两种状态）
 */
function drawSwitchEnhanced(component) {
    const x = component.x;
    const y = component.y;
    const isOpen = component.isOpen();

    // 设置颜色（闭合为绿色，断开为红色）
    ctx.strokeStyle = isOpen ? '#e74c3c' : '#27ae60';
    ctx.lineWidth = 3;

    // 左侧固定部分
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 10, y);
    ctx.stroke();

    // 右侧固定部分
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 绘制开关触点
    ctx.fillStyle = isOpen ? '#e74c3c' : '#27ae60';
    ctx.beginPath();
    ctx.arc(x - 10, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 10, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // 绘制开关臂
    ctx.strokeStyle = isOpen ? '#e74c3c' : '#27ae60';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);

    if (isOpen) {
        // 断开状态：开关臂向上
        ctx.lineTo(x + 5, y - 15);
    } else {
        // 闭合状态：开关臂连接
        ctx.lineTo(x + 10, y);
    }
    ctx.stroke();

    // 显示状态
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(isOpen ? '断开' : '闭合', x, y - 18);
}

/**
 * 绘制电流表（圆形带A标识）
 */
function drawAmmeterEnhanced(component) {
    const x = component.x;
    const y = component.y;

    // 绘制圆形表盘
    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制字母A
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', x, y);

    // 绘制连接线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 18, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 18, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 模拟运行时显示读数
    if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`${component.getCurrent().toFixed(3)}A`, x, y + 30);
    }
}

/**
 * 绘制电压表（圆形带V标识）
 */
function drawVoltmeterEnhanced(component) {
    const x = component.x;
    const y = component.y;

    // 绘制圆形表盘（比电流表稍大）
    ctx.fillStyle = '#9c27b0';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制字母V
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', x, y);

    // 绘制连接线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 18, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 18, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // 模拟运行时显示读数
    if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`${component.getVoltage().toFixed(1)}V`, x, y + 30);
    }
}

/**
 * 绘制网格背景（更美观）
 */
function drawGridEnhanced() {
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 0.5;

    // 垂直线
    for (let x = 0; x <= canvas.width; x += DRAW_CONFIG.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= canvas.height; y += DRAW_CONFIG.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // 中心点标记
    ctx.fillStyle = '#eee';
    for (let x = 0; x <= canvas.width; x += DRAW_CONFIG.gridSize * 2) {
        for (let y = 0; y <= canvas.height; y += DRAW_CONFIG.gridSize * 2) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * 绘制连接导线（带箭头指示）
 */
function drawConnectionsEnhanced() {
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;

    for (const connection of globalThis.connections) {
        const fromComponent = globalThis.circuitComponents.find(c => c.id === connection.fromComponentId);
        const toComponent = globalThis.circuitComponents.find(c => c.id === connection.toComponentId);

        if (fromComponent && toComponent) {
            // 获取连接点坐标
            const fromPoints = fromComponent.getConnectionPoints();
            const toPoints = toComponent.getConnectionPoints();

            // 选择最近的两个点连接
            let bestFromPoint = fromPoints[0];
            let bestToPoint = toPoints[0];
            let minDistance = bestFromPoint.distanceTo(bestToPoint);

            for (const fp of fromPoints) {
                for (const tp of toPoints) {
                    const dist = fp.distanceTo(tp);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestFromPoint = fp;
                        bestToPoint = tp;
                    }
                }
            }

            // 绘制导线
            ctx.beginPath();
            ctx.moveTo(bestFromPoint.x, bestFromPoint.y);
            ctx.lineTo(bestToPoint.x, bestToPoint.y);
            ctx.stroke();

            // 添加电流方向箭头（模拟运行时）
            if (globalThis.circuitSimulator && globalThis.circuitSimulator.isSimulating) {
                drawCurrentArrow(bestFromPoint, bestToPoint);
            }
        }
    }
}

/**
 * 绘制电流方向箭头
 */
function drawCurrentArrow(fromPoint, toPoint) {
    const arrowLength = 8;
    const arrowAngle = Math.PI / 6;

    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const angle = Math.atan2(dy, dx);
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;

    // 计算箭头点
    const p1x = midX + arrowLength * Math.cos(angle - arrowAngle);
    const p1y = midY + arrowLength * Math.sin(angle - arrowAngle);
    const p2x = midX + arrowLength * Math.cos(angle + arrowAngle);
    const p2y = midY + arrowLength * Math.sin(angle + arrowAngle);

    // 绘制箭头
    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(midX, midY);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
}

/**
 * 重绘整个Canvas（主调度函数）
 */
function redrawCanvasEnhanced() {
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    drawGridEnhanced();

    // 绘制连线（先绘制，在元件下方）
    drawConnectionsEnhanced();

    // 绘制元件
    for (const component of globalThis.circuitComponents) {
        // 处理选中状态
        if (component === selectedComponent) {
            // 绘制选中高亮
            ctx.save();
            ctx.shadowColor = '#3498db';
            ctx.shadowBlur = 10;
        }

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
        }

        if (component === selectedComponent) {
            ctx.restore();
        }

        // 绘制元件ID
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`#${component.id}`, component.x, component.y - 35);
    }

    // 绘制元件连接点（调试用）
    if (selectedComponent) {
        drawConnectionPoints(selectedComponent);
    }
}

/**
 * 绘制元件连接点（用于调试）
 */
function drawConnectionPoints(component) {
    const points = component.getConnectionPoints();
    ctx.fillStyle = '#3498db';

    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// 导出函数到全局作用域
if (typeof window !== 'undefined') {
    window.drawBatteryEnhanced = drawBatteryEnhanced;
    window.drawResistorEnhanced = drawResistorEnhanced;
    window.drawSwitchEnhanced = drawSwitchEnhanced;
    window.drawAmmeterEnhanced = drawAmmeterEnhanced;
    window.drawVoltmeterEnhanced = drawVoltmeterEnhanced;
    window.redrawCanvasEnhanced = redrawCanvasEnhanced;
    window.drawGridEnhanced = drawGridEnhanced;
    window.drawConnectionsEnhanced = drawConnectionsEnhanced;
}

console.log('✅ ui-enhanced.js 完成加载，增强绘制函数已就绪');
