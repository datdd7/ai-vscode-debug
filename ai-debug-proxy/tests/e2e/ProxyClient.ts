import axios, { AxiosInstance, AxiosError } from "axios";

export class ProxyClient {
    private base_url: string;
    private session: AxiosInstance;

    constructor(base_url: string = "http://localhost:9999") {
        this.base_url = base_url;
        this.session = axios.create({ baseURL: base_url, timeout: 30000 });
    }

    async ping() {
        return this._get("/api/ping");
    }

    async status() {
        return this._get("/api/status");
    }

    async _get(path: string) {
        try {
            const r = await this.session.get(path);
            return { status: r.status, data: r.data };
        } catch (e) {
            const err = e as AxiosError;
            return { status: err.response?.status || 500, data: err.response?.data || { error: err.message }, error: err };
        }
    }

    async op(operation: string, params?: any, timeout: number = 30000) {
        console.log(`[ProxyClient] op start: ${operation}`);
        const body: any = { operation };
        if (params) {
            body.params = params;
        }
        try {
            console.log(`[ProxyClient] Sending POST /api/debug... timeout=${timeout}`);
            const r = await this.session.post("/api/debug", body, { timeout });
            console.log(`[ProxyClient] Received response for ${operation}`);
            return { status: r.status, data: r.data };
        } catch (e) {
            const err = e as AxiosError;
            console.log(`[ProxyClient] Error for ${operation}:`, err.message);
            return { status: err.response?.status || 500, data: err.response?.data || { error: err.message }, error: err };
        }
    }

    async raw_post(path: string, data: any, headers?: any, timeout: number = 30000) {
        try {
            const r = await this.session.post(path, data, {
                headers: headers || { "Content-Type": "application/json" },
                timeout
            });
            return { status: r.status, data: r.data };
        } catch (e) {
            const err = e as AxiosError;
            return { status: err.response?.status || 500, data: err.response?.data || { error: err.message }, error: err };
        }
    }

    async set_bp(path: string, line: number) {
        return this.op("set_breakpoint", { location: { path, line } });
    }

    async set_temp_bp(path: string, line: number) {
        return this.op("set_temp_breakpoint", { location: { path, line } });
    }

    async launch(program: string, cwd: string, stopOnEntry: boolean = true) {
        return this.op("launch", { program, cwd, stopOnEntry }, 60000);
    }

    async cont() { return this.op("continue", undefined, 120000); }
    async next() { return this.op("next"); }
    async step_in() { return this.op("step_in"); }
    async step_out() { return this.op("step_out"); }
    async quit() { return this.op("quit"); }
    async stack() { return this.op("stack_trace"); }
    async variables() { return this.op("get_stack_frame_variables"); }
    async evaluate(expr: string) { return this.op("evaluate", { expression: expr }); }
    async list_bps() { return this.op("get_active_breakpoints"); }

    async remove_bp(path: string, line: number) {
        return this.op("remove_breakpoint", { location: { path, line } });
    }

    async remove_all_bps(path: string) {
        return this.op("remove_all_breakpoints_in_file", { filePath: path });
    }

    async disable_bp(path: string, line: number) {
        return this.op("disable_breakpoint", { location: { path, line } });
    }

    async enable_bp(path: string, line: number) {
        return this.op("enable_breakpoint", { location: { path, line } });
    }

    async set_bp_condition(path: string, line: number, cond: string) {
        return this.op("set_breakpoint_condition", { location: { path, line }, condition: cond });
    }

    async list_source() { return this.op("list_source"); }

    async ensureClean(files: string[]) {
        console.log("[ensureClean] Checking status...");
        // Kill any active session and clear breakpoints
        for (let i = 0; i < 5; i++) {
            const { data } = await this.status();
            if (data?.data?.hasActiveSession) {
                console.log("[ensureClean] Active session found, quitting...");
                await this.quit();
                await new Promise((r) => setTimeout(r, 3000));
            } else {
                console.log("[ensureClean] No active session.");
                break;
            }
        }
        console.log(`[ensureClean] Clearing breakpoints for ${files.length} files...`);
        for (const file of files) {
            if (file.endsWith(".c")) {
                console.log(`[ensureClean] Removing bps in ${file}`);
                await this.remove_all_bps(file);
            }
        }
        console.log("[ensureClean] Breakpoints cleared.");
        await new Promise((r) => setTimeout(r, 1000));
    }

    async launchToBp(program: string, cwd: string, bp_file: string, bp_line: number) {
        await this.set_bp(bp_file, bp_line);
        await this.launch(program, cwd, true);
        await new Promise((r) => setTimeout(r, 1000));
        return this.cont();
    }

    async quitClean() {
        await this.quit();
        await new Promise((r) => setTimeout(r, 3000));
    }
}
