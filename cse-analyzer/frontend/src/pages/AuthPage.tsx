import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import * as authApi from "../api/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});

const registerSchema = loginSchema.extend({
  email: z.string().email(),
  full_name: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onLogin = async (data: LoginForm) => {
    setError("");
    try {
      const res = await authApi.login(data);
      setAuth(res.access_token, res.user);
      navigate("/dashboard");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Login failed");
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setError("");
    try {
      const res = await authApi.register(data);
      setAuth(res.access_token, res.user);
      navigate("/dashboard");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Registration failed");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: "2rem", border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>CSE Market Analyzer</h2>
      <div style={{ display: "flex", marginBottom: "1.5rem" }}>
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "0.5rem",
              background: tab === t ? "#2563eb" : "#f1f5f9",
              color: tab === t ? "#fff" : "#333",
              border: "none", cursor: "pointer", borderRadius: 4,
            }}
          >
            {t === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      {tab === "login" ? (
        <form onSubmit={loginForm.handleSubmit(onLogin)}>
          <Field label="Username" error={loginForm.formState.errors.username?.message}>
            <input {...loginForm.register("username")} style={inputStyle} />
          </Field>
          <Field label="Password" error={loginForm.formState.errors.password?.message}>
            <input type="password" {...loginForm.register("password")} style={inputStyle} />
          </Field>
          <button type="submit" style={btnStyle} disabled={loginForm.formState.isSubmitting}>
            {loginForm.formState.isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      ) : (
        <form onSubmit={registerForm.handleSubmit(onRegister)}>
          <Field label="Username" error={registerForm.formState.errors.username?.message}>
            <input {...registerForm.register("username")} style={inputStyle} />
          </Field>
          <Field label="Email" error={registerForm.formState.errors.email?.message}>
            <input type="email" {...registerForm.register("email")} style={inputStyle} />
          </Field>
          <Field label="Full Name (optional)">
            <input {...registerForm.register("full_name")} style={inputStyle} />
          </Field>
          <Field label="Password" error={registerForm.formState.errors.password?.message}>
            <input type="password" {...registerForm.register("password")} style={inputStyle} />
          </Field>
          <button type="submit" style={btnStyle} disabled={registerForm.formState.isSubmitting}>
            {registerForm.formState.isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
      {error && <span style={{ color: "red", fontSize: 12 }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem", border: "1px solid #ccc",
  borderRadius: 4, boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem", background: "#2563eb",
  color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600,
};
