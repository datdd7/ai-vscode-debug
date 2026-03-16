# Bug Patterns - Embedded C/C++ Knowledge Base

**Purpose:** Comprehensive bug patterns knowledge for embedded C/C++ debugging

---

## 📚 Overview

This document contains detailed bug patterns that Axel uses to identify and diagnose issues in embedded C/C++ code. Each pattern includes:
- Description
- Symptoms
- Common causes
- Detection strategies
- Investigation steps

---

## 🔴 Critical Bug Patterns

### 1. Ring Buffer Overflow

**Category:** Memory Corruption
**Severity:** Critical
**Frequency:** Very Common

**Description:**
Ring buffer (circular buffer) overflow occurs when head or tail pointers exceed buffer bounds, causing data corruption or overwriting unrelated memory.

**Common Causes:**
```c
// Missing wrap-around logic
void ring_write(ring_t *r, uint8_t data) {
    r->buffer[r->head] = data;
    r->head++;  // BUG: No wrap-around!
    // Should be: r->head = (r->head + 1) % r->size;
}

// Wrong wrap condition
if (r->head >= r->size) {
    r->head = 0;
    r->tail = 0;  // BUG: Why reset tail?
}

// Missing bounds check
void ring_write(ring_t *r, uint8_t *data, size_t len) {
    for (size_t i = 0; i < len; i++) {
        r->buffer[r->head] = data[i];  // BUG: No check if full
        r->head = (r->head + 1) % r->size;
    }
}
```

**Symptoms:**
- Data corruption in buffer
- head or tail index >= buffer size
- Old data overwritten incorrectly
- Buffer appears empty when it's not (or vice versa)

**Detection Strategy:**
```
1. Inspect ring->head and ring->tail values
2. Check if either >= ring->size
3. Verify wrap-around logic in write/read functions
4. Check for full/empty detection
```

**Investigation Steps:**
```bash
# Set breakpoint at ring_write entry
ai_bp "ring_buffer.c" 25

# When hit, inspect state
ai_eval "ring->head"
ai_eval "ring->tail"
ai_eval "ring->size"

# Step through write logic
ai_step_in

# Check wrap calculation
ai_eval "(ring->head + 1) % ring->size"
```

**Fix Pattern:**
```c
// Correct implementation
void ring_write(ring_t *r, uint8_t data) {
    if (ring_is_full(r)) return;  // Bounds check
    
    r->buffer[r->head] = data;
    r->head = (r->head + 1) % r->size;  // Wrap-around
}

bool ring_is_full(ring_t *r) {
    return ((r->head + 1) % r->size) == r->tail;
}
```

---

### 2. Race Condition (ISR vs Main)

**Category:** Concurrency
**Severity:** Critical
**Frequency:** Very Common

**Description:**
Race condition occurs when shared data is accessed by both ISR (Interrupt Service Routine) and main code without proper protection.

**Common Causes:**
```c
// Shared variable without volatile
uint32_t sensor_count = 0;  // BUG: Missing volatile

// ISR
void sensor_isr(void) {
    sensor_count++;  // Write from ISR
}

// Main code
void main_loop(void) {
    if (sensor_count > 0) {  // Read from main
        process_sensor();
        sensor_count--;
    }
}
// BUG: Non-atomic read-modify-write

// Multi-byte access without protection
uint32_t timestamp;  // 32-bit on 8-bit MCU

// ISR
void timer_isr(void) {
    timestamp = get_timer_value();  // 32-bit write
}

// Main
void main_loop(void) {
    uint32_t t = timestamp;  // BUG: Might read mid-update
}
```

**Symptoms:**
- Bug appears intermittently
- Different behavior with/without debugger
- Counter values don't match expectations
- Data corruption in shared structures

**Detection Strategy:**
```
1. Identify all shared variables (accessed by ISR and main)
2. Check if marked as volatile
3. Check if access is atomic
4. Look for read-modify-write patterns
```

**Investigation Steps:**
```bash
# Find shared variable declarations
# In VS Code: Search for variable usage

# Check if volatile
ai_eval "typeof(sensor_count)"

# Set watchpoint on shared variable
ai_watch "sensor_count" write

# Continue and observe access patterns
ai_continue
```

