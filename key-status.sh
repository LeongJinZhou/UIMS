#!/bin/bash
# ============================================
# UIMS API Key Status Dashboard
# ============================================
# Shows the status of all OpenRouter API keys:
#   - Which keys are valid / invalid
#   - Current usage and limits
#   - Which key is currently active in the proxy
#   - Rate limit / refresh info
#
# Usage:
#   chmod +x key-status.sh
#   ./key-status.sh
# ============================================

CONFIG_FILE="/Users/jinzhou/Documents/Project/.claude/api_keys.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Read the config
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: $CONFIG_FILE not found.${NC}"
    exit 1
fi

CURRENT_INDEX=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['currentIndex'])" 2>/dev/null || echo "0")
KEYS=$(python3 -c "
import json
data = json.load(open('$CONFIG_FILE'))
for k in data['keys']:
    print(k)
" 2>/dev/null)

if [ -z "$KEYS" ]; then
    echo -e "${RED}Error: Could not read keys from config.${NC}"
    exit 1
fi

# Count keys
TOTAL_KEYS=$(echo "$KEYS" | wc -l | tr -d ' ')

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║         UIMS — OpenRouter API Key Status Dashboard          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Checked at: $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
echo -e "${DIM}Config: $CONFIG_FILE${NC}"
echo -e "${DIM}Total keys: $TOTAL_KEYS | Active key index: $CURRENT_INDEX${NC}"
echo ""
echo -e "${BOLD}─────────────────────────────────────────────────────────────────${NC}"
printf "${BOLD}%-4s %-18s %-8s %-10s %-10s %-8s %s${NC}\n" "#" "Key (prefix)" "Status" "Usage" "Limit" "Tier" "Note"
echo -e "${BOLD}─────────────────────────────────────────────────────────────────${NC}"

VALID_COUNT=0
INVALID_COUNT=0
FRESH_COUNT=0
USED_COUNT=0
INDEX=0

while IFS= read -r key; do
    # Get key prefix for display
    KEY_PREFIX="${key:0:20}..."
    
    # Query OpenRouter auth endpoint
    response=$(curl -s -w "\n%{http_code}" \
        https://openrouter.ai/api/v1/auth/key \
        -H "Authorization: Bearer $key" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    # Determine if this is the active key
    if [ "$INDEX" -eq "$CURRENT_INDEX" ]; then
        ACTIVE_MARKER="→ "
    else
        ACTIVE_MARKER="  "
    fi
    
    if [ "$http_code" -eq 200 ]; then
        # Parse response
        usage=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('usage',0))" 2>/dev/null || echo "?")
        limit=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; l=d.get('limit',None); print(l if l else 'unlimited')" 2>/dev/null || echo "?")
        is_free=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('is_free_tier',False))" 2>/dev/null || echo "?")
        rate_limit=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; r=d.get('rate_limit',{}); print(f\"{r.get('requests',0)}/{r.get('interval','?')}\" if r else 'N/A')" 2>/dev/null || echo "N/A")
        
        VALID_COUNT=$((VALID_COUNT + 1))
        
        # Determine tier label
        if [ "$is_free" = "True" ]; then
            TIER="Free"
        else
            TIER="Paid"
        fi
        
        # Determine usage status
        NOTE=""
        if [ "$usage" = "0" ] || [ "$usage" = "0.0" ]; then
            STATUS_COLOR="${GREEN}"
            STATUS="✅ OK"
            FRESH_COUNT=$((FRESH_COUNT + 1))
            NOTE="Fresh"
        else
            STATUS_COLOR="${YELLOW}"
            STATUS="✅ OK"
            USED_COUNT=$((USED_COUNT + 1))
            NOTE="Used"
        fi
        
        # Mark active key
        if [ "$INDEX" -eq "$CURRENT_INDEX" ]; then
            NOTE="${NOTE} ${MAGENTA}[ACTIVE]${NC}"
        fi
        
        printf "${ACTIVE_MARKER}${STATUS_COLOR}%-4s %-18s %-8s %-10s %-10s %-8s %b${NC}\n" \
            "$INDEX" "$KEY_PREFIX" "$STATUS" "\$$usage" "$limit" "$TIER" "$NOTE"
    else
        INVALID_COUNT=$((INVALID_COUNT + 1))
        NOTE="Revoked/Expired"
        if [ "$INDEX" -eq "$CURRENT_INDEX" ]; then
            NOTE="${NOTE} ${RED}[ACTIVE!]${NC}"
        fi
        printf "${ACTIVE_MARKER}${RED}%-4s %-18s %-8s %-10s %-10s %-8s %b${NC}\n" \
            "$INDEX" "$KEY_PREFIX" "❌ DEAD" "-" "-" "-" "$NOTE"
    fi
    
    INDEX=$((INDEX + 1))
    sleep 0.3
done <<< "$KEYS"

echo -e "${BOLD}─────────────────────────────────────────────────────────────────${NC}"
echo ""

# Summary
echo -e "${BOLD}Summary:${NC}"
echo -e "  ${GREEN}✅ Valid:${NC}   $VALID_COUNT / $TOTAL_KEYS"
echo -e "  ${RED}❌ Invalid:${NC} $INVALID_COUNT / $TOTAL_KEYS"
echo -e "  ${GREEN}🆕 Fresh (unused):${NC}  $FRESH_COUNT"
echo -e "  ${YELLOW}📊 Used:${NC}            $USED_COUNT"
echo ""

# Rate limit refresh info
echo -e "${BOLD}Rate Limit Info:${NC}"
echo -e "  ${CYAN}• OpenRouter free tier resets:${NC} Daily at ${BOLD}00:00 UTC${NC} (08:00 AM MYT)"
echo -e "  ${CYAN}• Free tier daily limit:${NC}      ~200 requests/day or \$0 credit budget"
echo -e "  ${CYAN}• Per-key rate limit:${NC}          ~20 requests/minute (free tier)"
echo ""

# Recommendation
if [ "$FRESH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${BOLD}✅ You have $FRESH_COUNT fresh keys available.${NC}"
else
    echo -e "${YELLOW}${BOLD}⚠️  All keys have been used today. They will refresh at 00:00 UTC (08:00 AM MYT).${NC}"
fi

# Calculate time until next refresh
CURRENT_HOUR=$(TZ=UTC date +%H)
CURRENT_MIN=$(TZ=UTC date +%M)
HOURS_LEFT=$(( 23 - CURRENT_HOUR ))
MINS_LEFT=$(( 60 - CURRENT_MIN ))
if [ $MINS_LEFT -eq 60 ]; then
    MINS_LEFT=0
    HOURS_LEFT=$((HOURS_LEFT + 1))
fi
echo -e "${DIM}  Next refresh in approximately ${HOURS_LEFT}h ${MINS_LEFT}m (at 00:00 UTC / 08:00 AM MYT)${NC}"
echo ""
