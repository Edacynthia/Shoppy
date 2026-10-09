import "react-native-url-polyfill/auto";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export const redirectUri = makeRedirectUri({
  scheme: "shoppy",
  path: "auth/callback",
});

export type AuthResult = {
  user: User | null;
  error: string | null;
  message?: string;
  cancelled?: boolean;
};

function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email using the link we sent you, then sign in.";
  }
  if (normalized.includes("already registered") || normalized.includes("user already")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many attempts. Please wait a little and try again.";
  }
  if (normalized.includes("network request failed") || normalized.includes("fetch failed")) {
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }

  return message || "Something went wrong. Please try again.";
}

export function friendlyAuthError(error: unknown): string {
  return authErrorMessage(error);
}

export async function completeAuthFromUrl(url: string) {
  const parsed = new URL(url);
  const query = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const getParam = (name: string) => query.get(name) ?? fragment.get(name);
  const authError = getParam("error_description") ?? getParam("error");

  if (authError) {
    throw new Error(authError);
  }

  const type = getParam("type");
  const code = getParam("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { user: data.user, type };
  }

  const accessToken = getParam("access_token");
  const refreshToken = getParam("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return { user: data.user, type };
  }

  const tokenHash = getParam("token_hash");
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw error;
    return { user: data.user, type };
  }

  throw new Error("This sign-in link is incomplete or has expired. Request a new link and try again.");
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("The sign-in service did not return an authorization URL.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== "success" || !result.url) {
      return {
        user: null,
        error: null,
        cancelled: result.type === "cancel" || result.type === "dismiss",
      };
    }

    const { user } = await completeAuthFromUrl(result.url);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: authErrorMessage(error) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: authErrorMessage(error) };
  }
}

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUri },
    });
    if (error) throw error;

    return {
      user: data.user,
      error: null,
      message: data.session
        ? "Your account is ready."
        : "Check your inbox for a confirmation link. It will return you to the app.",
    };
  } catch (error) {
    return { user: null, error: authErrorMessage(error) };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUri,
    });
    if (error) throw error;
    return {
      user: null,
      error: null,
      message: "If an account exists for that email, a password-reset link is on its way.",
    };
  } catch (error) {
    return { user: null, error: authErrorMessage(error) };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? authErrorMessage(error) : null };
  } catch (error) {
    return { error: authErrorMessage(error) };
  }
}
