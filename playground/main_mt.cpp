/**
 * @file    main_mt.cpp
 * @brief   Multi-threaded ECU simulation for debug testing
 *
 * Standalone C++17 binary with 3 worker threads + shared state.
 * Used by E2E Suite J to test multi-thread debugging operations.
 *
 * Build:  make mt   (from playground/)
 */

#include <thread>
#include <mutex>
#include <atomic>
#include <chrono>
#include <cstdio>

// ── Shared state (visible across threads for variable inspection) ────────────

static std::atomic<int> shared_counter{0};
static std::mutex print_mutex;

// ── Per-thread data ──────────────────────────────────────────────────────────

struct ThreadData {
    int thread_id;
    const char* name;
    int local_counter;
    int sleep_ms;
};

// ── Worker functions (distinct names → easy to identify in list_threads) ─────

void worker_temp_monitor(ThreadData& data) {
    int temp = 25;
    for (int i = 0; i < 50; i++) {
        temp = 25 + (i % 10);
        data.local_counter = i;
        shared_counter++;
        std::this_thread::sleep_for(std::chrono::milliseconds(data.sleep_ms));
    }
    {
        std::lock_guard<std::mutex> lock(print_mutex);
        printf("[TempMonitor] Done. temp=%d\n", temp);
    }
}

void worker_motor_control(ThreadData& data) {
    int rpm = 0;
    for (int i = 0; i < 50; i++) {
        rpm = 1000 + (i * 50);
        data.local_counter = i;
        shared_counter++;
        std::this_thread::sleep_for(std::chrono::milliseconds(data.sleep_ms));
    }
    {
        std::lock_guard<std::mutex> lock(print_mutex);
        printf("[MotorControl] Done. rpm=%d\n", rpm);
    }
}

void worker_diagnostic(ThreadData& data) {
    int error_code = 0;
    for (int i = 0; i < 50; i++) {
        error_code = (i > 30) ? 0xDEAD : 0;
        data.local_counter = i;
        shared_counter++;
        std::this_thread::sleep_for(std::chrono::milliseconds(data.sleep_ms));
    }
    {
        std::lock_guard<std::mutex> lock(print_mutex);
        printf("[Diagnostic] Done. error_code=0x%X\n", error_code);
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

int main() {
    ThreadData thread_data[3] = {
        { 0, "TempMonitor",  0, 10 },
        { 1, "MotorControl", 0, 15 },
        { 2, "Diagnostic",   0, 20 },
    };
    int iteration = 0;

    printf("[MT] Starting multi-threaded ECU simulation\n");

    std::thread t1(worker_temp_monitor,  std::ref(thread_data[0]));
    std::thread t2(worker_motor_control, std::ref(thread_data[1]));
    std::thread t3(worker_diagnostic,    std::ref(thread_data[2]));

    t1.join();
    t2.join();
    t3.join();

    iteration = shared_counter.load();
    printf("[MT] Done. shared_counter = %d, iteration = %d\n", shared_counter.load(), iteration);
    return 0;
}
