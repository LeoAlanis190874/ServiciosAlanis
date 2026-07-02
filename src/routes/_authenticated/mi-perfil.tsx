import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import {
  getMyAccount,
  updateMyProfile,
  updateMyAvatarUrl,
  changeMyPassword,
} from "@/lib/account.functions";
import { getActiveCountries } from "@/lib/reference.functions";

const accountQuery = queryOptions({
  queryKey: ["me", "account"],
  queryFn: () => getMyAccount(),
});
const countriesQuery = queryOptions({
  queryKey: ["ref", "countries"],
  queryFn: () => getActiveCountries(),
  staleTime: 30 * 60 * 1000,
});

export const Route = createFileRoute("/_authenticated/mi-perfil")({
  head: () => ({ meta: [{ title: "Mi perfil — Servicios Alanis" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(countriesQuery),
    ]),
  component: MyProfilePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const profileFormSchema = z.object({
  full_name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  display_name: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().min(5, "Teléfono requerido").max(30),
  country_id: z.string().uuid("Selecciona un país"),
  preferred_language: z.enum(["es", "en", "pt"]),
  address_line: z.string().max(200).optional().or(z.literal("")),
  bio: z.string().max(600).optional().or(z.literal("")),
});
type ProfileValues = z.infer<typeof profileFormSchema>;

const passwordSchema = z
  .object({
    new_password: z.string().min(8, "Mínimo 8 caracteres").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function MyProfilePage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const qc = useQueryClient();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: account.profile.full_name ?? "",
      display_name: account.profile.display_name ?? "",
      phone: account.profile.phone ?? "",
      country_id: account.profile.country_id ?? "",
      preferred_language:
        (account.profile.preferred_language as "es" | "en" | "pt") ?? "es",
      address_line: account.profile.address_line ?? "",
      bio: account.profile.bio ?? "",
    },
  });

  const profileMut = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const country = countries.find((c) => c.id === values.country_id);
      await updateMyProfile({
        data: {
          full_name: values.full_name,
          display_name: values.display_name || values.full_name,
          phone: values.phone,
          country_id: values.country_id,
          preferred_language: values.preferred_language,
          preferred_currency: country?.default_currency ?? null,
          address_line: values.address_line || null,
          bio: values.bio || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      qc.invalidateQueries({ queryKey: ["me", "account"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  const avatarMut = useMutation({
    mutationFn: (url: string | null) => updateMyAvatarUrl({ data: { avatar_url: url } }),
    onSuccess: () => {
      toast.success("Avatar actualizado");
      qc.invalidateQueries({ queryKey: ["me", "account"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm: "" },
  });

  const passwordMut = useMutation({
    mutationFn: (v: PasswordValues) => changeMyPassword({ data: { new_password: v.new_password } }),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      passwordForm.reset({ new_password: "", confirm: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initials =
    (account.profile.display_name ?? account.profile.full_name ?? account.email ?? "?")
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
            <p className="text-sm text-muted-foreground">
              Actualiza tus datos personales, avatar y contraseña.
            </p>
          </div>
          {account.isSuperAdmin && (
            <Badge className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Super Admin protegido
            </Badge>
          )}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Foto de perfil</CardTitle>
            <CardDescription>Pega la URL de una imagen pública (jpg, png, webp).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={account.profile.avatar_url ?? undefined} alt="Avatar" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar_url">URL del avatar</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="avatar_url"
                  defaultValue={account.profile.avatar_url ?? ""}
                  placeholder="https://…"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={avatarMut.isPending}
                    onClick={() => {
                      const el = document.getElementById("avatar_url") as HTMLInputElement | null;
                      const v = el?.value?.trim() ?? "";
                      avatarMut.mutate(v ? v : null);
                    }}
                  >
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={avatarMut.isPending}
                    onClick={() => avatarMut.mutate(null)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>Esta información se usa para tus solicitudes y cotizaciones.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={profileForm.handleSubmit((v) => profileMut.mutate(v))}
            >
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" {...profileForm.register("full_name")} />
                {profileForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Nombre público</Label>
                <Input id="display_name" {...profileForm.register("display_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...profileForm.register("phone")} />
                {profileForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>País</Label>
                <Select
                  value={profileForm.watch("country_id")}
                  onValueChange={(v) => profileForm.setValue("country_id", v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name ?? c.iso2}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profileForm.formState.errors.country_id && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.country_id.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Idioma preferido</Label>
                <Select
                  value={profileForm.watch("preferred_language")}
                  onValueChange={(v) =>
                    profileForm.setValue("preferred_language", v as "es" | "en" | "pt")
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address_line">Dirección</Label>
                <Input id="address_line" {...profileForm.register("address_line")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bio">Biografía</Label>
                <Textarea id="bio" rows={4} {...profileForm.register("bio")} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={profileMut.isPending}>
                  {profileMut.isPending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Mínimo 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={passwordForm.handleSubmit((v) => passwordMut.mutate(v))}
            >
              <div className="space-y-1.5">
                <Label htmlFor="new_password">Nueva contraseña</Label>
                <Input id="new_password" type="password" {...passwordForm.register("new_password")} />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input id="confirm" type="password" {...passwordForm.register("confirm")} />
                {passwordForm.formState.errors.confirm && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirm.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={passwordMut.isPending}>
                  {passwordMut.isPending ? "Actualizando…" : "Actualizar contraseña"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
