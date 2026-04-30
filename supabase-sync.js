import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

let client = null;

export function isCloudConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 20
  );
}

export async function signUpOrIn(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getClient();

  const signInResult = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });
  if (!signInResult.error) {
    return { user: signInResult.data.user, needsConfirmation: false };
  }

  const signUpResult = await supabase.auth.signUp({
    email: normalizedEmail,
    password
  });
  if (signUpResult.error) {
    throw new Error(toCloudMessage(signUpResult.error));
  }

  return {
    user: signUpResult.data.user,
    needsConfirmation: !signUpResult.data.session
  };
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw new Error(toCloudMessage(error));
}

export async function getSessionUser() {
  const { data, error } = await getClient().auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error(toCloudMessage(error));
  }
  return data.user || null;
}

export async function pushState(state, clientUpdatedAt) {
  const supabase = getClient();
  const user = await getSessionUser();
  if (!user) throw new Error("请先登录");

  const { error } = await supabase.from("app_state").upsert({
    user_id: user.id,
    payload: state,
    client_updated_at: clientUpdatedAt
  }, {
    onConflict: "user_id"
  });

  if (error) throw new Error(toCloudMessage(error));
  return { userId: user.id };
}

export async function pullState() {
  const supabase = getClient();
  const user = await getSessionUser();
  if (!user) throw new Error("请先登录");

  const { data, error } = await supabase
    .from("app_state")
    .select("payload, client_updated_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(toCloudMessage(error));
  return data;
}

function getClient() {
  if (!isCloudConfigured()) {
    throw new Error("请先配置 Supabase");
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return client;
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) throw new Error("请输入邮箱");
  return value;
}

function toCloudMessage(error) {
  const message = error?.message || "云端同步失败";
  if (message.includes("Invalid login credentials")) return "邮箱或密码不正确";
  if (message.includes("User already registered")) return "账号已存在，请登录";
  if (message.includes("Email not confirmed")) return "请先确认邮箱";
  if (message.includes("relation") && message.includes("app_state")) return "请先创建 Supabase 表";
  return message;
}
