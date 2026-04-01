import * as assert from 'assert';
import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';

suite('E2E Collaborative Debugging Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    const port = process.env.AI_DEBUG_PROXY_PORT || '9999';
    const PROXY_URL = `http://localhost:${port}/api/debug`;

    test('UC7: Jump to line should remain PAUSED at target', async () => {
        // 1. Ensure extension is activated
        const ext = vscode.extensions.getExtension('datdang.ai-debug-proxy');
        assert.ok(ext, 'Extension not found');
        await ext.activate();

        // 2. Ensure workspace is open
        let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.log('No workspace folder found, attempting to open default playground...');
            const workspacePath = path.resolve(__dirname, '../../../../playground');
            const uri = vscode.Uri.file(workspacePath);
            await vscode.commands.executeCommand('vscode.openFolder', uri);
            // Wait for reload
            await new Promise(resolve => setTimeout(resolve, 5000));
            workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        }
        assert.ok(workspaceFolder, 'No workspace folder open after attempt');

        const debugConfig = {
            type: 'ai-debug',
            name: 'E2E Test Launch',
            request: 'launch',
            program: path.join(workspaceFolder.uri.fsPath, 'build/cooling_ecu'),
            cwd: workspaceFolder.uri.fsPath,
            stopOnEntry: true,
            gdbPath: 'gdb',
            backendType: 'gdb'
        };

        const started = await vscode.debug.startDebugging(workspaceFolder, debugConfig);
        assert.ok(started, 'Failed to start debugging');

        // Wait for session to be fully ready and stopped at entry
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. Verify initial state via Proxy API
        let status = await axios.get(`${PROXY_URL}/status`);
        // V3 API wraps data in a 'data' field
        let statusData = status.data.data || status.data;
        assert.strictEqual(statusData.isRunning, false, 'Debugger should be stopped at entry');

        // 4. PERFORM JUMP: Jump from main entry to a known line (e.g. line 50 in main.c)
        // Note: main.c:50 is inside the main loop
        let jumpResponse;
        try {
            jumpResponse = await axios.post(`${PROXY_URL}/execute_operation`, {
                operation: 'jump',
                params: {
                    file: 'main.c',
                    line: 50
                }
            });
        } catch (err: any) {
            if (err.response) {
                console.error('Jump operation failed with response:', JSON.stringify(err.response.data, null, 2));
            }
            throw err;
        }
        
        const jumpResultData = jumpResponse.data.data || jumpResponse.data;
        assert.ok(jumpResultData.success || jumpResponse.data.success, 'Jump operation failed');

        // 5. CRITICAL ASSERTION: The debugger must NOT resume automatically
        // Wait a bit to see if it "runs away"
        await new Promise(resolve => setTimeout(resolve, 1000));

        status = await axios.get(`${PROXY_URL}/status`);
        
        // In V3, the response is { success: true, data: { isRunning: ... } }
        const isRunning = status.data.data?.isRunning ?? status.data.isRunning;
        assert.strictEqual(isRunning, false, 'BUG DETECTED: Debugger resumed automatically after jump!');
        
        // 6. Verify we are indeed at line 50
        // Use the V3 operation pattern
        const stackResponse = await axios.post(`${PROXY_URL}/execute_operation`, {
            operation: 'stack_trace'
        });
        const frames = stackResponse.data.data; // V3 format
        const topFrame = frames[0];
        assert.strictEqual(topFrame.line, 50, `Expected line 50, but got ${topFrame.line}`);

        // Cleanup
        await vscode.debug.stopDebugging();
    });

    test('UC8: Async Interrupt while running loop', async () => {
        // Assume extension and workspace are already set up by previous test or default
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'No workspace folder open');

        const debugConfig = {
            type: 'ai-debug',
            name: 'UC8 Test Launch',
            request: 'launch',
            program: path.join(workspaceFolder.uri.fsPath, 'build/cooling_ecu'),
            cwd: workspaceFolder.uri.fsPath,
            stopOnEntry: true,
            gdbPath: 'gdb',
            backendType: 'gdb'
        };

        await vscode.debug.startDebugging(workspaceFolder, debugConfig);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 1. Initial status: Stopped at entry
        let status = await axios.get(`${PROXY_URL}/status`);
        assert.strictEqual(status.data.data?.isRunning, false);

        // 2. CONTINUE: Let it run into the main loop
        await axios.post(`${PROXY_URL}/execute_operation`, { operation: 'continue' });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Let it run for 1s

        // 3. VERIFY RUNNING
        status = await axios.get(`${PROXY_URL}/status`);
        assert.strictEqual(status.data.data?.isRunning, true, 'Debugger should be running');

        // 4. ASYNC PAUSE
        console.log('Sending ASYNC PAUSE...');
        const pauseResponse = await axios.post(`${PROXY_URL}/execute_operation`, { operation: 'pause' });
        assert.ok(pauseResponse.data.success);

        // Wait for stop event processing
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. VERIFY STOPPED
        status = await axios.get(`${PROXY_URL}/status`);
        assert.strictEqual(status.data.data?.isRunning, false, 'Debugger should be PAUSED after pause operation');
        assert.strictEqual(status.data.data?.lastStopInfo?.reason, 'pause', 'Stop reason should be pause');

        await vscode.debug.stopDebugging();
    });

    test('UC9: Variable Mutation', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'No workspace folder open');

        const debugConfig = {
            type: 'ai-debug',
            name: 'UC9 Test Launch',
            request: 'launch',
            program: path.join(workspaceFolder.uri.fsPath, 'build/cooling_ecu'),
            cwd: workspaceFolder.uri.fsPath,
            stopOnEntry: true,
            gdbPath: 'gdb',
            backendType: 'gdb'
        };

        await vscode.debug.startDebugging(workspaceFolder, debugConfig);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 1. We are at main.c:33 (iteration initialization)
        // Let's step once to finish initialization
        await axios.post(`${PROXY_URL}/execute_operation`, { operation: 'step_over' });
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2. Mutation: Change 'iteration' to 99
        // GDB: iteration = 99
        console.log('Mutating variable iteration to 99...');
        const mutateResult = await axios.post(`${PROXY_URL}/execute_operation`, {
            operation: 'evaluate',
            params: {
                expression: 'iteration = 99'
            }
        });
        assert.ok(mutateResult.data.success);
        assert.strictEqual(mutateResult.data.data.value, '99');

        // 3. Step again and verify
        await axios.post(`${PROXY_URL}/execute_operation`, { operation: 'step_over' });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check value via get_variables or evaluate
        const checkResult = await axios.post(`${PROXY_URL}/execute_operation`, {
            operation: 'evaluate',
            params: {
                expression: 'iteration'
            }
        });
        assert.strictEqual(checkResult.data.data.value, '99', 'Variable mutation failed or not persisted');

        await vscode.debug.stopDebugging();
    });
});
