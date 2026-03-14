/**
 * [Satisfies $DD-01]
 * [Satisfies $SW-1]
 * [Satisfies $ARCH-1]
 * [Satisfies $ARCH-3]
 *
 * Unit tests for HttpServer.ts
 * Coverage: $DD-SW-1 (Core Proxy & Session Management)
 */

import * as http from "http";
import { HttpServer } from "../../src/server/HttpServer";
import * as router from "../../src/server/router";

jest.mock("../../src/utils/logging", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../src/server/router", () => ({
  handleRequest: jest.fn(),
}));

describe("HttpServer [Satisfies $DD-01]", () => {
  let server: HttpServer;
  const testPort = 19998;

  beforeEach(() => {
    server = new HttpServer(testPort);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Constructor [Satisfies $DD-01.1]", () => {
    it("creates server with default port 9999", () => {
      const defaultServer = new HttpServer();
      expect(defaultServer.getPort()).toBe(9999);
    });

    it("creates server with custom port", () => {
      expect(server.getPort()).toBe(testPort);
    });

    it("server is not running initially", () => {
      expect(server.isRunning()).toBe(false);
    });
  });

  describe("start() [Satisfies $DD-01.2]", () => {
    it("starts server successfully", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it("logs server start message", async () => {
      const { logger } = require("../../src/utils/logging");
      await server.start();
      expect(logger.info).toHaveBeenCalledWith(
        "HttpServer",
        expect.stringContaining("Server listening on http://127.0.0.1:"),
      );
    });

    it("returns early if server already running", async () => {
      const { logger } = require("../../src/utils/logging");
      await server.start();
      await server.start();
      expect(logger.warn).toHaveBeenCalledWith(
        "HttpServer",
        "Server already running",
      );
    });

    it("rejects if port is already in use", async () => {
      const server1 = new HttpServer(testPort);
      await server1.start();

      const server2 = new HttpServer(testPort);
      await expect(server2.start()).rejects.toThrow(`Port ${testPort} in use`);

      await server1.stop();
    });
  });

  describe("stop() [Satisfies $DD-01.3]", () => {
    it("stops running server", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("does nothing if server not running", async () => {
      const { logger } = require("../../src/utils/logging");
      await server.stop();
      expect(logger.info).not.toHaveBeenCalledWith(
        "HttpServer",
        "Server stopped",
      );
    });

    it("logs server stop message", async () => {
      const { logger } = require("../../src/utils/logging");
      await server.start();
      await server.stop();
      expect(logger.info).toHaveBeenCalledWith("HttpServer", "Server stopped");
    });
  });

  describe("isRunning() [Satisfies $DD-01.4]", () => {
    it("returns true after start", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it("returns false after stop", async () => {
      await server.start();
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("returns false initially", () => {
      expect(server.isRunning()).toBe(false);
    });
  });

  describe("getPort() / setPort() [Satisfies $DD-01.5]", () => {
    it("returns current port", () => {
      expect(server.getPort()).toBe(testPort);
    });

    it("sets new port", () => {
      server.setPort(8080);
      expect(server.getPort()).toBe(8080);
    });
  });

  describe("CORS Handling [Satisfies $ARCH-3]", () => {
    it("sets CORS headers on all responses", async () => {
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
    });

    it("handles OPTIONS preflight request", async () => {
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "OPTIONS",
        url: "/api/test",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe("Request Routing [Satisfies $ARCH-3]", () => {
    it("routes GET request and returns response", async () => {
      (router.handleRequest as jest.Mock).mockResolvedValue({
        statusCode: 200,
        body: { success: true, data: { message: "ok" } },
      });

      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(router.handleRequest).toHaveBeenCalledWith(
        "GET",
        "/api/ping",
        undefined,
        expect.any(Object),
      );
      expect(mockRes.writeHead).toHaveBeenCalledWith(200);
    });

    it("handles custom status codes from router", async () => {
      (router.handleRequest as jest.Mock).mockResolvedValue({
        statusCode: 404,
        body: { success: false, error: "Not found" },
      });

      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/unknown",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(404);
    });

    it("handles router errors with 500 response", async () => {
      (router.handleRequest as jest.Mock).mockRejectedValue(
        new Error("Router error"),
      );

      const { logger } = require("../../src/utils/logging");
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(logger.error).toHaveBeenCalledWith(
        "HttpServer",
        expect.stringMatching(/GET \/api\/ping → 500/),
      );
      expect(mockRes.writeHead).toHaveBeenCalledWith(500);
    });
  });

  describe("Real HTTP Integration [Satisfies $ARCH-1]", () => {
    it("accepts real HTTP requests", async () => {
      const realServer = new HttpServer(19997);
      await realServer.start();

      try {
        (router.handleRequest as jest.Mock).mockImplementation(
          (method: string, url: string) => {
            return Promise.resolve({
              statusCode: 200,
              body: { success: true, data: { method, url } },
            });
          },
        );

        const response = await fetch("http://127.0.0.1:19997/api/ping");
        const parsed = (await response.json()) as any;
        expect(parsed.success).toBe(true);
      } finally {
        await realServer.stop();
      }
    });
  });
});
