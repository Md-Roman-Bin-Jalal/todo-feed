export type TaskStatus = "pending" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority | "";
  due_date: string;
};
