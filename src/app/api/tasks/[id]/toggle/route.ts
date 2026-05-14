import { NextResponse } from "next/server";

import { createSupabaseServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.userId) {
    return errorResponse(auth.error ?? "Unauthorized.", auth.status);
  }

  const { id } = await context.params;
  const supabase = createSupabaseServiceClient();
  const { data: currentTask, error: readError } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (readError) {
    return errorResponse("Failed to read task.", 500);
  }

  if (!currentTask) {
    return errorResponse("Task not found.", 404);
  }

  const nextStatus =
    currentTask.status === "completed" ? "pending" : "completed";
  const { data, error } = await supabase
    .from("tasks")
    .update({
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      status: nextStatus,
    })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) {
    return errorResponse("Failed to toggle task.", 500);
  }

  return NextResponse.json({ task: data }, { status: 200 });
}