**Fix Pattern:**
```c
// Add volatile
volatile uint32_t sensor_count = 0;

// Disable interrupts during critical section
void main_loop(void) {
    uint32_t count;
    
    __disable_irq();
    count = sensor_count;
    sensor_count = 0;
    __enable_irq();
    
    if (count > 0) {
        process_sensor();
    }
}

// Or use atomic operations (C11)
#include <stdatomic.h>
atomic_uint sensor_count;

void sensor_isr(void) {
    atomic_fetch_add(&sensor_count, 1);
}
```

---

### 3. Stack Overflow (Recursion)

**Category:** Memory/Resource
**Severity:** Critical
**Frequency:** Common

**Description:**
Stack overflow occurs when call stack exceeds allocated stack space, corrupting adjacent memory or causing hard fault.

**Common Causes:**
```c
// Unbounded recursion
void process_tree(node_t *node) {
    if (node == NULL) return;
    
    process_tree(node->left);   // BUG: No depth limit
    process_tree(node->right);  // Deep trees = stack overflow
}

// Large local arrays
void process_data(void) {
    uint8_t buffer[4096];  // BUG: 4KB on stack!
    uint8_t temp[4096];    // Another 4KB
    
    read_data(buffer);
    // Stack might overflow if default stack is small
}

// Infinite recursion (typo in base case)
void countdown(int n) {
    if (n = 0) return;  // BUG: Assignment, not comparison!
    countdown(n - 1);
}
```

**Symptoms:**
- Hard fault or crash with no clear cause
- Corrupted local variables
- Return address overwritten
- Crash happens at seemingly random locations

**Detection Strategy:**
```
1. Get stack trace and count frames
2. Check for recursive patterns
3. Estimate stack usage per frame
4. Compare with configured stack size
```

**Investigation Steps:**
```bash
# Get full stack trace
ai_stack

# Count frames and estimate usage
# Typical frame: 32-64 bytes (locals + return address + saved regs)
# If 50 frames × 64 bytes = 3200 bytes

# Check current stack pointer
ai_eval "$sp"

# Check for recursion in code
# Search for function calling itself
```

**Fix Pattern:**
```c
// Add depth limit
void process_tree(node_t *node, int depth) {
    if (node == NULL || depth > MAX_DEPTH) return;
    
    process_tree(node->left, depth + 1);
    process_tree(node->right, depth + 1);
}

// Use static or global buffer instead of stack
static uint8_t buffer[4096];  // In .bss section

void process_data(void) {
    // Use static buffer
    read_data(buffer);
}

// Or use heap allocation
void process_data(void) {
    uint8_t *buffer = malloc(4096);
    if (buffer == NULL) return;  // Handle allocation failure
    
    read_data(buffer);
    free(buffer);
}
```

---

### 4. Use-After-Free

**Category:** Memory Corruption
**Severity:** Critical
**Frequency:** Common

**Description:**
Use-after-free occurs when code accesses memory that has already been freed, leading to undefined behavior.

**Common Causes:**
```c
// Dangling pointer
void process_data(void) {
    uint8_t *buffer = malloc(256);
    fill_data(buffer);
    free(buffer);
    
    // BUG: Using freed memory
    process(buffer);  // Use-after-free!
}

// Multiple pointers to same memory
void example(void) {
    uint8_t *ptr1 = malloc(256);
    uint8_t *ptr2 = ptr1;  // Alias
    
    free(ptr1);
    // BUG: ptr2 is now dangling
    *ptr2 = 42;  // Use-after-free!
}

// Return pointer to local variable
uint8_t* get_buffer(void) {
    uint8_t buffer[256];  // Stack allocation
    fill_data(buffer);
    return buffer;  // BUG: Returns dangling pointer!
}
```

**Symptoms:**
- Random crashes
- Data corruption after free
- Different behavior in debug vs release
- Heap corruption detected

**Detection Strategy:**
```
1. Track pointer lifecycle (alloc → use → free → use?)
2. Check if pointer is NULL'd after free
3. Look for aliases to freed memory
4. Check for returned stack addresses
```

**Investigation Steps:**
```bash
# Set watchpoint on pointer variable
ai_watch "ptr1" write

# Set breakpoint at free() call
ai_bp "file.c" <line_of_free>

# When hit, check if pointer is still used
ai_continue

# After free, check pointer value
ai_eval "ptr1"
ai_eval "ptr2"
```

