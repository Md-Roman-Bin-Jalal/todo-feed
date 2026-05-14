"use client";

import type { FormEvent, ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type AuthStatus = "idle" | "loading";

type OrbitAuthGateProps = {
  children: ReactNode;
};

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function OrbitAuthGate({ children }: OrbitAuthGateProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let supabase: SupabaseClient;

    try {
      supabase = createSupabaseBrowserClient();
      supabaseRef.current = supabase;
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setIsCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setMessage(error.message);
      }

      setSession(data.session);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const validateForm = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return "Email is required.";
    }

    if (!trimmedEmail.includes("@")) {
      return "Enter a valid email address.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  };

  const handlePasswordAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = supabaseRef.current;

    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setStatus("loading");
    setMessage("");

    const credentials = {
      email: email.trim(),
      password,
    };

    const { data, error } =
      authMode === "login"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setStatus("idle");

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      return;
    }

    setMessage("Check your email to confirm signup, then log in.");
  };

  const handleGuestLogin = async () => {
    const supabase = supabaseRef.current;

    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { data, error } = await supabase.auth.signInAnonymously();

    setStatus("idle");

    if (error) {
      setMessage(error.message);
      return;
    }

    setSession(data.session);
  };

  if (isCheckingSession) {
    return (
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1120px] items-center justify-center px-4 py-6 text-cyan-50">
        Entering orbit...
      </main>
    );
  }

  if (session) {
    return children;
  }

  const isLoading = status === "loading";
  const modeLabel = authMode === "login" ? "Log in" : "Sign up";

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1120px] items-center justify-center px-4 py-6 lg:px-8">
      <section className="w-full max-w-[390px] rounded-[8px] border border-cyan-100/15 bg-[#07101e]/90 px-5 py-6 shadow-[0_0_32px_rgba(103,232,249,0.12)] md:max-w-[460px] md:px-7">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">
            Orbit access
          </p>
          <h1 className="mt-3 text-2xl font-bold text-cyan-50 md:text-3xl">
            Enter your task orbit
          </h1>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-[8px] border border-cyan-100/10 bg-white/[0.03] p-1">
          <button
            className="rounded-[6px] px-3 py-2 text-sm font-semibold text-cyan-100/60 transition data-[active=true]:bg-cyan-100 data-[active=true]:text-[#07101e]"
            data-active={authMode === "login"}
            onClick={() => {
              setAuthMode("login");
              setMessage("");
            }}
            type="button"
          >
            Login
          </button>
          <button
            className="rounded-[6px] px-3 py-2 text-sm font-semibold text-cyan-100/60 transition data-[active=true]:bg-cyan-100 data-[active=true]:text-[#07101e]"
            data-active={authMode === "signup"}
            onClick={() => {
              setAuthMode("signup");
              setMessage("");
            }}
            type="button"
          >
            Signup
          </button>
        </div>

        <form className="space-y-4" onSubmit={handlePasswordAuth}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-cyan-50/75">
              Email
            </span>
            <input
              autoComplete="email"
              className="h-12 w-full rounded-[8px] border border-cyan-100/15 bg-[#050813] px-4 text-base text-cyan-50 outline-none transition placeholder:text-cyan-100/30 focus:border-cyan-100/65"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-cyan-50/75">
              Password
            </span>
            <input
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              className="h-12 w-full rounded-[8px] border border-cyan-100/15 bg-[#050813] px-4 text-base text-cyan-50 outline-none transition placeholder:text-cyan-100/30 focus:border-cyan-100/65"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              type="password"
              value={password}
            />
          </label>

          {message ? (
            <p className="rounded-[8px] border border-cyan-100/15 bg-cyan-100/10 px-3 py-2 text-sm text-cyan-50">
              {message}
            </p>
          ) : null}

          <button
            className="h-12 w-full rounded-[8px] border border-cyan-100/20 bg-cyan-100 text-sm font-bold text-[#07101e] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Please wait..." : modeLabel}
          </button>
        </form>

        <button
          className="mt-3 h-12 w-full rounded-[8px] border border-cyan-100/20 bg-transparent text-sm font-bold text-cyan-50 transition hover:border-cyan-100/55 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleGuestLogin}
          type="button"
        >
          Continue as guest
        </button>
      </section>
    </main>
  );
}
