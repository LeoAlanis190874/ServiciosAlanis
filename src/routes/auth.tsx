import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceder | Servicios Alanis" },
      {
        name: "description",
        content:
          "Inicia sesión o crea tu cuenta en Servicios Alanis. Encuentra ayuda profesional cerca de ti.",
      },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Tu nombre completo").max(100),
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
  role: z.enum(["cliente", "profesional"]),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bienvenido de vuelta");
    navigate({ to: "/" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          display_name: parsed.data.fullName,
          requested_role: parsed.data.role,
        },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Si se solicitó profesional, agregar el rol
    if (data.user && parsed.data.role === "profesional") {
      await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "profesional" });
    }
    setLoading(false);
    toast.success("Cuenta creada. Revisa tu correo si requiere confirmación.");
    navigate({ to: "/" });
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("No se pudo iniciar con Google");
      return;
    }
    if (result.redirected) return;
    toast.success("Sesión iniciada");
    navigate({ to: "/" });
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = z.string().email().safeParse(resetEmail.trim());
    if (!parsed.success) return toast.error("Ingresa un correo válido");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Te enviamos un correo para restablecer tu contraseña");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="text-2xl font-bold text-foreground">
            Servicios Alanis
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Encuentra ayuda profesional cerca de ti.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              <TabsTrigger value="reset">Olvidé</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Correo</Label>
                  <Input id="signin-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar sesión
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nombre completo</Label>
                  <Input id="signup-name" name="fullName" type="text" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo</Label>
                  <Input id="signup-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} />
                </div>
                <div className="space-y-2">
                  <Label>¿Cómo te registras?</Label>
                  <RadioGroup name="role" defaultValue="cliente" className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer">
                      <RadioGroupItem value="cliente" id="role-cliente" />
                      <span className="text-sm">Soy cliente</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer">
                      <RadioGroupItem value="profesional" id="role-profesional" />
                      <span className="text-sm">Soy profesional</span>
                    </label>
                  </RadioGroup>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset" className="mt-5">
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Correo</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar enlace
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogle}
          >
            Continuar con Google
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Al continuar aceptas nuestros términos y política de privacidad.
        </p>
      </div>
    </div>
  );
}
