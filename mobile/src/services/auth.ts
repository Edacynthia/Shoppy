import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

// Deep link redirect URI (e.g. shoppy://auth/callback)
export const redirectUri = makeRedirectUri({
  scheme: "shoppy",
  path: "auth/callback",
});

/**
 * Signs in with Google using in-app WebBrowser.
 * When Google completes authentication, the browser redirects straight
 * back to shoppy://auth/callback and opens the mobile app natively
 * without ever landing on or redirecting to the website.
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("No authorization URL returned from Supabase.");

    // Open native in-app browser session
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (res.type === "success" && res.url) {
      const { params, errorCode } = QueryParams.getQueryParams(res.url);

      if (errorCode) {
        throw new Error(`Authentication error: ${errorCode}`);
      }

      // Handle OAuth fragment / query parameters (access_token & refresh_token)
      if (params.access_token && params.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (sessionError) throw sessionError;
      }
    }

    const { data: userData } = await supabase.auth.getUser();
    return { user: userData.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || "Failed to sign in with Google." };
  }
}

export async function signOut() {
  return await supabase.auth.signOut();
}