**Fix Pattern:**
```c
// NULL pointer after free
void process_data(void) {
    uint8_t *buffer = malloc(256);
    fill_data(buffer);
    free(buffer);
    buffer = NULL;  // Prevent use-after-free
    
    // Now this will crash obviously (null deref) instead of silently corrupting
    if (buffer != NULL) {
        process(buffer);  // Won't execute
    }
}

// Don't return stack addresses
uint8_t* get_buffer(void) {
    static uint8_t buffer[256];  // Static storage
    // OR: uint8_t *buffer = malloc(256);  // Heap allocation
    fill_data(buffer);
    return buffer;
}

// Use smart pointers (C++)
void process_data(void) {
    auto buffer = std::make_unique<uint8_t[]>(256);
    fill_data(buffer.get());
    process(buffer.get());  // Automatically freed when out of scope
}
```

---

### 5. Integer Overflow

**Category:** Arithmetic
**Severity:** High
**Frequency:** Very Common

**Description:**
Integer overflow occurs when arithmetic operation produces a value larger than the type can represent, causing wrap-around.

**Common Causes:**
```c
// PID controller windup
void pid_update(pid_t *p, int32_t error) {
    p->integral += error;  // BUG: Can overflow!
    // If integral is int16_t and error accumulates...
    
    int32_t output = p->kp * error + p->ki * p->integral;
    // BUG: output can overflow int16_t range
}

// Distance/time calculation
uint32_t calculate_speed(uint32_t distance, uint32_t time) {
    return distance / time;  // BUG: What if time = 0?
}

// Array index calculation
void process_2d_array(uint8_t arr[100][100], int x, int y) {
    int index = x * 100 + y;  // BUG: Can overflow if x is large
    arr[0][index] = 42;  // Out of bounds!
}

// Signed/unsigned mismatch
void copy_data(int16_t *dest, uint16_t *src, int count) {
    for (int i = 0; i < count; i++) {
        dest[i] = src[i];  // BUG: If src[i] > 32767, sign extension
    }
}
```

**Symptoms:**
- Values suddenly become negative (or very large)
- Calculations produce wrong results
- Array out-of-bounds access
- Division by zero errors

**Detection Strategy:**
```
1. Check arithmetic operations on bounded types
2. Look for accumulation without saturation
3. Verify division denominators
4. Check for signed/unsigned mixing
```

**Investigation Steps:**
```bash
# Set breakpoint before arithmetic
ai_bp "pid.c" 45

# Inspect operands
ai_eval "p->integral"
ai_eval "error"
ai_eval "typeof(p->integral)"

# Check type limits
ai_eval "INT16_MAX"
ai_eval "INT16_MIN"

# Step through calculation
ai_next
ai_eval "p->integral + error"
```

**Fix Pattern:**
```c
// Add saturation
#include <limits.h>

void pid_update(pid_t *p, int32_t error) {
    // Saturating addition
    if (error > 0 && p->integral > INT16_MAX - error) {
        p->integral = INT16_MAX;
    } else if (error < 0 && p->integral < INT16_MIN - error) {
        p->integral = INT16_MIN;
    } else {
        p->integral += error;
    }
    
    // Clamp output
    int32_t output = p->kp * error + p->ki * p->integral;
    p->output = (int16_t)clamp(output, INT16_MIN, INT16_MAX);
}

// Check denominator
uint32_t calculate_speed(uint32_t distance, uint32_t time) {
    if (time == 0) return 0;  // Or return error
    return distance / time;
}

// Use wider types for intermediate calculations
void process_2d_array(uint8_t arr[100][100], int32_t x, int32_t y) {
    int32_t index = x * 100 + y;
    if (index >= 0 && index < 10000) {
        arr[0][index] = 42;
    }
}
```

---

## 🟠 High-Severity Bug Patterns

### 6. Uninitialized Variables

**Category:** Initialization
**Severity:** High
**Frequency:** Very Common

**Description:**
Using variables before they are initialized leads to undefined behavior with unpredictable values.

**Common Causes:**
```c
// Struct not initialized
typedef struct {
    int32_t position;
    int32_t velocity;
    uint8_t status;
} sensor_t;

void process_sensor(void) {
    sensor_t sensor;  // BUG: Uninitialized!
    
    if (sensor.status == READY) {  // Reading garbage
        // ...
    }
}

// Pointer not initialized
void find_value(int *arr, int size, int target) {
    int *result;  // BUG: Uninitialized!
    
    for (int i = 0; i < size; i++) {
        if (arr[i] == target) {
            result = &arr[i];
            break;
        }
    }
    
    // BUG: result might be uninitialized
    printf("Found: %d\n", *result);
}

// Filter state not initialized
typedef struct {
    float history[8];
    int index;
} filter_t;

filter_t my_filter;  // Global, but history[] not initialized!
```

