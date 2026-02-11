"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface FeedbackCardProps {
  selectedLGA: LGA | null;
}

export function FeedbackCard({ selectedLGA }: FeedbackCardProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      setErrorMessage('Please enter your feedback');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback.trim(),
          selectedLGA: selectedLGA?.name || null,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      setFeedback('');

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50 hover:ring-2 hover:ring-primary/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">Feedback</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Share your thoughts, report bugs, or suggest improvements
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What's on your mind? Tell us about bugs, feature requests, or anything else..."
              className="w-full h-32 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {selectedLGA && (
                <span className="text-primary">Current LGA: {selectedLGA.name}</span>
              )}
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Thank you for your feedback!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your feedback has been categorized, prioritized, and sent to the team.
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Failed to submit feedback
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Feedback
              </>
            )}
          </button>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            Feedback is analyzed by AI and sent to bgellie@mecone.com.au
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
