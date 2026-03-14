/******************************************************************************
 * @file        hardware.ts
 *
 * @brief       Hardware-level DAP operations (memory, registers, disassembly).
 *
 * @details
 * Implements specific APIs for complex C/C++ embedded debugging as per Phase 3.
 *
 * @project     AI Debug Proxy
 * @component   Debug Module
 *
 * @author      Antigravity
 * @date        2026-03-12
 *
 ******************************************************************************/

/******************************************************************************
 * Traceability
 *
 * Design Elements:
 * DD-1.4       Hardware Inspection
 *
 * Architecture Requirements:
 * ARCH-2       Debug Controller Pattern [Satisfies $SW SW-2]
 ******************************************************************************/

import * as vscode from "vscode";
import { logger } from "../utils/logging";
import { getCurrentTopFrameId } from "./events";
import { OperationError } from "../utils/errors";

const LOG = "Hardware";

/**
 * $DD DD-1.4.1
 *
 * @brief Get CPU registers from the current frame.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  frameId   Optional frame ID (uses top frame if missing).
 *
 * @return List of registers.
 *
 * @throws OperationError if the frame ID is missing or request fails.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function getRegisters(
    session: vscode.DebugSession,
    frameId?: number,
): Promise<any> {
    const fId = frameId ?? getCurrentTopFrameId(session.id);
    if (fId === undefined) {
        throw new OperationError("get_registers", "No frame ID available for registers");
    }

    try {
        const scopesRes = await session.customRequest("scopes", { frameId: fId });
        const regScope = scopesRes.scopes.find(
            (s: any) => s.name.toLowerCase().includes("register") || s.name.toLowerCase().includes("cpu")
        );
        if (!regScope) {
            throw new OperationError("get_registers", "Registers scope not found");
        }

        const varsRes = await session.customRequest("variables", {
            variablesReference: regScope.variablesReference,
        });
        return { success: true, registers: varsRes.variables };
    } catch (e: any) {
        if (e instanceof OperationError) throw e;
        logger.error(LOG, "get_registers.failed", { sessionId: session.id, error: e.message });
        throw new OperationError("get_registers", e.message, e);
    }
}

/**
 * $DD DD-1.4.2
 *
 * @brief Read memory from a specific memory reference.
 *
 * @param [in]  session           VS Code debug session.
 * @param [in]  memoryReference   Memory reference from a variable or evaluate.
 * @param [in]  offset            Byte offset.
 * @param [in]  count             Number of bytes to read.
 *
 * @return Memory contents (usually base64 encoded).
 *
 * @throws OperationError if the request fails.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function readMemory(
    session: vscode.DebugSession,
    memoryReference: string,
    offset: number = 0,
    count: number = 256,
): Promise<any> {
    try {
        const res = await session.customRequest("readMemory", { memoryReference, offset, count });
        return { success: true, ...res };
    } catch (e: any) {
        logger.error(LOG, "read_memory.failed", { memoryReference, error: e.message });
        throw new OperationError("read_memory", e.message, e);
    }
}

/** @brief Options for disassembly operation. */
export interface DisassembleOptions {
    memoryReference: string;
    offset?: number;
    instructionOffset?: number;
    instructionCount?: number;
    resolveSymbols?: boolean;
}

/**
 * $DD DD-1.4.3
 *
 * @brief Disassemble instructions from a memory reference.
 *
 * @param [in]  session   VS Code debug session.
 * @param [in]  options   Disassembly options (reference, offsets, counts).
 *
 * @return Disassembled instructions.
 *
 * @throws OperationError if the request fails.
 *
 * [Satisfies $ARCH ARCH-2]
 */
export async function disassemble(
    session: vscode.DebugSession,
    options: DisassembleOptions,
): Promise<any> {
    const {
        memoryReference,
        offset = 0,
        instructionOffset = 0,
        instructionCount = 50,
        resolveSymbols = true,
    } = options;

    try {
        const res = await session.customRequest("disassemble", {
            memoryReference,
            offset,
            instructionOffset,
            instructionCount,
            resolveSymbols,
        });
        return { success: true, ...res };
    } catch (e: any) {
        logger.error(LOG, "disassemble.failed", { memoryReference, error: e.message });
        throw new OperationError("disassemble", e.message, e);
    }
}

