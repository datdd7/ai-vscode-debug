/**
 * [Satisfies $SW-07]
 * [Satisfies $ARCH-06]
 *
 * Tests for LspService
 * Coverage: $DD-SW-7 (LSP Code Intelligence interface)
 */

import { LspService, lspService } from "../../src/lsp/LspService";
import * as vscode from "vscode";

jest.mock("vscode", () => ({
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
  Position: jest.fn((line: number, char: number) => ({ line, character: char })),
  commands: {
    executeCommand: jest.fn(),
  },
}));

jest.mock("../../src/utils/logging", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("LspService [Satisfies $SW-07]", () => {
  let lsp: LspService;

  beforeEach(() => {
    lsp = new LspService();
    jest.clearAllMocks();
  });

  describe("getDocumentSymbols() [Satisfies $SW-07.1]", () => {
    it("retrieves document symbols successfully", async () => {
      const mockSymbols = [
        {
          name: "testFunction",
          kind: vscode.SymbolKind.Function,
          range: new vscode.Range(0, 0, 0, 20),
          selectionRange: new vscode.Range(0, 0, 0, 20),
          children: [],
        },
      ] as unknown as vscode.DocumentSymbol[];

      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockSymbols);

      const result = await lsp.getDocumentSymbols("/test/file.ts");

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.executeDocumentSymbolProvider",
        { fsPath: "/test/file.ts" },
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("testFunction");
    });

    it("returns empty array when no symbols found", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

      const result = await lsp.getDocumentSymbols("/test/empty.ts");

      expect(result).toEqual([]);
    });

    it("throws error when command fails", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("LSP not available"),
      );

      await expect(lsp.getDocumentSymbols("/test/file.ts")).rejects.toThrow(
        "LSP not available",
      );
    });
  });

  describe("getReferences() [Satisfies $SW-07.2]", () => {
    it("retrieves references successfully", async () => {
      const mockLocations: vscode.Location[] = [
        {
          uri: vscode.Uri.file("/test/file.ts"),
          range: new vscode.Range(5, 0, 5, 10),
        },
      ];

      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(
        mockLocations,
      );

      const result = await lsp.getReferences("/test/file.ts", 10, 5);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.executeReferenceProvider",
        { fsPath: "/test/file.ts" },
        { line: 10, character: 5 },
      );
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no references found", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

      const result = await lsp.getReferences("/test/file.ts", 0, 0);

      expect(result).toEqual([]);
    });

    it("throws error when command fails", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("Reference provider error"),
      );

      await expect(lsp.getReferences("/test/file.ts", 0, 0)).rejects.toThrow(
        "Reference provider error",
      );
    });
  });

  describe("getCallHierarchyIncoming() [Satisfies $SW-07.3]", () => {
    it("retrieves incoming calls successfully", async () => {
      const mockItems: vscode.CallHierarchyItem[] = [
        {
          name: "testFunc",
          kind: vscode.SymbolKind.Function,
          uri: vscode.Uri.file("/test/caller.ts"),
          range: new vscode.Range(5, 0, 5, 10),
          selectionRange: new vscode.Range(5, 0, 5, 10),
        },
      ];

      const mockIncomingCalls: vscode.CallHierarchyIncomingCall[] = [
        {
          from: mockItems[0],
          fromRanges: [new vscode.Range(5, 0, 5, 10)],
        },
      ];

      (vscode.commands.executeCommand as jest.Mock)
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce(mockIncomingCalls);

      const result = await lsp.getCallHierarchyIncoming("/test/file.ts", 10, 5);

      expect(result).toHaveLength(1);
      expect(result[0].from.name).toBe("testFunc");
    });

    it("returns empty array when no items prepared", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValueOnce([]);

      const result = await lsp.getCallHierarchyIncoming("/test/file.ts", 0, 0);

      expect(result).toEqual([]);
    });

    it("throws error when command fails", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("Call hierarchy error"),
      );

      await expect(
        lsp.getCallHierarchyIncoming("/test/file.ts", 0, 0),
      ).rejects.toThrow("Call hierarchy error");
    });
  });

  describe("getCallHierarchyOutgoing() [Satisfies $SW-07.4]", () => {
    it("retrieves outgoing calls successfully", async () => {
      const mockItems: vscode.CallHierarchyItem[] = [
        {
          name: "testFunc",
          kind: vscode.SymbolKind.Function,
          uri: vscode.Uri.file("/test/file.ts"),
          range: new vscode.Range(10, 0, 10, 10),
          selectionRange: new vscode.Range(10, 0, 10, 10),
        },
      ];

      const mockOutgoingCalls: vscode.CallHierarchyOutgoingCall[] = [
        {
          to: {
            name: "calledFunc",
            kind: vscode.SymbolKind.Function,
            uri: vscode.Uri.file("/test/target.ts"),
            range: new vscode.Range(0, 0, 0, 10),
            selectionRange: new vscode.Range(0, 0, 0, 10),
          },
          fromRanges: [new vscode.Range(10, 5, 10, 15)],
        },
      ];

      (vscode.commands.executeCommand as jest.Mock)
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce(mockOutgoingCalls);

      const result = await lsp.getCallHierarchyOutgoing("/test/file.ts", 10, 5);

      expect(result).toHaveLength(1);
      expect(result[0].to.name).toBe("calledFunc");
    });

    it("returns empty array when no items prepared", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValueOnce([]);

      const result = await lsp.getCallHierarchyOutgoing("/test/file.ts", 0, 0);

      expect(result).toEqual([]);
    });

    it("throws error when command fails", async () => {
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error("Outgoing calls error"),
      );

      await expect(
        lsp.getCallHierarchyOutgoing("/test/file.ts", 0, 0),
      ).rejects.toThrow("Outgoing calls error");
    });
  });

  describe("lspService singleton", () => {
    it("provides a singleton instance", () => {
      expect(lspService).toBeInstanceOf(LspService);
    });
  });
});
