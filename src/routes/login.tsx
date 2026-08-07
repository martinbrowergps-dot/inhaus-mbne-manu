import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
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
        </div>
      )}
    </div>
  );
}
