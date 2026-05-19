#!/bin/bash
# ============================================
# UIMS Auto-Recovery Wrapper for Claude Code
# ============================================
# This script monitors Claude Code and automatically:
#   1. Detects 400/context-too-large errors
#   2. Saves all uncommitted work to GitHub
#   3. Restarts Claude Code with a fresh context
#   4. Feeds it a resume prompt so it continues where it left off
#
# Usage:
#   chmod +x claude-auto.sh
#   ./claude-auto.sh
# ============================================

PROJECT_DIR="/Users/jinzhou/Documents/Project/Work/UniversityProgram"
LOG_FILE="$PROJECT_DIR/.claude-auto.log"
ERROR_COUNT=0
MAX_ERRORS_BEFORE_RESTART=3
SESSION_COUNT=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

save_to_github() {
    log "${YELLOW}💾 Auto-saving all work to GitHub...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if there are any changes to commit
    if [ -n "$(git status --porcelain)" ]; then
        git add .
        git commit -m "chore: auto-save before session restart (session #$SESSION_COUNT)"
        git push
        log "${GREEN}✅ All work saved to GitHub successfully.${NC}"
    else
        log "${GREEN}✅ Working tree is clean — nothing to save.${NC}"
    fi
}

generate_resume_prompt() {
    cat << 'PROMPT'
Read CLAUDE.md, then read .planning/STATE.md to see current progress.
Resume work on the next uncompleted active task from STATE.md.
After completing each task, update STATE.md and push to GitHub.
PROMPT
}

run_claude_session() {
    SESSION_COUNT=$((SESSION_COUNT + 1))
    log "${GREEN}🚀 Starting Claude Code session #$SESSION_COUNT${NC}"
    
    cd "$PROJECT_DIR"
    
    # Create the resume prompt
    RESUME_PROMPT=$(generate_resume_prompt)
    
    if [ $SESSION_COUNT -eq 1 ]; then
        # First session — let user interact normally in foreground
        claude
        EXIT_CODE=$?
    else
        # Restart session — feed resume prompt automatically using -p argument
        log "${CYAN}📋 Feeding resume prompt to Claude Code...${NC}"
        claude -p "$RESUME_PROMPT"
        EXIT_CODE=$?
    fi
    
    return $EXIT_CODE
}

monitor_and_restart() {
    log "${GREEN}============================================${NC}"
    log "${GREEN}  UIMS Auto-Recovery System Started${NC}"
    log "${GREEN}  Project: $PROJECT_DIR${NC}"
    log "${GREEN}============================================${NC}"
    
    while true; do
        run_claude_session
        EXIT_CODE=$?
        
        # Always save work after a session ends
        save_to_github
        
        if [ $EXIT_CODE -eq 0 ]; then
            log "${GREEN}✅ Claude Code exited cleanly.${NC}"
            
            # Ask user if they want to restart
            echo ""
            echo -e "${YELLOW}Claude Code session ended. What would you like to do?${NC}"
            echo "  1) Start a new session (resume from STATE.md)"
            echo "  2) Exit"
            echo ""
            read -p "Choice [1/2]: " choice
            
            case $choice in
                1)
                    log "User chose to restart."
                    continue
                    ;;
                *)
                    log "User chose to exit."
                    break
                    ;;
            esac
        else
            log "${RED}⚠️  Claude Code exited with error code $EXIT_CODE${NC}"
            log "${YELLOW}🔄 Auto-restarting in 5 seconds... (Ctrl+C to cancel)${NC}"
            sleep 5
            continue
        fi
    done
    
    log "${GREEN}Auto-recovery system shut down.${NC}"
}

# Start the proxy server in the background
PROXY_SCRIPT="/Users/jinzhou/Documents/Project/.claude/proxy.js"
if [ -f "$PROXY_SCRIPT" ]; then
    log "${CYAN}Starting API Key Rotation Proxy...${NC}"
    node "$PROXY_SCRIPT" &
    PROXY_PID=$!
    # Give proxy a second to start
    sleep 1
else
    log "${RED}Proxy script not found at $PROXY_SCRIPT!${NC}"
    exit 1
fi

# Cleanup function to kill proxy and save work
cleanup() {
    log "${YELLOW}Caught interrupt. Shutting down proxy and saving work...${NC}"
    if [ -n "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null
    fi
    save_to_github
    exit 0
}

# Trap Ctrl+C to save work before exiting
trap cleanup INT TERM

# Start the monitor
monitor_and_restart
