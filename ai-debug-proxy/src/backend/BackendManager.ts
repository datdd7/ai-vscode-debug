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
import { logger } from '../utils/logging';

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
            logger.debug('BackendManager', 'Creating NEW singleton instance');
            this.instance = new BackendManager();
        }
        return this.instance;
    }

    /**
     * Create backend based on type
     * @param type Backend type (gdb, lauterbach, etc.)
     * @param config Backend configuration
     */
    createBackend(type: string, config: BackendConfig): IDebugBackend {
        logger.debug('BackendManager', 'Creating backend', { type, instances: this.backendInstances.size });

        // Check if we already have an instance
        const existing = this.backendInstances.get(type);
        if (existing) {
            logger.debug('BackendManager', 'Reusing existing backend instance');
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

        logger.debug('BackendManager', 'Backend created successfully and set as current');
        return backend;
    }

    /**
     * Get current backend
     */
    getCurrentBackend(): IDebugBackend | undefined {
        if (!this.currentBackend) {
            logger.warn('BackendManager', 'getCurrentBackend: No backend set', { instances: this.backendInstances.size });
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
            logger.debug('BackendManager', 'getOrCreateBackend: No current backend, creating...');
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
            logger.debug('BackendManager', 'Releasing current backend');
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
        logger.debug('BackendManager', 'Releasing all backends');

        const backends = Array.from(this.backendInstances.entries());
        for (const [type, backend] of backends) {
            try {
                await backend.terminate();
                logger.debug('BackendManager', 'Released backend', { type });
            } catch (error) {
                logger.error('BackendManager', 'Error releasing backend', { type, error });
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
            logger.warn('BackendManager', 'executeOperation FAILED: No backend');
            throw new Error('No backend initialized. Call getOrCreateBackend first.');
        }

        const method = (this.currentBackend as any)[operation];
        if (!method) {
            throw new Error(`Unknown operation: ${operation}`);
        }

        logger.debug('BackendManager', 'Executing operation', { operation });
        return await method.call(this.currentBackend, params);
    }
}

// Export singleton instance
export const backendManager = BackendManager.getInstance();
