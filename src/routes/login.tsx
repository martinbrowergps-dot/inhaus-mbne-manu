import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate({ to: "/" });
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) navigate({ to: "/" });
        setCheckingSession(false);
      })
      .catch((err) => {
        console.error("[Login] getSession failed:", err);
        setCheckingSession(false);
      });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setLoading(true);

    if (modo === "cadastro") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setErro(error.message);
        return;
      }
      if (!data.session) {
        setAviso("Cadastro criado. Confirme o e-mail enviado para ativar o acesso.");
        return;
      }
      navigate({ to: "/" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    navigate({ to: "/" });
  }

  async function handleOAuth(provider: "google" | "apple") {
    setErro("");
    setAviso("");
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setErro(result.error.message ?? "Falha ao entrar com o provedor.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar com o provedor.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {checkingSession ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="w-full max-w-sm rounded-lg border border-border/60 bg-card p-6 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-foreground">IN HAUS</h1>
            <p className="mt-1 text-xs text-muted-foreground">Centro de Controle de Manutenção</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-border/60 p-1">
            {(["login", "cadastro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModo(m);
                  setErro("");
                  setAviso("");
                }}
                className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  modo === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="senha" className="text-xs font-medium text-foreground">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                minLength={6}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>

            {erro && <p className="text-xs text-destructive">{erro}</p>}
            {aviso && <p className="text-xs text-success">{aviso}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2">
            <span className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border/60" />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth("google")}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
                />
              </svg>
              Entrar com Google
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth("apple")}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M16.37 12.78c.03 3.2 2.8 4.26 2.83 4.28-.02.08-.44 1.52-1.46 3-.88 1.29-1.8 2.57-3.25 2.6-1.42.02-1.88-.85-3.51-.85s-2.13.82-3.48.87c-1.4.05-2.46-1.39-3.35-2.67-1.82-2.63-3.21-7.44-1.34-10.68.93-1.61 2.58-2.63 4.38-2.66 1.37-.03 2.66.92 3.5.92.84 0 2.41-1.14 4.06-.97.69.03 2.63.28 3.87 2.1-.1.06-2.31 1.35-2.29 4.03M13.9 3.9c.74-.9 1.24-2.15 1.1-3.4-1.07.05-2.36.72-3.13 1.61-.68.79-1.28 2.06-1.12 3.28 1.19.09 2.41-.6 3.15-1.49" />
              </svg>
              Entrar com Apple
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
