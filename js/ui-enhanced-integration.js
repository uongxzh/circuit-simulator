// 电路模拟器 - UI增强集成
// 在原始ui.js基础上集成增强绘制功能

console.log('✅ UI增强集成已加载');

/**
 * 动态加载JavaScript文件
 */
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

/**
 * 替换原始绘制函数
 */
function overrideDrawingFunctions() {
    console.log('🔧 开始替换绘制函数');

    // 检查增强函数是否存在
    if (typeof window.drawBatteryEnhanced !== 'function') {
        console.error('❌ 增强绘制函数未加载，请确保ui-enhanced.js已加载');
        return false;
    }

    // 保存原始函数（以便回退）
    window.originalDrawBattery = window.drawBattery;
    window.originalDrawResistor = window.drawResistor;
    window.originalDrawSwitch = window.drawSwitch;
    window.originalDrawAmmeter = window.drawAmmeter;
    window.originalDrawVoltmeter = window.drawVoltmeter;
    window.originalRedrawCanvas = window.redrawCanvas;
    window.originalDrawGrid = window.drawGrid;
    window.originalDrawConnections = window.drawConnections;

    // 替换为增强版本
    window.drawBattery = window.drawBatteryEnhanced;
    window.drawResistor = window.drawResistorEnhanced;
    window.drawSwitch = window.drawSwitchEnhanced;
    window.drawAmmeter = window.drawAmmeterEnhanced;
    window.drawVoltmeter = window.drawVoltmeterEnhanced;
    window.redrawCanvas = window.redrawCanvasEnhanced;
    window.drawGrid = window.drawGridEnhanced;
    window.drawConnections = window.drawConnectionsEnhanced;

    console.log('✅ 绘制函数替换成功！');
    return true;
}

/**
 * 初始化UI增强
 */
function initializeUIEnhancement() {
    // 动态加载ui-enhanced.js
    loadScript('js/ui-enhanced.js', function() {
        console.log('✅ ui-enhanced.js 加载成功');

        // 延时一点时间确保所有函数定义完成
        setTimeout(function() {
            const success = overrideDrawingFunctions();

            if (success) {
                console.log('🎨 绘制功能增强完成！');

                // 立即重绘看效果
                if (window.redrawCanvas) {
                    redrawCanvas();
                }
            } else {
                console.error('❌ 增强失败，将使用原始绘制');
            }
        }, 100);
    });
}

// DOM加载完成后启动增强
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeUIEnhancement, 500);
    });
} else {
    setTimeout(initializeUIEnhancement, 500);
}

console.log('UI增强集成（ui-integration.js）加载完成');
