import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSupabaseServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createTaskSchema } from "@/lib/tasks/validation";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validationErrorResponse(error: ZodError) {
  return errorResponse(error.issues[0]?.message ?? "Invalid task data.", 400);
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);

  if (!auth.userId) {
    return errorResponse(auth.error ?? "Unauthorized.", auth.status);
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("Failed to load tasks.", 500);
  }

  return NextResponse.json({ tasks: data }, { status: 200 });
}

export async function POST(request: Request) {
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

  const parsed = createTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...parsed.data,
      user_id: auth.userId,
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse("Failed to create task.", 500);
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
