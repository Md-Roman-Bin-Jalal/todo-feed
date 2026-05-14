import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Task, TaskDraft } from "@/lib/tasks/types";

type ApiErrorBody = {
  error?: string;
};

async function getAuthHeaders() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Please log in again.");
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function readJsonError(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  return body?.error ?? "Task request failed.";
}

function createPayloadFromDraft(draft: TaskDraft) {
  return {
    ...(draft.description.trim()
      ? { description: draft.description.trim() }
      : {}),
    ...(draft.due_date ? { due_date: draft.due_date } : {}),
    ...(draft.priority ? { priority: draft.priority } : {}),
    title: draft.title.trim(),
  };
}

function updatePayloadFromDraft(draft: TaskDraft) {
  return {
    description: draft.description.trim() || null,
    due_date: draft.due_date || null,
    priority: draft.priority || null,
    title: draft.title.trim(),
  };
}

export async function loadTasks() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/tasks", {
    headers,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const body = (await response.json()) as { tasks: Task[] };

  return body.tasks;
}

export async function createTask(draft: TaskDraft) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/tasks", {
    body: JSON.stringify(createPayloadFromDraft(draft)),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const body = (await response.json()) as { task: Task };

  return body.task;
}

export async function updateTask(id: string, draft: TaskDraft) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/tasks/${id}`, {
    body: JSON.stringify(updatePayloadFromDraft(draft)),
    headers,
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const body = (await response.json()) as { task: Task };

  return body.task;
}

export async function toggleTaskStatus(id: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/tasks/${id}/toggle`, {
    headers,
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const body = (await response.json()) as { task: Task };

  return body.task;
}

export async function deleteTask(id: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/tasks/${id}`, {
    headers,
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }
}
