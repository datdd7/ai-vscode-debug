#!/bin/bash
#===============================================================================
# File:        ai-debug.sh
#
# Description: CLI helper for AI VSCode Debug Proxy
#
#              Provides command-line interface for interacting with the
#              AI Debug Proxy HTTP API.
#
#              Output is pure JSON by default (AI-friendly).
#              Use --pretty flag for human-readable colored output.
#
# Usage:       source ai-debug.sh
#              ai_launch ./build/app
#              ai_bp main.c 42
#              ai_continue
#
# Environment: AI_DEBUG_URL (default: http://localhost:9999)
#              AI_DEBUG_PRETTY (default: false - set to true for colored output)
#
#===============================================================================

# Default configuration
AI_DEBUG_URL="${AI_DEBUG_URL:-http://localhost:9999}"
AI_DEBUG_TIMEOUT="${AI_DEBUG_TIMEOUT:-30}"
AI_DEBUG_PRETTY="${AI_DEBUG_PRETTY:-false}"  # false = pure JSON (AI-friendly)

# Color codes for output (only used when AI_DEBUG_PRETTY=true)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Internal helper functions
#-------------------------------------------------------------------------------

# Print colored message (to stderr, not stdout - keeps JSON output clean)
_ai_print() {
    local color=$1
    local message=$2
    if [[ "$AI_DEBUG_PRETTY" == "true" ]]; then
        echo -e "${color}${message}${NC}" >&2  # stderr
    fi
}

# Print info message (to stderr)
_ai_info() {
    if [[ "$AI_DEBUG_PRETTY" == "true" ]]; then
        _ai_print "$BLUE" "ℹ $1" >&2
    fi
}

# Print success message (to stderr)
_ai_success() {
    if [[ "$AI_DEBUG_PRETTY" == "true" ]]; then
        _ai_print "$GREEN" "✓ $1" >&2
    fi
}

# Print warning message (to stderr)
_ai_warn() {
    if [[ "$AI_DEBUG_PRETTY" == "true" ]]; then
        _ai_print "$YELLOW" "⚠ $1" >&2
    fi
}

# Print error message (to stderr)
_ai_error() {
    _ai_print "$RED" "✗ $1" >&2
}

# Execute debug operation
# Usage: _ai_debug_op <operation> [params_json]
# Output: Pure JSON to stdout (AI-friendly)
#         Messages to stderr (only if AI_DEBUG_PRETTY=true)
_ai_debug_op() {
    local operation=$1
    local params=${2:-"{}"}

    _ai_info "Executing: $operation"

    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$AI_DEBUG_URL/api/debug/execute_operation" \
        -H "Content-Type: application/json" \
        -d "{\"operation\":\"$operation\",\"params\":$params}" \
        --max-time "$AI_DEBUG_TIMEOUT" 2>/dev/null)

    local http_code
    http_code=$(printf '%s\n' "$response" | tail -n1)
    local body
    body=$(printf '%s\n' "$response" | head -n -1)

    if [[ "$http_code" -eq 000 ]]; then
        _ai_error "Cannot connect to debug proxy at $AI_DEBUG_URL"
        echo "{\"success\":false,\"error\":\"Cannot connect to proxy\"}"
        return 1
    fi

    # Output pure JSON to stdout (for AI parsing)
    printf '%s\n' "$body"

    # Check if operation was successful
    local success
    success=$(printf '%s' "$body" | jq -r 'if .data.success != null then .data.success elif .success != null then .success else "true" end' 2>/dev/null)
    if [[ "$success" == "false" ]]; then
        return 1
    fi

    return 0
}

# Check if proxy is running
_ai_check_proxy() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$AI_DEBUG_URL/api/ping" --max-time 5 2>/dev/null)
    
    if [[ "$response" -eq 200 ]]; then
        return 0
    else
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Public API functions
#-------------------------------------------------------------------------------

# Check if proxy is running
# Usage: ai_status
ai_status() {
    if _ai_check_proxy; then
        _ai_success "Debug proxy is running at $AI_DEBUG_URL"
        curl -s "$AI_DEBUG_URL/api/ping" | jq '.data'
    else
        _ai_error "Debug proxy is NOT running at $AI_DEBUG_URL"
        echo ""
        echo "Make sure the AI Debug Proxy extension is installed and active in VS Code."
        echo "You can start it with: Command Palette → AI Debug Proxy: Start Server"
        return 1
    fi
}

