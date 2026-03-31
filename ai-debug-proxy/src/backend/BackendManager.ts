/**
 * @file BackendManager.ts
 * @brief Backend Factory and Manager
 * 
 * Creates and manages debug backend instances.
 * Implements factory pattern for backend creation.
 */

import { IDebugBackend } from '../core/IDebugBackend';
import { BackendConfig } from '../core/IDebugBackend';
import { GDBBackend } from './GDBBackend';

/**
 * Backend Manager
 * 
 * Factory for creating debug backends.
 * Manages backend lifecycle.
 */
export class BackendManager {
    private static instance: BackendManager;
    private currentBackend?: IDebugBackend;
    private backendInstances = new Map<string, IDebugBackend>();

    /**
     * Get singleton instance
     */
    static getInstance(): BackendManager {
        if (!this.instance) {
            console.log('[BackendManager] Creating NEW singleton instance');
            this.instance = new BackendManager();
        } else {
            // console.log('[BackendManager] Accessing existing singleton instance');
        }
        return this.instance;
    }

    /**
     * Create backend based on type
     * @param type Backend type (gdb, lauterbach, etc.)
     * @param config Backend configuration
     */
    createBackend(type: string, config: BackendConfig): IDebugBackend {
        console.log('[BackendManager] Creating backend:', type, 'Current instances:', this.backendInstances.size);

        // Check if we already have an instance
        const existing = this.backendInstances.get(type);
        if (existing) {
            console.log('[BackendManager] Reusing existing backend instance');
            this.currentBackend = existing;
            return existing;
        }

        // Create new backend
        let backend: IDebugBackend;

        switch (type.toLowerCase()) {
            case 'gdb':
                backend = new GDBBackend();
                break;

            case 'lauterbach':
                throw new Error('Lauterbach backend not yet implemented');

            default:
                throw new Error(`Unknown backend type: ${type}`);
        }

        // Store instance
        this.backendInstances.set(type, backend);
        this.currentBackend = backend;

        console.log('[BackendManager] Backend created successfully and set as current');
        return backend;
    }

    /**
     * Get current backend
     */
    getCurrentBackend(): IDebugBackend | undefined {
        if (!this.currentBackend) {
            console.log('[BackendManager] getCurrentBackend: No backend set! Current instances:', this.backendInstances.size);
        } else {
            // console.log('[BackendManager] getCurrentBackend: Returning active backend');
        }
        return this.currentBackend;
    }

    /**
     * Set active backend (used for testing)
     */
    setActiveBackend(backend: IDebugBackend): void {
        this.currentBackend = backend;
        this.backendInstances.set('mock', backend);
    }

    /**
     * Get or create backend
     */
    async getOrCreateBackend(type: string, config: BackendConfig): Promise<IDebugBackend> {
        let backend = this.currentBackend;

        if (!backend) {
            console.log('[BackendManager] getOrCreateBackend: No current backend, creating...');
            backend = this.createBackend(type, config);
            await backend.initialize(config);
        }

        return backend;
    }

    /**
     * Release current backend
     */
    async releaseBackend(): Promise<void> {
        if (this.currentBackend) {
            console.log('[BackendManager] Releasing current backend');
            // Remove from cache so next createBackend() makes a fresh instance
            for (const [type, backend] of this.backendInstances.entries()) {
                if (backend === this.currentBackend) {
                    this.backendInstances.delete(type);
                    break;
                }
            }
            await this.currentBackend.terminate();
            this.currentBackend = undefined;
        }
    }

    /**
     * Release all backends
     */
    async releaseAllBackends(): Promise<void> {
        console.log('[BackendManager] Releasing all backends');

        const backends = Array.from(this.backendInstances.entries());
        for (const [type, backend] of backends) {
            try {
                await backend.terminate();
                console.log('[BackendManager] Released backend:', type);
            } catch (error) {
                console.error('[BackendManager] Error releasing backend:', type, error);
            }
        }

        this.backendInstances.clear();
        this.currentBackend = undefined;
    }

    /**
     * Execute operation on current backend
     */
    async executeOperation<T>(operation: string, params?: any): Promise<T> {
        if (!this.currentBackend) {
            console.log('[BackendManager] executeOperation FAILED: No backend');
            throw new Error('No backend initialized. Call getOrCreateBackend first.');
        }

        const method = (this.currentBackend as any)[operation];
        if (!method) {
            throw new Error(`Unknown operation: ${operation}`);
        }

        console.log('[BackendManager] Executing operation:', operation);
        return await method.call(this.currentBackend, params);
    }
}

// Export singleton instance
export const backendManager = BackendManager.getInstance();
