"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
}

interface PlanCommentsProps {
  planItemId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============================================================================
// PlanComments
// ============================================================================

export function PlanComments({ planItemId }: PlanCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const body = newComment.trim();
    if (!body) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/planner/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planItemId, body }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const data = await res.json().catch(() => null);

      // Add comment to local state
      setComments((prev) => [
        ...prev,
        {
          id: data?.id ?? crypto.randomUUID(),
          authorId: data?.authorId ?? "me",
          authorName: data?.authorName ?? "You",
          authorInitials: data?.authorInitials ?? "YO",
          body,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewComment("");
    } catch {
      // Allow optimistic local addition on API failure
      setComments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          authorId: "me",
          authorName: "You",
          authorInitials: "YO",
          body,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, planItemId]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await fetch("/api/planner/comments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planItemId, commentId }),
        });
      } catch {
        // Continue with optimistic removal
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [planItemId]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Comments ({comments.length})
        </span>
      </div>

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 group">
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback className="text-[10px]">
                  {comment.authorInitials ||
                    getInitials(comment.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {comment.authorName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                  {comment.authorId === "me" && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 break-words">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          No comments yet. Start the discussion below.
        </p>
      )}

      {/* New comment input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
