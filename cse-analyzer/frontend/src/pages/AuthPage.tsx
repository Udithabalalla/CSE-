import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import * as authApi from "../api/auth";

const loginSchema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(6, "Min 6 characters"),
});

const registerSchema = loginSchema.extend({
  email: z.string().email("Invalid email"),
  full_name: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const loginForm    = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onLogin = async (data: LoginForm) => {
    setError("");
    try {
      const res = await authApi.login(data);
      setAuth(res.access_token, res.user);
      navigate("/dashboard");
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed");
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setError("");
    try {
      const res = await authApi.register(data);
      setAuth(res.access_token, res.user);
      navigate("/dashboard");
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CSE Analyzer</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Colombo Stock Exchange Intelligence</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 mb-6">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                tab === t
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <Field label="Username" error={loginForm.formState.errors.username?.message}>
              <input className="input" {...loginForm.register("username")} />
            </Field>
            <Field label="Password" error={loginForm.formState.errors.password?.message}>
              <input className="input" type="password" {...loginForm.register("password")} />
            </Field>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
            <Field label="Username" error={registerForm.formState.errors.username?.message}>
              <input className="input" {...registerForm.register("username")} />
            </Field>
            <Field label="Email" error={registerForm.formState.errors.email?.message}>
              <input className="input" type="email" {...registerForm.register("email")} />
            </Field>
            <Field label="Full Name (optional)">
              <input className="input" {...registerForm.register("full_name")} />
            </Field>
            <Field label="Password" error={registerForm.formState.errors.password?.message}>
              <input className="input" type="password" {...registerForm.register("password")} />
            </Field>
            <button type="submit" className="btn-primary w-full mt-2" disabled={registerForm.formState.isSubmitting}>
              {registerForm.formState.isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
