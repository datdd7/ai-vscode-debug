/**
 * @file extension.ts
 * @brief AI Debug Proxy Extension Entry Point
 * 
 * Activates extension with:
 * 1. HTTP Server (existing)
 * 2. Debug Adapter (new - v3.0 architecture)
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { HttpServer } from "../server/HttpServer";
import { logger, outputChannel, setLogLevel } from "../utils/logging";
import { AIDebugSession } from "../protocol/dap/DebugAdapter";
import { setLaunchDelegate } from "../server/router";

const LOG = "Extension";
let server: HttpServer | null = null;

/**
 * Activate extension
 */
export function activate(context: vscode.ExtensionContext) {
    logger.info(LOG, "AI Debug Proxy v3.0 activating...");

    // Read configuration
    const config = vscode.workspace.getConfiguration("aiDebugProxy");
    const port = config.get<number>("port", 9999);
    const autoStart = config.get<boolean>("autoStart", true);
    const logLevel = config.get<string>("logLevel", "info") as any;

    setLogLevel(logLevel);

    // Setup launch callback to trigger VS Code UI when API requests debugging
    setLaunchDelegate(async (params: any) => {
        logger.info(LOG, `Triggering VS Code debug UI for AI Proxy...`);
        let workspaceFolder = undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            workspaceFolder = vscode.workspace.workspaceFolders[0];
        }
        
        return await vscode.debug.startDebugging(workspaceFolder, {
            type: 'ai-debug',
            request: 'launch',
            name: `AI Debug Proxy: ${params.program || 'Unknown'}`,
            ...params
        });
    });

    // Start HTTP Server
    server = new HttpServer(port);
    server.start().then(() => {
        logger.info(LOG, `HTTP Server started on port ${port}`);
    }).catch((error) => {
        logger.error(LOG, `Failed to start HTTP Server: ${error.message}`);
    });

    // Register Debug Adapter Factory (NEW in v3.0)
    const debugAdapterFactory = vscode.debug.registerDebugAdapterDescriptorFactory(
        'ai-debug',
        {
            createDebugAdapterDescriptor: (session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> => {
                logger.info(LOG, `Creating DebugAdapter for session: ${session.id} (${session.name})`);
                const adapter = new AIDebugSession();
                logger.info(LOG, 'DebugAdapter instance created');
                return new vscode.DebugAdapterInlineImplementation(adapter);
            }
        }
    );
    context.subscriptions.push(debugAdapterFactory);
    logger.info(LOG, 'Debug Adapter Factory registered for "ai-debug" type');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand("ai-debug-proxy.start", async () => {
            if (server?.isRunning()) {
                vscode.window.showInformationMessage(
                    `AI Debug Proxy already running on port ${server.getPort()}`,
                );
                return;
            }
            try {
                const currentConfig = vscode.workspace.getConfiguration("aiDebugProxy");
                const currentPort = currentConfig.get<number>("port", 9999);
                if (!server || server.getPort() !== currentPort) {
                    // ADP-011: stop the old server before creating a new one to avoid port leak
                    if (server && server.isRunning()) {
                        await server.stop();
                    }
                    server = new HttpServer(currentPort);
                }
                await server.start();
                vscode.window.showInformationMessage(
                    `AI Debug Proxy started on port ${currentPort}`,
                );
            } catch (e: any) {
                vscode.window.showErrorMessage(
                    `Failed to start AI Debug Proxy: ${e.message}`,
                );
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("ai-debug-proxy.stop", async () => {
            if (!server?.isRunning()) {
                vscode.window.showInformationMessage("AI Debug Proxy is not running");
                return;
            }
            await server.stop();
            vscode.window.showInformationMessage("AI Debug Proxy stopped");
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("ai-debug-proxy.showLog", () => {
            outputChannel.show();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("ai-debug-proxy.installCLI", async () => {
            const src = path.join(context.extensionPath, "resources", "ai-debug.sh");
            const installDir = path.join(os.homedir(), ".local", "lib", "ai-debug-proxy");
            const dest = path.join(installDir, "ai-debug.sh");

            try {
                await fs.promises.mkdir(installDir, { recursive: true });
                await fs.promises.copyFile(src, dest);
                await fs.promises.chmod(dest, 0o755);

                const shellConfig = vscode.workspace.getConfiguration("terminal.integrated.env");
                const platform = os.platform();
                const shellEnv = platform === "win32" ? "windows" : platform === "darwin" ? "osx" : "linux";

                const currentPath = process.env.PATH || "";
                if (!currentPath.includes(installDir)) {
                    const msg = `AI Debug Proxy CLI installed to ${dest}. Add ${installDir} to your PATH to use the 'ai-debug' command.`;
                    vscode.window.showInformationMessage(msg);
                } else {
                    vscode.window.showInformationMessage(`AI Debug Proxy CLI installed to ${dest}. You can now use the 'ai-debug' command.`);
                }
            } catch (e: any) {
                vscode.window.showErrorMessage(`Failed to install CLI: ${e.message}`);
            }
        }),
    );

    logger.info(LOG, "AI Debug Proxy v3.0 activated successfully");
}

/**
 * Deactivate extension
 */
export async function deactivate() {
    logger.info(LOG, "Deactivating AI Debug Proxy...");

    if (server) {
        await server.stop();
        server = null;
        logger.info(LOG, "HTTP Server stopped");
    }

    logger.info(LOG, "AI Debug Proxy deactivated");
}
