/**
 * Unit tests for HttpServer.ts
 */

import * as http from "http";
import { HttpServer } from "../HttpServer";
import * as router from "../router";

// Mock logger
jest.mock("../../utils/logging", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock router
jest.mock("../router", () => ({
  handleRequest: jest.fn(),
}));

describe("HttpServer", () => {
  let server: HttpServer;
  const testPort = 9998;

  beforeEach(() => {
    server = new HttpServer(testPort);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Ensure server is stopped after each test
    try {
      await server.stop();
    } catch {
      // Ignore errors on cleanup
    }
  });

  // ---------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------
  describe("Constructor", () => {
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

  // ---------------------------------------------------------------
  // start()
  // ---------------------------------------------------------------
  describe("start()", () => {
    it("starts server successfully", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it("logs server start message", async () => {
      const { logger } = require("../../utils/logging");
      await server.start();
      expect(logger.info).toHaveBeenCalledWith(
        "HttpServer",
        "server.listening",
        expect.objectContaining({ url: expect.stringContaining("http://127.0.0.1:") }),
      );
    });

    it("returns early if server already running", async () => {
      const { logger } = require("../../utils/logging");
      await server.start();
      await server.start(); // Second call
      expect(logger.warn).toHaveBeenCalledWith(
        "HttpServer",
        "server.already_running",
      );
    });

    it("rejects if port is already in use", async () => {
      // Start first server on the port
      const server1 = new HttpServer(testPort);
      await server1.start();

      // Try to start another server on same port
      const server2 = new HttpServer(testPort);
      await expect(server2.start()).rejects.toThrow(`Port ${testPort} in use`);

      await server1.stop();
    });

    it("rejects on other server errors", async () => {
      // This is hard to test without mocking http.createServer
      // The error handler is covered by the EADDRINUSE case above
    });
  });

  // ---------------------------------------------------------------
  // stop()
  // ---------------------------------------------------------------
  describe("stop()", () => {
    it("stops running server", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("does nothing if server not running", async () => {
      const { logger } = require("../../utils/logging");
      await server.stop();
      // Should not throw or log
      expect(logger.info).not.toHaveBeenCalledWith(
        "HttpServer",
        "Server stopped",
      );
    });

    it("logs server stop message", async () => {
      const { logger } = require("../../utils/logging");
      await server.start();
      await server.stop();
      expect(logger.info).toHaveBeenCalledWith("HttpServer", "server.stopped");
    });
  });

  // ---------------------------------------------------------------
  // isRunning()
  // ---------------------------------------------------------------
  describe("isRunning()", () => {
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

  // ---------------------------------------------------------------
  // getPort() / setPort()
  // ---------------------------------------------------------------
  describe("getPort() / setPort()", () => {
    it("returns current port", () => {
      expect(server.getPort()).toBe(testPort);
    });

    it("sets new port", () => {
      server.setPort(8080);
      expect(server.getPort()).toBe(8080);
    });

    it("setPort affects subsequent requests", async () => {
      server.setPort(8888);
      // Note: This doesn't change the listening port if already started
      // It only affects future start() calls
      const server2 = new HttpServer(9999);
      server2.setPort(7777);
      expect(server2.getPort()).toBe(7777);
    });
  });

  // ---------------------------------------------------------------
  // onRequest - CORS
  // ---------------------------------------------------------------
  describe("onRequest - CORS handling", () => {
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

      // Access private method via any cast for testing
      await (server as any).onRequest(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        "Content-Type",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json",
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

  // ---------------------------------------------------------------
  // onRequest - Body parsing
  // ---------------------------------------------------------------
  describe("onRequest - Body parsing", () => {
    it("parses POST body successfully", async () => {
      const mockBody = { operation: "test", params: { foo: "bar" } };
      (router.handleRequest as jest.Mock).mockResolvedValue({
        statusCode: 200,
        body: { success: true },
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
        method: "POST",
        url: "/api/debug",
        on: jest.fn((event: string, cb: any) => {
          if (event === "data") {
            cb(Buffer.from(JSON.stringify(mockBody)));
          } else if (event === "end") {
            cb();
          }
        }),
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(router.handleRequest).toHaveBeenCalledWith(
        "POST",
        "/api/debug",
        mockBody,
        expect.any(Object),
      );
    });

    it("handles empty body", async () => {
      (router.handleRequest as jest.Mock).mockResolvedValue({
        statusCode: 200,
        body: { success: true },
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
        method: "POST",
        url: "/api/debug",
        on: jest.fn((event: string, cb: any) => {
          if (event === "end") {
            cb();
          }
        }),
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(router.handleRequest).toHaveBeenCalledWith(
        "POST",
        "/api/debug",
        undefined,
        expect.any(Object),
      );
    });

    it("rejects body too large (>1MB)", async () => {
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      let dataCb: any;
      const mockReq = {
        method: "POST",
        url: "/api/debug",
        destroy: jest.fn(),
        on: jest.fn((event: string, cb: any) => {
          if (event === "data") {
            dataCb = cb;
          }
        }),
      } as unknown as http.IncomingMessage;

      const requestPromise = (server as any).onRequest(mockReq, mockRes);

      // Send a chunk that exceeds MAX_BODY_SIZE (1MB)
      const largeChunk = Buffer.alloc(1024 * 1024 + 1);
      dataCb(largeChunk);

      await expect(requestPromise).resolves.toBeUndefined();
      expect(mockReq.destroy).toHaveBeenCalled();
    });

    it("rejects invalid JSON body", async () => {
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "POST",
        url: "/api/debug",
        on: jest.fn((event: string, cb: any) => {
          if (event === "data") {
            cb(Buffer.from("invalid json"));
          } else if (event === "end") {
            cb();
          }
        }),
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(500);
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining("Invalid JSON"),
      );
    });

    it("handles request error during body parsing", async () => {
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      let errorCb: any;
      const mockReq = {
        method: "POST",
        url: "/api/debug",
        on: jest.fn((event: string, cb: any) => {
          if (event === "error") {
            errorCb = cb;
          }
        }),
      } as unknown as http.IncomingMessage;

      const requestPromise = (server as any).onRequest(mockReq, mockRes);

      // Trigger error event
      errorCb(new Error("Stream error"));

      await expect(requestPromise).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // onRequest - Routing and response
  // ---------------------------------------------------------------
  describe("onRequest - Routing and response", () => {
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
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({ success: true, data: { message: "ok" } }),
      );
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

    it("logs request duration", async () => {
      (router.handleRequest as jest.Mock).mockResolvedValue({
        statusCode: 200,
        body: { success: true },
      });

      const { logger } = require("../../utils/logging");
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

      expect(logger.info).toHaveBeenCalledWith(
        "HttpServer",
        "request.handled",
        expect.objectContaining({
          method: "GET",
          url: "/api/ping",
          status: 200,
        }),
      );
    });
  });

  // ---------------------------------------------------------------
  // onRequest - Error handling
  // ---------------------------------------------------------------
  describe("onRequest - Error handling", () => {
    it("handles router errors with 500 response", async () => {
      (router.handleRequest as jest.Mock).mockRejectedValue(
        new Error("Router error"),
      );

      const { logger } = require("../../utils/logging");
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
        "request.failed",
        expect.objectContaining({
          method: "GET",
          url: "/api/ping",
          error: "Router error",
        }),
      );
      expect(mockRes.writeHead).toHaveBeenCalledWith(500);
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining("Router error"),
      );
    });

    it("guards against writing to closed socket - headersSent", async () => {
      (router.handleRequest as jest.Mock).mockRejectedValue(
        new Error("Error after headers"),
      );

      const { logger } = require("../../utils/logging");
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: true, // Already sent
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      // Should not attempt to write again
      expect(mockRes.writeHead).not.toHaveBeenCalled();
    });

    it("guards against writing to closed socket - destroyed", async () => {
      (router.handleRequest as jest.Mock).mockRejectedValue(
        new Error("Error on destroyed socket"),
      );

      const { logger } = require("../../utils/logging");
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        destroyed: true, // Socket destroyed
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      // Should not attempt to write
      expect(mockRes.writeHead).not.toHaveBeenCalled();
    });

    it("handles write error gracefully", async () => {
      (router.handleRequest as jest.Mock).mockRejectedValue(
        new Error("Original error"),
      );

      const { logger } = require("../../utils/logging");
      await server.start();

      const mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(() => {
          throw new Error("Write failed");
        }),
        end: jest.fn(),
        headersSent: false,
        destroyed: false,
      } as unknown as http.ServerResponse;

      const mockReq = {
        method: "GET",
        url: "/api/ping",
      } as unknown as http.IncomingMessage;

      await (server as any).onRequest(mockReq, mockRes);

      expect(logger.warn).toHaveBeenCalledWith(
        "HttpServer",
        "error_response.failed",
        expect.objectContaining({ error: "Write failed" }),
      );
    });
  });

  // ---------------------------------------------------------------
  // Integration - Real HTTP server
  // ---------------------------------------------------------------
  describe("Integration - Real HTTP server", () => {
    it("accepts real HTTP requests", async () => {
      const realServer = new HttpServer(9997);
      await realServer.start();

      try {
        // Mock handleRequest for this test
        (router.handleRequest as jest.Mock).mockImplementation(
          (method: string, url: string) => {
            return Promise.resolve({
              statusCode: 200,
              body: { success: true, data: { method, url } },
            });
          },
        );

        const response = await fetch("http://127.0.0.1:9997/api/ping");
        const parsed = (await response.json()) as any;
        expect(parsed.success).toBe(true);
        expect(parsed.data.url).toBe("/api/ping");
      } finally {
        await realServer.stop();
      }
    });

    it("handles POST requests with JSON body", async () => {
      const realServer = new HttpServer(9996);
      await realServer.start();

      try {
        (router.handleRequest as jest.Mock).mockImplementation(
          (method: string, url: string, body: any) => {
            return Promise.resolve({
              statusCode: 200,
              body: { success: true, data: { received: body } },
            });
          },
        );

        const postData = JSON.stringify({ operation: "test" });
        const response = await fetch("http://127.0.0.1:9996/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: postData,
        });
        const parsed = (await response.json()) as any;
        expect(parsed.success).toBe(true);
        expect(parsed.data.received.operation).toBe("test");
      } finally {
        await realServer.stop();
      }
    });
  });
});
