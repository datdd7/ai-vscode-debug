#!/bin/bash
#===============================================================================
# File:        ai-debug-ai.sh (AI-optimized version)
#
# Description: Pure JSON output CLI for AI VSCode Debug Proxy
#
#              ALL output is pure JSON - NO colors, NO messages
#              Perfect for AI agents to parse responses
#
# Usage:       source ai-debug-ai.sh
#              ai_launch "./build/app" | jq '.data.sessionId'
#              ai_eval "my_var" | jq '.data.result'
#
# Environment: AI_DEBUG_URL (default: http://localhost:9999)
#
#===============================================================================

AI_DEBUG_URL="${AI_DEBUG_URL:-http://localhost:9999}"
AI_DEBUG_TIMEOUT="${AI_DEBUG_TIMEOUT:-30}"

# Execute debug operation - Pure JSON output
_ai_op() {
    local op=$1
    local params=${2:-"{}"}
    
    curl -s -X POST "$AI_DEBUG_URL/api/debug" \
        -H "Content-Type: application/json" \
        -d "{\"operation\":\"$op\",\"params\":$params}" \
        --max-time "$AI_DEBUG_TIMEOUT"
}

# Launch debug session
ai_launch() {
    local program=$1
    local stop=${2:-false}
    _ai_op "launch" "{\"program\":\"$program\",\"stopOnEntry\":$stop}"
}

# Continue execution
ai_continue() {
    _ai_op "continue"
}

# Step over
ai_next() {
    _ai_op "next"
}

# Step into
ai_step_in() {
    _ai_op "step_in"
}

# Step out
ai_step_out() {
    _ai_op "step_out"
}

# Set breakpoint
ai_bp() {
    local file=$1
    local line=$2
    _ai_op "set_breakpoint" "{\"location\":{\"path\":\"$file\",\"line\":$line}}"
}

# Evaluate expression
ai_eval() {
    local expr=$1
    _ai_op "evaluate" "{\"expression\":\"$expr\"}"
}

# Get stack trace
ai_stack() {
    _ai_op "stack_trace" "{}"
}

# Get variables
ai_vars() {
    local frame=${1:-0}
    _ai_op "get_stack_frame_variables" "{\"frameId\":$frame}"
}

# Get session state
ai_state() {
    curl -s "$AI_DEBUG_URL/api/session/state"
}

# Get full context
ai_context() {
    curl -s "$AI_DEBUG_URL/api/context"
}

# Get scope preview
ai_scope() {
    _ai_op "get_scope_preview" "{}"
}

# Discover globals
ai_discover() {
    curl -s "$AI_DEBUG_URL/api/discover/globals"
}

# Watch suggestions
ai_watch() {
    curl -s "$AI_DEBUG_URL/api/watch/suggest"
}

# Get watch changes
ai_changes() {
    curl -s "$AI_DEBUG_URL/api/watch/changes"
}

# Quit session
ai_quit() {
    _ai_op "quit" "{}"
}

# Check proxy status
ai_status() {
    curl -s "$AI_DEBUG_URL/api/ping"
}
