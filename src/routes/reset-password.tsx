import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña | Servicios Alanis" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase inyecta el access_token en el hash; al detectar el evento de recovery, la sesión queda lista.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: form.get("password"),
      confirm: form.get("confirm"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="text-2xl font-bold text-foreground">
            Servicios Alanis
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Restablecer contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Define una nueva contraseña para tu cuenta."
              : "Verificando enlace de recuperación..."}
          </p>

          {ready && (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input id="confirm" name="confirm" type="password" required minLength={8} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
