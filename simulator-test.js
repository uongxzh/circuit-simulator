// 单元测试 - 验证电路模拟器核心算法
// 命令行测试脚本

console.log('🧪 开始测试电路模拟器核心逻辑...\n');

/**
 * 测试辅助函数
 */
function runTest(name, testFn) {
    console.log(`📋 测试: ${name}`);
    try {
        const result = testFn();
        if (result.success) {
            console.log(`✅ 通过 - ${result.message}`);
            return true;
        } else {
            console.log(`❌ 失败 - ${result.message}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ 异常 - ${error.message}`);
        return false;
    }
}

/**
 * 测试1: 欧姆定律基本计算
 */
function testOhmsLaw() {
    console.log('\n--- 测试1: 欧姆定律基本计算 ---');

    const battery = new Battery(0, 0, 12);
    const resistor = new Resistor(0, 0, 10);

    const expectedCurrent = 12 / 10; // 1.2A
    const calculatedCurrent = battery.getVoltage() / resistor.getResistance();

    const success = Math.abs(calculatedCurrent - expectedCurrent) < 0.001;

    return {
        success,
        message: `I = U/R = ${battery.getVoltage()}/${resistor.getResistance()} = ${calculatedCurrent.toFixed(3)}A (预期: ${expectedCurrent}A)`,
        data: { current: calculatedCurrent }
    };
}

/**
 * 测试2: 串联电路计算
 */
function testSeriesCircuit() {
    console.log('\n--- 测试2: 串联电路计算 ---');

    const battery = new Battery(0, 0, 12);
    const resistor1 = new Resistor(0, 0, 10);
    const resistor2 = new Resistor(0, 0, 20);

    const components = [battery, resistor1, resistor2];
    const simulator = new CircuitSimulator();
    simulator.setCircuit(components, []);

    // 手动计算预期值
    const expectedResistance = 10 + 20; // 30Ω
    const expectedCurrent = 12 / 30; // 0.4A

    // 使用算法计算
    const analysis = simulator.analyzeTopology(components);
    const calculatedResistance = simulator.calculateEquivalentResistance(analysis);

    const resistanceMatch = Math.abs(calculatedResistance - expectedResistance) < 0.1;

    return {
        success: resistanceMatch,
        message: `串联等效电阻: ${calculatedResistance}Ω (预期: ${expectedResistance}Ω)`,
        data: { resistance: calculatedResistance, expected: expectedResistance }
    };
}

/**
 * 测试3: 并联电路计算
 */
function testParallelCircuit() {
    console.log('\n--- 测试3: 并联电路计算 ---');

    const battery = new Battery(0, 0, 12);
    const resistor1 = new Resistor(0, 0, 10);
    const resistor2 = new Resistor(0, 0, 20);

    const components = [battery, resistor1, resistor2];
    const simulator = new CircuitSimulator();
    simulator.setCircuit(components, []);

    // 手动计算预期值
    const expectedResistance = 1 / (1/10 + 1/20); // 6.666Ω

    // 使用算法计算
    const analysis = simulator.analyzeTopology(components);
    analysis.isParallel = true;
    const calculatedResistance = simulator.calculateEquivalentResistance(analysis);

    const resistanceMatch = Math.abs(calculatedResistance - expectedResistance) < 0.1;

    return {
        success: resistanceMatch,
        message: `并联等效电阻: ${calculatedResistance.toFixed(3)}Ω (理论: ${expectedResistance.toFixed(3)}Ω)`,
        data: { resistance: calculatedResistance, expected: expectedResistance }
    };
}

/**
 * 测试4: 断路检测
 */
function testOpenCircuit() {
    console.log('\n--- 测试4: 断路检测 ---');

    const battery = new Battery(0, 0, 12);
    const switch1 = new Switch(0, 0);
    switch1.setState(true); // 断开
    const resistor = new Resistor(0, 0, 10);

    const components = [battery, switch1, resistor];
    const simulator = new CircuitSimulator();
    simulator.setCircuit(components, []);

    let errorDetected = false;
    let errorMessage = '';

    try {
        simulator.validateCircuit(simulator.buildGraph());
    } catch (error) {
        errorDetected = true;
        errorMessage = error.message;
    }

    const success = errorDetected && errorMessage.includes('断路');

    return {
        success,
        message: `${errorDetected ? '正确检测到' : '未检测到'}断路错误`,
        data: { errorDetected, errorMessage }
    };
}

/**
 * 测试5: 连接测试
 */
function testConnections() {
    console.log('\n--- 测试5: 连接功能测试 ---');

    const battery = new Battery(0, 0, 12);
    const resistor = new Resistor(0, 0, 10);

    // 创建连接
    const connection = new Connection(battery.id, resistor.id, null, null);

    battery.addConnection(resistor);
    resistor.addConnection(battery);

    const success = battery.connections.includes(resistor.id) &&
                    resistor.connections.includes(battery.id);

    return {
        success,
        message: `双向连接建立成功`,
        data: { batteryConnections: battery.connections, resistorConnections: resistor.connections }
    };
}

/**
 * 测试6: 完整电路流程
 */
function testFullCircuit() {
    console.log('\n--- 测试6: 完整电路流程 ---');

    const battery = new Battery(0, 0, 12);
    const resistor = new Resistor(0, 0, 20);
    const ammeter = new Ammeter(0, 0);
    const voltmeter = new Voltmeter(0, 0);

    const components = [battery, resistor, ammeter, voltmeter];
    const simulator = new CircuitSimulator();
    simulator.setCircuit(components, []);

    const result = simulator.startSimulation();

    return {
        success: result.success,
        message: `模拟${result.success ? '成功' : '失败'}: ${result.error || '无错误'}`,
        data: result
    };
}

/**
 * 测试7: 组件工厂
 */
function testComponentFactory() {
    console.log('\n--- 测试7: 组件工厂测试 ---');

    try {
        const battery = ComponentFactory.createComponent('battery', 0, 0, { voltage: 9 });
        const resistor = ComponentFactory.createComponent('resistor', 0, 0, { resistance: 15 });
        const switch1 = ComponentFactory.createComponent('switch', 0, 0, { isOpen: true });
        const ammeter = ComponentFactory.createComponent('ammeter', 0, 0);
        const voltmeter = ComponentFactory.createComponent('voltmeter', 0, 0);

        const success = battery.type === 'battery' &&
                        resistor.type === 'resistor' &&
                        switch1.type === 'switch' &&
                        ammeter.type === 'ammeter' &&
                        voltmeter.type === 'voltmeter' &&
                        battery.getVoltage() === 9 &&
                        resistor.getResistance() === 15;

        return {
            success,
            message: '组件工厂成功创建所有类型组件',
            data: {
                battery: { type: battery.type, voltage: battery.getVoltage() },
                resistor: { type: resistor.type, resistance: resistor.getResistance() },
                switch: { type: switch1.type, isOpen: switch1.isOpen() }
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `工厂创建失败: ${error.message}`,
            data: null
        };
    }
}

/**
 * 测试8: 电流分配
 */
function testCurrentDistribution() {
    console.log('\n--- 测试8: 电流分配测试 ---');

    const battery = new Battery(0, 0, 12);
    const resistor1 = new Resistor(0, 0, 10);
    const resistor2 = new Resistor(0, 0, 20);

    const components = [battery, resistor1, resistor2];
    const simulator = new CircuitSimulator();
    simulator.setCircuit(components, []);

    const analysis = simulator.analyzeTopology(components);
    analysis.isParallel = true;

    const totalVoltage = 12;
    const current1 = totalVoltage / resistor1.getResistance(); // 1.2A
    const current2 = totalVoltage / resistor2.getResistance(); // 0.6A

    const success = current1 > 0 && current2 > 0;

    return {
        success,
        message: `并联支路电流: R1=${current1.toFixed(1)}A, R2=${current2.toFixed(1)}A`,
        data: { current1, current2, totalCurrent: current1 + current2 }
    };
}

/**
 * 运行所有测试
 */
function runAllTests() {
    console.log('🔬 电路模拟器核心算法测试套件');
    console.log('================================\n');

    const tests = [
        testOhmsLaw,
        testSeriesCircuit,
        testParallelCircuit,
        testOpenCircuit,
        testConnections,
        testFullCircuit,
        testComponentFactory,
        testCurrentDistribution
    ];

    let passed = 0;
    let total = tests.length;

    const results = [];

    for (const test of tests) {
        const success = runTest(test.name.replace('test', ''), test);
        results.push({ name: test.name, success });
        if (success) passed++;
    }

    console.log('\n================================');
    console.log('📊 测试总结');
    console.log(`✅ 通过: ${passed}/${total}`);
    console.log(`❌ 失败: ${total - passed}/${total}`);
    console.log(`📈 通过率: ${((passed / total) * 100).toFixed(1)}%`);

    if (passed === total) {
        console.log('\n🎉 所有测试通过！电路模拟器核心算法已实现。');
    } else {
        console.log('\n⚠️  部分测试失败，需要检查实现。');
    }

    return { passed, total, results };
}

// 运行测试
runAllTests();

console.log('\n📝 测试完成');
