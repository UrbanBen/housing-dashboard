#!/bin/bash

# Feedback Monthly Summary Cron Job Setup Script
# This script adds a monthly cron job to send feedback summary email on the 1st of each month at 9 AM

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$HOME/.local/log"
LOG_FILE="$LOG_DIR/feedback-summary.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Cron job command - Run on 1st of each month at 9:00 AM
CRON_COMMAND="0 9 1 * * cd $PROJECT_DIR && /usr/local/bin/node scripts/send-monthly-feedback-summary.js >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "send-monthly-feedback-summary"; then
  echo "❌ Feedback summary cron job already exists"
  echo ""
  echo "Current cron jobs:"
  crontab -l | grep "send-monthly-feedback-summary"
  echo ""
  echo "To remove it, run: crontab -e"
  exit 1
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
  echo "✓ Feedback summary cron job added successfully"
  echo ""
  echo "Schedule: 1st of each month at 9:00 AM"
  echo "Script: $PROJECT_DIR/scripts/send-monthly-feedback-summary.js"
  echo "Logs: $LOG_FILE"
  echo ""
  echo "To view logs:"
  echo "  tail -f $LOG_FILE"
  echo ""
  echo "To test manually:"
  echo "  node $PROJECT_DIR/scripts/send-monthly-feedback-summary.js"
  echo ""
  echo "To remove cron job:"
  echo "  crontab -e"
  echo "  (delete the line containing 'send-monthly-feedback-summary.js')"
else
  echo "❌ Failed to add cron job"
  exit 1
fi