**Symptoms:**
- Random/crazy values (0xCCCCCCCC, 0xDEADBEEF in debug)
- Behavior changes between runs
- Works in debug, fails in release (or vice versa)
- Conditional branches take unexpected paths

**Detection Strategy:**
```
1. Check all variable declarations
2. Verify initialization before first use
3. Look for conditional initialization paths
4. Check global/static variables
```

**Fix Pattern:**
```c
// Initialize struct
sensor_t sensor = {0};  // Zero-initialize all fields
// OR
sensor_t sensor = {
    .position = 0,
    .velocity = 0,
    .status = NOT_READY
};

// Initialize pointer
int *result = NULL;

for (int i = 0; i < size; i++) {
    if (arr[i] == target) {
        result = &arr[i];
        break;
    }
}

if (result != NULL) {
    printf("Found: %d\n", *result);
} else {
    printf("Not found\n");
}

// Initialize filter
filter_t my_filter = {
    .history = {0},
    .index = 0
};
```

---

### 7. Missing Volatile

**Category:** Concurrency/Optimization
**Severity:** High
**Frequency:** Common

**Description:**
Missing volatile keyword on variables that can change unexpectedly (hardware registers, ISR-shared variables) causes compiler to optimize incorrectly.

**Common Causes:**
```c
// Hardware register
#define GPIO_INPUT  (*(uint32_t*)0x40020000)  // BUG: Should be volatile

void read_gpio(void) {
    uint32_t value = GPIO_INPUT;  // Compiler might cache this!
    // ...
    value = GPIO_INPUT;  // Might read cached value, not hardware
}

// Flag set by ISR
uint32_t data_ready = 0;  // BUG: Missing volatile

void data_isr(void) {
    data_ready = 1;
}

void main_loop(void) {
    while (data_ready == 0) {  // BUG: Compiler might optimize to while(1)
        // Wait...
    }
    // Process data
}

// Memory-mapped peripheral
typedef struct {
    uint32_t ctrl;
    uint32_t status;
    uint32_t data;
} peripheral_t;

peripheral_t *periph = (peripheral_t*)0x40021000;  // BUG: Should be volatile

void read_peripheral(void) {
    uint32_t status = periph->status;  // Might read stale value
}
```

**Symptoms:**
- Code works in debug, hangs in release
- Infinite loops that should exit
- Hardware reads return stale values
- Compiler optimization changes behavior

**Detection Strategy:**
```
1. Check all hardware register access
2. Identify variables shared with ISRs
3. Look for polling loops
4. Check memory-mapped peripherals
```

**Fix Pattern:**
```c
// Hardware register
#define GPIO_INPUT  (*(volatile uint32_t*)0x40020000)

// Flag set by ISR
volatile uint32_t data_ready = 0;

// Memory-mapped peripheral
volatile peripheral_t *periph = (volatile peripheral_t*)0x40021000;

void read_peripheral(void) {
    uint32_t status = periph->status;  // Always reads from hardware
}
```

---

### 8. Wrong Bitwise Operations

**Category:** Logic Error
**Severity:** High
**Frequency:** Common

**Description:**
Incorrect bitwise operations (masking, shifting, bit fields) cause wrong values or unexpected behavior.

**Common Causes:**
```c
// Wrong mask
uint32_t extract_field(uint32_t reg, int start, int width) {
    uint32_t mask = (1 << width) - 1;  // BUG: Overflow if width = 32!
    return (reg >> start) & mask;
}

// Operator precedence
void set_flag(uint32_t *reg, int bit, int value) {
    if (value) {
        *reg |= 1 << bit;
    } else {
        *reg &= ~(1 << bit);  // BUG: ~ has higher precedence than <<
        // Should be: *reg &= ~(1U << bit);
    }
}

// Sign extension
int16_t read_sensor(void) {
    uint16_t raw = read_adc();
    return (int16_t)(raw >> 4);  // BUG: Should sign-extend if needed
}

// Bit field access
typedef struct {
    uint32_t enable : 1;
    uint32_t mode   : 3;
    uint32_t value  : 12;
    uint32_t reserved : 16;
} config_t;

volatile config_t *cfg = (config_t*)0x40022000;

void set_mode(int m) {
    cfg->mode = m;  // BUG: Might affect other bits if not careful
}
```

