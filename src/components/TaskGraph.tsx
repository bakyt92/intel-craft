import type { TaskNode } from "@/orchestrator/types";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-accent text-foreground animate-pulse",
  success: "bg-primary text-primary-foreground",
  error: "bg-destructive text-destructive-foreground",
  skipped: "bg-secondary text-secondary-foreground",
};

export const TaskGraph = ({ nodes }: { nodes: TaskNode[] }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {nodes.map((n) => (
        <div key={n.id} className="rounded-lg border p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{n.label}</h4>
            <Badge className={statusStyles[n.status] || ''}>{n.status}</Badge>
          </div>
          {n.detail && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
};
