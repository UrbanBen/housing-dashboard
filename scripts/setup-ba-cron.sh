#!/bin/bash

# BA Aggregation Cron Job Setup Script
# This script adds a weekly cron job to run BA aggregation every Sunday at 3 AM

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$HOME/.local/log"
LOG_FILE="$LOG_DIR/ba-aggregation.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Cron job command
CRON_COMMAND="0 3 * * 0 cd $PROJECT_DIR && /usr/local/bin/node scripts/aggregate-ba-comprehensive.js >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "aggregate-ba-comprehensive"; then
  echo "❌ BA aggregation cron job already exists"
  echo ""
  echo "Current cron jobs:"
  crontab -l | grep "aggregate-ba-comprehensive"
  echo ""
  echo "To remove it, run: crontab -e"
  exit 1
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
  echo "✓ BA aggregation cron job added successfully"
  echo ""
  echo "Schedule: Every Sunday at 3:00 AM"
  echo "Script: $PROJECT_DIR/scripts/aggregate-ba-comprehensive.js"
  echo "Logs: $LOG_FILE"
  echo ""
  echo "To view logs:"
  echo "  tail -f $LOG_FILE"
  echo ""
  echo "To test manually:"
  echo "  node $PROJECT_DIR/scripts/aggregate-ba-comprehensive.js"
  echo ""
  echo "To remove cron job:"
  echo "  crontab -e"
  echo "  (delete the line containing 'aggregate-ba-comprehensive.js')"
else
  echo "❌ Failed to add cron job"
  exit 1
fi
