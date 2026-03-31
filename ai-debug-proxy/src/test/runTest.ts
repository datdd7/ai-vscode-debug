import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runTests } from '@vscode/test-electron';

// Port used exclusively for E2E tests (avoids conflict with production extension on 9999)
const E2E_PORT = 9997;

async function main() {
    // Create isolated user-data-dir with settings overriding proxy port
    const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-'));
    const userSettingsDir = path.join(tmpUserData, 'User');
    fs.mkdirSync(userSettingsDir, { recursive: true });
    fs.writeFileSync(
        path.join(userSettingsDir, 'settings.json'),
        JSON.stringify({ 'aiDebugProxy.port': E2E_PORT, 'aiDebugProxy.autoStart': true }, null, 2)
    );

    try {
        console.log('--- E2E TEST RUNNER START ---');
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        const workspacePath = path.resolve(__dirname, '../../../playground');

        console.log(`Extension Path: ${extensionDevelopmentPath}`);
        console.log(`Tests Path: ${extensionTestsPath}`);
        console.log(`Workspace Path: ${workspacePath}`);
        console.log(`E2E Port: ${E2E_PORT} (isolated from production on 9999)`);

        const grepIdx = process.argv.indexOf('--grep');
        const grep = grepIdx !== -1 ? process.argv[grepIdx + 1] : undefined;

        // Use pre-downloaded VS Code if available, otherwise let @vscode/test-electron download it
        const localVsCode = path.resolve(__dirname, '../../.vscode-test/VSCode-linux-x64/code');
        const vscodeExecutablePath = fs.existsSync(localVsCode) ? localVsCode : undefined;
        if (vscodeExecutablePath) {
            console.log(`Using pre-downloaded VS Code: ${vscodeExecutablePath}`);
        }

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            vscodeExecutablePath,
            launchArgs: [
                '--disable-extensions',
                `--user-data-dir=${tmpUserData}`,
                workspacePath
            ],
            extensionTestsEnv: {
                MOCHA_GREP: grep,
                AI_DEBUG_PROXY_PORT: String(E2E_PORT)
            }
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    } finally {
        fs.rmSync(tmpUserData, { recursive: true, force: true });
    }
}

main();