**Symptoms:**
- Wrong values extracted from registers
- Flags not set/cleared correctly
- Unexpected sign extension
- Bit field corruption

**Detection Strategy:**
```
1. Check all bit manipulation code
2. Verify mask calculations
3. Check operator precedence
4. Look for sign extension issues
```

**Fix Pattern:**
```c
// Safe field extraction
uint32_t extract_field(uint32_t reg, int start, int width) {
    if (width >= 32) return reg >> start;  // Handle edge case
    uint32_t mask = (1U << width) - 1;
    return (reg >> start) & mask;
}

// Correct precedence
void set_flag(uint32_t *reg, int bit, int value) {
    if (value) {
        *reg |= (1U << bit);
    } else {
        *reg &= ~(1U << bit);  // Parentheses for clarity
    }
}

// Safe bit field access
void set_mode(int m) {
    cfg->mode = (m & 0x07);  // Mask to 3 bits
    // Or use RMW (read-modify-write)
    // cfg->mode = m;  // This is actually safe for bit fields
}
```

---

## 🟡 Medium-Severity Bug Patterns

### 9. Off-by-One Errors

**Category:** Logic Error
**Severity:** Medium
**Frequency:** Very Common

**Description:**
Off-by-one errors occur when loop bounds or array indices are off by one, causing buffer overflows or missed elements.

**Common Causes:**
```c
// Loop bounds
for (int i = 0; i <= size; i++) {  // BUG: Should be < size
    buffer[i] = 0;
}

// Array index
void copy_string(char *dest, const char *src, int len) {
    for (int i = 0; i < len; i++) {
        dest[i] = src[i];
    }
    dest[len] = '\0';  // BUG: Should be dest[len-1] or allocate len+1
}

// Ring buffer full check
bool ring_is_full(ring_t *r) {
    return r->head == r->tail;  // BUG: This means empty, not full!
    // Correct: return ((r->head + 1) % r->size) == r->tail;
}
```

**Symptoms:**
- Buffer overflow by one byte
- Last element not processed
- Null terminator missing
- Fencepost errors

**Detection Strategy:**
```
1. Check all loop conditions (< vs <=)
2. Verify array bounds
3. Look for null terminator handling
4. Check boundary conditions
```

---

### 10. Wrong CRC/Checksum

**Category:** Algorithm Error
**Severity:** Medium
**Frequency:** Occasional

**Description:**
Using wrong CRC polynomial or checksum algorithm causes data integrity checks to fail silently.

**Common Causes:**
```c
// Wrong CRC polynomial
uint16_t crc16(uint8_t *data, int len) {
    uint16_t crc = 0xFFFF;
    for (int i = 0; i < len; i++) {
        crc ^= data[i];
        for (int j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >> 1) ^ 0xA001;  // BUG: Wrong polynomial!
                // Should be: 0x8005 for CRC-16-IBM
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

// Checksum not verified
void receive_packet(packet_t *pkt) {
    uint8_t sum = 0;
    for (int i = 0; i < pkt->length; i++) {
        sum += pkt->data[i];
    }
    // BUG: Never compare with pkt->checksum!
}
```

**Symptoms:**
- CRC checks always fail
- Corrupted data passes checksum
- Communication errors undetected

---

## 📋 Quick Reference

| Bug Pattern | Category | Severity | Frequency | Key Symptom |
|-------------|----------|----------|-----------|-------------|
| Ring Buffer Overflow | Memory | Critical | Very Common | head/tail >= size |
| Race Condition | Concurrency | Critical | Very Common | Intermittent failures |
| Stack Overflow | Memory | Critical | Common | Hard fault, deep stack |
| Use-After-Free | Memory | Critical | Common | Random corruption |
| Integer Overflow | Arithmetic | High | Very Common | Values wrap around |
| Uninitialized Vars | Initialization | High | Very Common | Random values |
| Missing Volatile | Optimization | High | Common | Works in debug only |
| Wrong Bitwise | Logic | High | Common | Wrong bit values |
| Off-by-One | Logic | Medium | Very Common | Buffer overflow by 1 |
| Wrong CRC | Algorithm | Medium | Occasional | Checksum mismatches |

---

*This knowledge base helps Axel identify and diagnose embedded C/C++ bugs systematically.*
