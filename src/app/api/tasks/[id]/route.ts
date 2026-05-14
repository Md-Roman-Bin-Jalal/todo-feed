import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSupabaseServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { updateTaskSchema } from "@/lib/tasks/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validationErrorResponse(error: ZodError) {
  return errorResponse(error.issues[0]?.message ?? "Invalid task data.", 400);
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.userId) {
    return errorResponse(auth.error ?? "Unauthorized.", auth.status);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = updateTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const { id } = await context.params;
  const nextValues = {
    ...parsed.data,
    completed_at:
      parsed.data.status === "completed"
        ? new Date().toISOString()
        : parsed.data.status === "pending"
          ? null
          : undefined,
  };
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(nextValues)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return errorResponse("Failed to update task.", 500);
  }

  if (!data) {
    return errorResponse("Task not found.", 404);
  }

  return NextResponse.json({ task: data }, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.userId) {
    return errorResponse(auth.error ?? "Unauthorized.", auth.status);
  }

  const { id } = await context.params;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse("Failed to delete task.", 500);
  }

  if (!data) {
    return errorResponse("Task not found.", 404);
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