# Launch debug session
# Usage: ai_launch <program> [stopOnEntry] [workspacePath]
ai_launch() {
    local program=$1
    local stop_on_entry=${2:-true}
    local workspace_path=$3

    if [[ -z "$program" ]]; then
        _ai_error "Usage: ai_launch <program> [stopOnEntry] [workspacePath]"
        return 1
    fi

    # Auto-detect workspace path if program contains variables or is relative
    if [[ -z "$workspace_path" ]]; then
        if [[ "$program" == *'${workspaceFolder}'* ]] || [[ "$program" == *'${workspaceRoot}'* ]]; then
            # Try to detect workspace from current directory or git root
            if git rev-parse --show-toplevel &>/dev/null; then
                workspace_path=$(git rev-parse --show-toplevel)
                _ai_info "Auto-detected workspace from git root: $workspace_path"
            else
                workspace_path=$(pwd)
                _ai_info "Using current directory as workspace: $workspace_path"
            fi
        elif [[ "$program" != /* ]]; then
            # Relative path - use current directory as workspace
            workspace_path=$(pwd)
        fi
    fi

    # Warn if an active session exists — it will be replaced
    local _stop_result
    _stop_result=$(_ai_debug_op "get_last_stop_info" "{}" 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        local _stop_loc
        _stop_loc=$(printf '%s' "$_stop_result" | jq -r \
            'if .data.stopInfo then "stopped at \(.data.stopInfo.source.name // "unknown"):\(.data.stopInfo.line // "?")" else empty end' 2>/dev/null)
        [[ -n "$_stop_loc" ]] && _ai_warn "Active session found ($_stop_loc). Replacing it."
    fi

    _ai_info "Launching debug session for: $program"

    local params="{\"program\":\"$program\",\"stopOnEntry\":$stop_on_entry"
    if [[ -n "$workspace_path" ]]; then
        params="$params,\"workspacePath\":\"$workspace_path\""
    fi
    params="$params}"

    local result
    result=$(_ai_debug_op "launch" "$params")

    if [[ $? -eq 0 ]]; then
        _ai_success "Debug session launched"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to launch debug session${reason:+ — $reason}"
        return 1
    fi
}

# Set breakpoint
# Usage: ai_bp <file> <line> [condition]
ai_bp() {
    local file=$1
    local line=$2
    local condition=$3
    
    if [[ -z "$file" || -z "$line" ]]; then
        _ai_error "Usage: ai_bp <file> <line> [condition]"
        return 1
    fi
    
    local abs_path=$(readlink -f "$file" 2>/dev/null || echo "$file")
    local params
    if [[ -n "$condition" ]]; then
        # Use printf+sed to safely embed condition in JSON without bash history expansion
        local escaped_cond
        escaped_cond=$(printf '%s' "$condition" | sed 's/\\/\\\\/g; s/"/\\"/g')
        params=$(printf '{"location":{"path":"%s","line":%d},"condition":"%s"}' \
            "$abs_path" "$line" "$escaped_cond")
    else
        params="{\"location\":{\"path\":\"$abs_path\",\"line\":$line}}"
    fi

    # Warn on duplicate BP at same file+line
    local _bps_result
    _bps_result=$(_ai_debug_op "get_active_breakpoints" "{}" 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        local _dup_count
        _dup_count=$(printf '%s' "$_bps_result" | jq -r \
            --arg path "$abs_path" --arg line "$line" \
            '[.data.breakpoints[]? | select(.location.path == $path and (.location.line | tostring) == $line)] | length' 2>/dev/null)
        if [[ "${_dup_count:-0}" -gt 0 ]]; then
            _ai_warn "Breakpoint already exists at $file:$line. Skipping."
            return 0
        fi
    fi

    _ai_info "Setting breakpoint at $file:$line"
    local result
    result=$(_ai_debug_op "set_breakpoint" "$params")

    if [[ $? -eq 0 ]]; then
        _ai_success "Breakpoint set"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to set breakpoint${reason:+ — $reason}"
        return 1
    fi
}

# Set temporary breakpoint
# Usage: ai_tbp <file> <line>
ai_tbp() {
    local file=$1
    local line=$2
    
    if [[ -z "$file" || -z "$line" ]]; then
        _ai_error "Usage: ai_tbp <file> <line>"
        return 1
    fi
    
    local abs_path=$(readlink -f "$file" 2>/dev/null || echo "$file")
    _ai_info "Setting temporary breakpoint at $abs_path:$line"
    local result
    result=$(_ai_debug_op "set_temp_breakpoint" "{\"location\":{\"path\":\"$abs_path\",\"line\":$line}}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Temporary breakpoint set (will auto-remove on hit)"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to set temporary breakpoint${reason:+ — $reason}"
        return 1
    fi
}

# Continue execution
# Usage: ai_continue
ai_continue() {
    _ai_info "Continuing execution..."
    local result
    result=$(_ai_debug_op "continue" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Continued"
        local pos stop_reason
        pos=$(printf '%s' "$result" | jq -r 'if .data.frame then "→ \(.data.frame.sourcePath | gsub("vscode-remote://[^/]+"; "") | split("/") | last):\(.data.frame.line)" else empty end' 2>/dev/null)
        stop_reason=$(printf '%s' "$result" | jq -r '.data.stopReason // empty' 2>/dev/null)
        
        if [[ "$stop_reason" == "exception" || "$stop_reason" == "signal" ]]; then
            _ai_error "Program stopped due to a crash ($stop_reason)"
            local crash_desc
            crash_desc=$(printf '%s' "$result" | jq -r '.data.crashInfo.description // empty' 2>/dev/null)
            if [[ -n "$crash_desc" ]]; then
                echo "Reason: $crash_desc"
            fi
            if [[ -n "$pos" ]]; then echo "At: $pos"; fi
        elif [[ -n "$pos" ]]; then
            echo "$pos"
        elif [[ "$stop_reason" == "running" ]]; then
            _ai_warn "Program resumed — no breakpoint hit, session may still be running"
        else
            _ai_warn "Program may have exited after step — debug session ended"
        fi
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to continue${reason:+ — $reason}"
        return 1
    fi
}

# Step over (next line)
# Usage: ai_next
ai_next() {
    _ai_info "Stepping to next line..."
    local result
    result=$(_ai_debug_op "next" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Stepped"
        local pos stop_reason
        pos=$(printf '%s' "$result" | jq -r 'if .data.frame then "→ \(.data.frame.sourcePath | gsub("vscode-remote://[^/]+"; "") | split("/") | last):\(.data.frame.line)" else empty end' 2>/dev/null)
        stop_reason=$(printf '%s' "$result" | jq -r '.data.stopReason // empty' 2>/dev/null)
        
        if [[ "$stop_reason" == "exception" || "$stop_reason" == "signal" ]]; then
            _ai_error "Program stopped due to a crash ($stop_reason)"
            local crash_desc
            crash_desc=$(printf '%s' "$result" | jq -r '.data.crashInfo.description // empty' 2>/dev/null)
            if [[ -n "$crash_desc" ]]; then
                echo "Reason: $crash_desc"
            fi
            if [[ -n "$pos" ]]; then echo "At: $pos"; fi
        elif [[ -n "$pos" ]]; then
            echo "$pos"
        elif [[ "$stop_reason" == "running" ]]; then
            _ai_warn "Program resumed — no breakpoint hit, session may still be running"
        else
            _ai_warn "Program may have exited after step — debug session ended"
        fi
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to step${reason:+ — $reason}"
        return 1
    fi
}

# Step into function
# Usage: ai_step_in
ai_step_in() {
    _ai_info "Stepping into function..."
    local result
    result=$(_ai_debug_op "step_in" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Stepped in"
        local pos stop_reason
        pos=$(printf '%s' "$result" | jq -r 'if .data.frame then "→ \(.data.frame.sourcePath | gsub("vscode-remote://[^/]+"; "") | split("/") | last):\(.data.frame.line)" else empty end' 2>/dev/null)
        stop_reason=$(printf '%s' "$result" | jq -r '.data.stopReason // empty' 2>/dev/null)
        
        if [[ "$stop_reason" == "exception" || "$stop_reason" == "signal" ]]; then
            _ai_error "Program stopped due to a crash ($stop_reason)"
            local crash_desc
            crash_desc=$(printf '%s' "$result" | jq -r '.data.crashInfo.description // empty' 2>/dev/null)
            if [[ -n "$crash_desc" ]]; then
                echo "Reason: $crash_desc"
            fi
            if [[ -n "$pos" ]]; then echo "At: $pos"; fi
        elif [[ -n "$pos" ]]; then
            echo "$pos"
        elif [[ "$stop_reason" == "running" ]]; then
            _ai_warn "Program resumed — no breakpoint hit, session may still be running"
        else
            _ai_warn "Program may have exited after step — debug session ended"
        fi
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to step in${reason:+ — $reason}"
        return 1
    fi
}

# Step out of function
# Usage: ai_step_out
ai_step_out() {
    _ai_info "Stepping out of function..."
    local result
    result=$(_ai_debug_op "step_out" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Stepped out"
        local pos stop_reason
        pos=$(printf '%s' "$result" | jq -r 'if .data.frame then "→ \(.data.frame.sourcePath | gsub("vscode-remote://[^/]+"; "") | split("/") | last):\(.data.frame.line)" else empty end' 2>/dev/null)
        stop_reason=$(printf '%s' "$result" | jq -r '.data.stopReason // empty' 2>/dev/null)
        
        if [[ "$stop_reason" == "exception" || "$stop_reason" == "signal" ]]; then
            _ai_error "Program stopped due to a crash ($stop_reason)"
            local crash_desc
            crash_desc=$(printf '%s' "$result" | jq -r '.data.crashInfo.description // empty' 2>/dev/null)
            if [[ -n "$crash_desc" ]]; then
                echo "Reason: $crash_desc"
            fi
            if [[ -n "$pos" ]]; then echo "At: $pos"; fi
        elif [[ -n "$pos" ]]; then
            echo "$pos"
        elif [[ "$stop_reason" == "running" ]]; then
            _ai_warn "Program resumed — no breakpoint hit, session may still be running"
        else
            _ai_warn "Program may have exited after step — debug session ended"
        fi
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to step out${reason:+ — $reason}"
        return 1
    fi
}

# Get stack trace
# Usage: ai_stack
ai_stack() {
    _ai_info "Getting stack trace..."
    local result
    result=$(_ai_debug_op "stack_trace" "{}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '[.data.frames[]? | .sourcePath |= gsub("vscode-remote://[^/]+"; "")]'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get stack trace${reason:+ — $reason}"
        return 1
    fi
}

# Get current top frame only (lightweight: ~80 chars vs ~6000 for ai_stack)
# Usage: ai_frame
ai_frame() {
    local result
    result=$(_ai_debug_op "stack_trace" "{}")

    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '{
            id:       .data.frames[0].id,
            function: (.data.frames[0].name | gsub("^[^!]+!"; "") | gsub("\\(.*"; "")),
            file:     (.data.frames[0].sourcePath | gsub("vscode-remote://[^/]+"; "") | split("/") | last),
            path:     (.data.frames[0].sourcePath | gsub("vscode-remote://[^/]+"; "")),
            line:     .data.frames[0].line
        }'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get frame${reason:+ — $reason}"
        return 1
    fi
}

# Move up one frame in call stack (toward caller)
# Usage: ai_up
ai_up() {
    _ai_info "Moving up one frame..."
    local result
    result=$(_ai_debug_op "up" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Moved up"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to move up${reason:+ — $reason}"
        return 1
    fi
}

# Move down one frame in call stack (toward callee)
# Usage: ai_down
ai_down() {
    _ai_info "Moving down one frame..."
    local result
    result=$(_ai_debug_op "down" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Moved down"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to move down${reason:+ — $reason}"
        return 1
    fi
}

# Switch to a specific frame by ID (use ai_stack to get IDs)
# Usage: ai_goto <frameId>
ai_goto() {
    local frame_id=$1

    if [[ -z "$frame_id" ]]; then
        _ai_error "Usage: ai_goto <frameId>"
        return 1
    fi

    _ai_info "Switching to frame $frame_id..."
    local result
    result=$(_ai_debug_op "goto_frame" "{\"frameId\":$frame_id}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Switched to frame $frame_id"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to switch to frame $frame_id${reason:+ — $reason}"
        return 1
    fi
}

# Get variables in current frame
# Usage: ai_vars [frameId]
ai_vars() {
    local frame_id=$1
    local params="{}"

    if [[ -n "$frame_id" ]]; then
        params="{\"frameId\":$frame_id}"
    fi

    _ai_info "Getting variables..."
    local result
    result=$(_ai_debug_op "get_stack_frame_variables" "$params")

    if [[ $? -eq 0 ]]; then
        # Extract variables from all scopes and flatten into single array
        printf '%s' "$result" | jq '[.data.scopes[]? | .variables[]?] | if length == 0 then null else . end'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get variables${reason:+ — $reason}"
        return 1
    fi
}

# Get all local variables and arguments (consolidated)
# Usage: ai_locals [frameId]
ai_locals() {
    local frame_id=$1
    local params="{}"

    if [[ -n "$frame_id" ]]; then
        params="{\"frameId\":$frame_id}"
    fi

    _ai_info "Getting local variables..."
    local result
    result=$(_ai_debug_op "list_all_locals" "$params")

    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data.variables'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get locals${reason:+ — $reason}"
        return 1
    fi
}

# Evaluate expression
# Usage: ai_eval [-r|--raw] [-a|--auto-frame] <expression>
ai_eval() {
    local raw=false
    local auto_frame=false
    local expression=""

    while [[ "$#" -gt 0 ]]; do
        case $1 in
            -r|--raw) raw=true ;;
            -a|--auto-frame) auto_frame=true ;;
            *) expression=$1 ;;
        esac
        shift
    done

    if [[ -z "$expression" ]]; then
        _ai_error "Usage: ai_eval [-r|--raw] [-a|--auto-frame] <expression>"
        return 1
    fi

    _ai_info "Evaluating: $expression (raw=$raw, auto_frame=$auto_frame)"
    
    local params="{\"expression\":\"$expression\",\"raw\":$raw"
    if [[ "$auto_frame" == "true" ]]; then
        params="$params,\"autoFrame\":true"
    fi
    params="$params}"
    
    local result
    result=$(_ai_debug_op "evaluate" "$params")

    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq -r '.data.result // .error'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to evaluate${reason:+ — $reason}"
        return 1
    fi
}

# List source code around current line
# Usage: ai_source [lines_around]
ai_source() {
    local lines=${1:-5}
    
    _ai_info "Listing source (±$lines lines)..."
    local result
    result=$(_ai_debug_op "list_source" "{\"linesAround\":$lines}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq -r '.data.sourceCode // .error'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to list source${reason:+ — $reason}"
        return 1
    fi
}

# Get last stop information
# Usage: ai_last_stop
ai_last_stop() {
    _ai_info "Getting last stop info..."
    local result
    result=$(_ai_debug_op "get_last_stop_info" "{}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "No stop event recorded${reason:+ — $reason}"
        return 1
    fi
}

# Get active breakpoints
# Usage: ai_bps
ai_bps() {
    _ai_info "Getting active breakpoints..."
    local result
    result=$(_ai_debug_op "get_active_breakpoints" "{}")
    
    if [[ $? -eq 0 ]]; then
        # Unescape condition strings before display (strip sed-introduced \\ artefacts)
        printf '%s' "$result" | jq '[.data.breakpoints[]? | .condition |= if . then gsub("\\\\\\\\!"; "!") else . end]'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get breakpoints${reason:+ — $reason}"
        return 1
    fi
}

# Remove all breakpoints in file
# Usage: ai_clear_bps <file>
ai_clear_bps() {
    local file=$1
    
    if [[ -z "$file" ]]; then
        _ai_error "Usage: ai_clear_bps <file>"
        return 1
    fi
    
    _ai_info "Removing all breakpoints in $file"
    local abs_path=$(readlink -f "$file" 2>/dev/null || echo "$file")
    local result
    result=$(_ai_debug_op "remove_all_breakpoints_in_file" "{\"filePath\":\"$abs_path\"}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Breakpoints removed"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to remove breakpoints${reason:+ — $reason}"
        return 1
    fi
}

# Quit debug session
# Usage: ai_quit
ai_quit() {
    _ai_info "Ending debug session..."
    local result
    result=$(_ai_debug_op "quit" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Debug session ended"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to quit session${reason:+ — $reason}"
        return 1
    fi
}

# Restart debug session
# Usage: ai_restart
ai_restart() {
    _ai_info "Restarting debug session..."
    local result
    result=$(_ai_debug_op "restart" "{}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Session restarted"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to restart session${reason:+ — $reason}"
        return 1
    fi
}

# Pretty print a variable
# Usage: ai_pretty <expression>
ai_pretty() {
    local expression=$1
    
    if [[ -z "$expression" ]]; then
        _ai_error "Usage: ai_pretty <expression>"
        return 1
    fi
    
    _ai_info "Pretty printing: $expression"
    local result
    result=$(_ai_debug_op "pretty_print" "{\"expression\":\"$expression\"}")
    
    if [[ $? -eq 0 ]]; then
        # If fields are present (struct/array), display expanded form; otherwise show raw value
        printf '%s' "$result" | jq 'if .data.fields then {
            name: .data.expression,
            type: .data.type,
            value: .data.result,
            fields: [.data.fields[]? | {name: .name, type: .type, value: .value}]
        } else (.data.result // .error) end'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to pretty print${reason:+ — $reason}"
        return 1
    fi
}

# Set a watchpoint (data breakpoint) on a variable
# Usage: ai_watch <varname> [read|write|readWrite]
ai_watch() {
    local varname=$1
    local access=${2:-write}

    if [[ -z "$varname" ]]; then
        _ai_error "Usage: ai_watch <varname> [read|write|readWrite]"
        return 1
    fi

    _ai_info "Setting $access watchpoint on: $varname"
    local result
    result=$(_ai_debug_op "watch" "{\"name\":\"$varname\",\"accessType\":\"$access\"}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Watchpoint set on '$varname' ($access)"
        printf '%s' "$result" | jq '{dataId: .data.dataId, accessType: .data.accessType}' 2>/dev/null
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to set watchpoint${reason:+ — $reason}"
        return 1
    fi
}

# Get type of expression
# Usage: ai_type <expression>
ai_type() {
    local expression=$1
    
    if [[ -z "$expression" ]]; then
        _ai_error "Usage: ai_type <expression>"
        return 1
    fi
    
    _ai_info "Getting type of: $expression"
    local result type_str

    # Try whatis first
    result=$(_ai_debug_op "whatis" "{\"expression\":\"$expression\"}")
    if [[ $? -eq 0 ]]; then
        type_str=$(printf '%s' "$result" | jq -r '.data.type // empty' 2>/dev/null)
    fi

    # Fallback: read type from get_stack_frame_variables (type field is always present there)
    if [[ -z "$type_str" ]]; then
        local vars_result
        vars_result=$(_ai_debug_op "get_stack_frame_variables" "{}")
        if [[ $? -eq 0 ]]; then
            type_str=$(printf '%s' "$vars_result" | jq -r --arg name "$expression" \
                '[.data.scopes[]?.variables[]? | select(.name == $name) | .type] | first // empty' 2>/dev/null)
        fi
    fi

    if [[ -n "$type_str" ]]; then
        echo "$type_str"
    else
        _ai_error "Failed to get type"
        return 1
    fi
}

# Get function arguments
# Usage: ai_args
ai_args() {
    _ai_info "Getting function arguments..."
    local result
    result=$(_ai_debug_op "get_args" "{}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '[.data.scopes[]? | .variables[]?] | if length == 0 then null else . end'
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get arguments${reason:+ — $reason}"
        return 1
    fi
}

# Jump to line
# Usage: ai_jump <line>
ai_jump() {
    local line=$1
    
    if [[ -z "$line" ]]; then
        _ai_error "Usage: ai_jump <line>"
        return 1
    fi
    
    _ai_info "Jumping to line $line"
    local result
    result=$(_ai_debug_op "jump" "{\"line\":$line}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Jumped to line $line"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to jump${reason:+ — $reason}"
        return 1
    fi
}

# Run until specific line (sets temp breakpoint)
# Usage: ai_until <line>
ai_until() {
    local line=$1
    
    if [[ -z "$line" ]]; then
        _ai_error "Usage: ai_until <line>"
        return 1
    fi
    
    _ai_info "Running until line $line"
    local result
    result=$(_ai_debug_op "until" "{\"line\":$line}")

    if [[ $? -eq 0 ]]; then
        _ai_success "Running until line $line"
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to set until breakpoint${reason:+ — $reason}"
        return 1
    fi
}

# List threads
# Usage: ai_threads
ai_threads() {
    _ai_info "Listing threads..."
    local result
    result=$(_ai_debug_op "list_threads" "{}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data'
    else
        _ai_error "Failed to list threads"
        return 1
    fi
}

# Switch to thread
# Usage: ai_switch_thread <threadId>
ai_switch_thread() {
    local thread_id=$1
    
    if [[ -z "$thread_id" ]]; then
        _ai_error "Usage: ai_switch_thread <threadId>"
        return 1
    fi
    
    _ai_info "Switching to thread $thread_id"
    _ai_debug_op "switch_thread" "{\"threadId\":$thread_id}"
    
    if [[ $? -eq 0 ]]; then
        _ai_success "Switched to thread $thread_id"
    else
        _ai_error "Failed to switch thread"
        return 1
    fi
}

# Get CPU registers
# Usage: ai_registers [frameId]
ai_registers() {
    local frame_id=$1
    local params="{}"
    
    if [[ -n "$frame_id" ]]; then
        params="{\"frameId\":$frame_id}"
    fi
    
    _ai_info "Getting registers..."
    local result
    result=$(_ai_debug_op "get_registers" "$params")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data'
    else
        _ai_error "Failed to get registers"
        return 1
    fi
}

# Read memory
# Usage: ai_read_memory <address> <count>
ai_read_memory() {
    local address=$1
    local count=${2:-16}
    
    if [[ -z "$address" ]]; then
        _ai_error "Usage: ai_read_memory <address> [count]"
        return 1
    fi
    
    _ai_info "Reading $count bytes at $address"
    local result
    result=$(_ai_debug_op "read_memory" "{\"memoryReference\":\"$address\",\"offset\":0,\"count\":$count}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data'
    else
        _ai_error "Failed to read memory"
        return 1
    fi
}

# Disassemble code
# Usage: ai_disasm <address> [count]
ai_disasm() {
    local address=$1
    local count=${2:-20}
    
    if [[ -z "$address" ]]; then
        _ai_error "Usage: ai_disasm <address> [count]"
        return 1
    fi
    
    _ai_info "Disassembling $count instructions at $address"
    local result
    result=$(_ai_debug_op "disassemble" "{\"memoryReference\":\"$address\",\"instructionCount\":$count}")
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq '.data'
    else
        _ai_error "Failed to disassemble"
        return 1
    fi
}

# Get document symbols (LSP)
# Usage: ai_symbols <file>
ai_symbols() {
    local file=$1
    
    if [[ -z "$file" ]]; then
        _ai_error "Usage: ai_symbols <file>"
        return 1
    fi
    
    _ai_info "Getting symbols in $file"
    local abs_path=$(readlink -f "$file" 2>/dev/null || echo "$file")
    local result
    result=$(curl -s "$AI_DEBUG_URL/api/symbols?fsPath=$abs_path" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        printf '%s' "$result" | jq 'if type == "object" then (.data // .) else . end'
    else
        _ai_error "Failed to get symbols"
        return 1
    fi
}

# Execute batched debug operations
# Usage: ai_batch <operations_json> [parallel]
ai_batch() {
    local ops=$1
    local parallel=${2:-false}
    
    if [[ -z "$ops" ]]; then
        _ai_error "Usage: ai_batch <operations_json> [parallel]"
        return 1
    fi
    
    _ai_info "Executing batch operations (parallel=$parallel)..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$AI_DEBUG_URL/api/debug/execute_batch" \
        -H "Content-Type: application/json" \
        -d "{\"operations\":$ops,\"parallel\":$parallel}" \
        --max-time "$AI_DEBUG_TIMEOUT" 2>/dev/null)
    
    local http_code
    http_code=$(printf '%s\n' "$response" | tail -n1)
    local body
    body=$(printf '%s\n' "$response" | head -n -1)

    if [[ "$http_code" -eq 200 ]]; then
        _ai_success "Batch operations completed"
        printf '%s' "$body" | jq '.data'
    else
        _ai_error "Batch operations failed (HTTP $http_code)"
        printf '%s' "$body" | jq '.' 2>/dev/null || printf '%s\n' "$body"
        return 1
    fi
}

# Print help
# Usage: ai_help
ai_help() {
    cat << EOF
AI VSCode Debug Proxy - CLI Helper Functions
=============================================

Usage:
  source ai-debug.sh
  ai_<command> [args]

Session Management:
  ai_status              Check if proxy is running
  ai_launch <prog>       Launch debug session
  ai_quit                End debug session
  ai_restart             Restart session
  ai_session_state       Get current session state (NEW)
  ai_set_context         Set thread/frame context (NEW)
  ai_context             Get full context snapshot (NEW)

Execution Control:
  ai_continue            Continue execution
  ai_next                Step over (next line)
  ai_step_in             Step into function
  ai_step_out            Step out of function
  ai_jump <line>         Jump to line
  ai_until <line>        Run until line

Breakpoints:
  ai_bp <file> <line> [cond]     Set breakpoint
  ai_tbp <file> <line>           Set temp breakpoint
  ai_bps                         List active breakpoints
  ai_clear_bps <file>            Remove all breakpoints in file

Inspection:
  ai_stack               Get stack trace
  ai_vars [frameId]      Get variables (all scopes)
  ai_locals [frameId]    Get only local variables & args
  ai_args                Get function arguments
  ai_source [lines]      List source code
  ai_eval [-a] <expr>    Evaluate expression (-a=auto-frame) (NEW)
  ai_pretty <expr>       Pretty print variable
  ai_type <expr>         Get type of expression
  ai_last_stop           Get last stop info
  ai_watch_suggest       Get variable watch suggestions (NEW)
  ai_watch_auto_enable   Enable auto-watch (NEW)
  ai_watch_auto_disable  Disable auto-watch (NEW)

Advanced:
  ai_threads             List threads
  ai_switch_thread <id>  Switch to thread
  ai_registers [frameId] Get CPU registers
  ai_read_memory <addr>  Read memory
  ai_disasm <addr>       Disassemble code
  ai_symbols <file>      Get document symbols (LSP)
  ai_batch <ops_json>    Execute batched operations

Environment Variables:
  AI_DEBUG_URL     Proxy URL (default: http://localhost:9999)
  AI_DEBUG_TIMEOUT Request timeout in seconds (default: 30)

Examples:
  source ai-debug.sh
  ai_status
  ai_launch ./build/app
  ai_bp main.c 42
  ai_continue
  ai_stack
  ai_eval "my_variable"
  ai_session_state
  ai_context --depth 5
  ai_context --include stack,variables
  ai_watch_suggest
  ai_watch_auto_enable
  ai_set_context --thread 1 --frame 0
  ai_quit

EOF
}

# Get session state (NEW: Smart Default Context)
# Usage: ai_session_state
ai_session_state() {
    _ai_info "Getting session state..."
    
    local response
    response=$(curl -s -X GET "$AI_DEBUG_URL/api/session/state" --max-time 5 2>/dev/null)
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$AI_DEBUG_URL/api/session/state" --max-time 5 2>/dev/null)
    
    if [[ "$http_code" -eq 000 ]]; then
        _ai_error "Cannot connect to debug proxy"
        return 1
    fi
    
    local success
    success=$(printf '%s' "$response" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        printf '%s' "$response" | jq .
    else
        local reason
        reason=$(printf '%s' "$response" | jq -r '.error // empty' 2>/dev/null)
        _ai_error "Failed to get session state${reason:+ — $reason}"
        return 1
    fi
}

# Get full context snapshot (NEW: Auto-Context Snapshot)
# Usage: ai_context [--depth N] [--include sections] [--format json|pretty]
ai_context() {
    local depth=""
    local include=""
    local format="pretty"
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            -d|--depth) depth="$2"; shift 2 ;;
            -i|--include) include="$2"; shift 2 ;;
            -f|--format) format="$2"; shift 2 ;;
            *) _ai_error "Unknown option: $1"; return 1 ;;
        esac
        shift
    done
    
    _ai_info "Getting context snapshot (depth=$depth, include=$include)..."
    
    # Build query string
    local query_params=""
    if [[ -n "$depth" ]]; then
        query_params="depth=$depth"
    fi
    if [[ -n "$include" ]]; then
        if [[ -n "$query_params" ]]; then
            query_params="$query_params&include=$include"
        else
            query_params="include=$include"
        fi
    fi
    
    local url="$AI_DEBUG_URL/api/context"
    if [[ -n "$query_params" ]]; then
        url="$url?$query_params"
    fi
    
    local response
    response=$(curl -s -X GET "$url" --max-time 30 2>/dev/null)
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30 2>/dev/null)
    
    if [[ "$http_code" -eq 000 ]]; then
        _ai_error "Cannot connect to debug proxy"
        return 1
    fi
    
    local success
    success=$(printf '%s' "$response" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        if [[ "$format" == "pretty" ]]; then
            printf '%s' "$response" | jq .
        else
            printf '%s' "$response"
        fi
        
        # Show metadata
        local latency
        latency=$(printf '%s' "$response" | jq -r '.data.metadata.latencyMs // "N/A"')
        _ai_success "Context retrieved in ${latency}ms"
    else
        local reason
        reason=$(printf '%s' "$response" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get context${reason:+ — $reason}"
        return 1
    fi
}

# Get variable watch suggestions (NEW: Heuristic Watch Suggestions)
# Usage: ai_watch_suggest
ai_watch_suggest() {
    _ai_info "Getting watch suggestions..."
    
    local url="$AI_DEBUG_URL/api/watch/suggest"
    local response
    response=$(curl -s -X GET "$url" --max-time 30 2>/dev/null)
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30 2>/dev/null)
    
    if [[ "$http_code" -eq 000 ]]; then
        _ai_error "Cannot connect to debug proxy"
        return 1
    fi
    
    local success
    success=$(printf '%s' "$response" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        printf '%s' "$response" | jq .
        
        # Show summary
        local high_count medium_count low_count
        high_count=$(printf '%s' "$response" | jq -r '.data.metadata.highRiskCount // 0')
        medium_count=$(printf '%s' "$response" | jq -r '.data.metadata.mediumRiskCount // 0')
        low_count=$(printf '%s' "$response" | jq -r '.data.metadata.lowRiskCount // 0')
        
        _ai_info "Suggestions: ${high_count} high, ${medium_count} medium, ${low_count} low risk"
        
        # Show auto-watch variables
        local auto_watch
        auto_watch=$(printf '%s' "$response" | jq -r '.data.autoWatch[]?' 2>/dev/null)
        if [[ -n "$auto_watch" ]]; then
            _ai_info "Auto-watch variables:"
            echo "$auto_watch"
        fi
    else
        local reason
        reason=$(printf '%s' "$response" | jq -r '.error // .data.errorMessage // empty' 2>/dev/null)
        _ai_error "Failed to get suggestions${reason:+ — $reason}"
        return 1
    fi
}

# Enable auto-watch (placeholder)
# Usage: ai_watch_auto_enable
ai_watch_auto_enable() {
    _ai_info "Enabling auto-watch..."
    
    local response
    response=$(curl -s -X POST "$AI_DEBUG_URL/api/watch/auto" \
        -H "Content-Type: application/json" \
        --max-time 5 2>/dev/null)
    
    local success
    success=$(printf '%s' "$response" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        _ai_success "Auto-watch enabled"
        printf '%s' "$response" | jq .
    else
        _ai_error "Failed to enable auto-watch"
        return 1
    fi
}

# Disable auto-watch (placeholder)
# Usage: ai_watch_auto_disable
ai_watch_auto_disable() {
    _ai_info "Disabling auto-watch..."
    
    local response
    response=$(curl -s -X DELETE "$AI_DEBUG_URL/api/watch/auto" --max-time 5 2>/dev/null)
    
    local success
    success=$(printf '%s' "$response" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        _ai_success "Auto-watch disabled"
        printf '%s' "$response" | jq .
    else
        _ai_error "Failed to disable auto-watch"
        return 1
    fi
}

# List watched variables (placeholder)
# Usage: ai_watch_list
ai_watch_list() {
    _ai_info "Listing watched variables (not implemented)"
    _ai_warn "Auto-watch list not yet implemented"
}

# Set session context (NEW: Smart Default Context)
# Usage: ai_set_context [--thread <id>] [--frame <id>]
ai_set_context() {
    local thread_id=""
    local frame_id=""
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --thread) thread_id="$2"; shift 2 ;;
            --frame) frame_id="$2"; shift 2 ;;
            *) _ai_error "Unknown option: $1"; return 1 ;;
        esac
    done
    
    if [[ -z "$thread_id" && -z "$frame_id" ]]; then
        _ai_error "Usage: ai_set_context [--thread <id>] [--frame <id>]"
        return 1
    fi
    
    _ai_info "Setting session context (thread=$thread_id, frame=$frame_id)..."
    
    local params="{}"
    if [[ -n "$thread_id" ]]; then
        params=$(printf '%s' "$params" | jq --argjson t "$thread_id" '. + {threadId: $t}')
    fi
    if [[ -n "$frame_id" ]]; then
        params=$(printf '%s' "$params" | jq --argjson f "$frame_id" '. + {frameId: $f}')
    fi
    
    local result
    result=$(curl -s -X POST "$AI_DEBUG_URL/api/session/set_context" \
        -H "Content-Type: application/json" \
        -d "$params" \
        --max-time 5 2>/dev/null)
    
    local success
    success=$(printf '%s' "$result" | jq -r '.success // empty' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        _ai_success "Session context updated"
        printf '%s' "$result" | jq .
    else
        local reason
        reason=$(printf '%s' "$result" | jq -r '.error // empty' 2>/dev/null)
        _ai_error "Failed to set context${reason:+ — $reason}"
        return 1
    fi
}

# Alias help to -h
ai_h() { ai_help; }

#-------------------------------------------------------------------------------
# Auto-check on source (optional)
#-------------------------------------------------------------------------------

# Uncomment to auto-check proxy on source:
# _ai_check_proxy || _ai_warn "Debug proxy not running at $AI_DEBUG_URL"

#-------------------------------------------------------------------------------
# End of ai-debug.sh
#-------------------------------------------------------------------------------
