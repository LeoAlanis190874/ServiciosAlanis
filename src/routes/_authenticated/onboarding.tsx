import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyAccount, updateMyProfile, addMyRole } from "@/lib/account.functions";
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

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Completar perfil — Servicios Alanis" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(countriesQuery),
    ]),
  component: OnboardingPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const formSchema = z.object({
  full_name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  phone: z.string().min(5, "Teléfono requerido").max(30),
  country_id: z.string().uuid("Selecciona un país"),
  preferred_language: z.enum(["es", "en", "pt"]),
  address_line: z.string().max(200),
  bio: z.string().max(600),
  is_professional: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function OnboardingPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: account.profile.full_name ?? "",
      phone: account.profile.phone ?? "",
      country_id: account.profile.country_id ?? "",
      preferred_language:
        (account.profile.preferred_language as "es" | "en" | "pt") ?? "es",
      address_line: account.profile.address_line ?? "",
      bio: account.profile.bio ?? "",
      is_professional: account.roles.includes("profesional"),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const country = countries.find((c) => c.id === values.country_id);
      await updateMyProfile({
        data: {
          full_name: values.full_name,
          display_name: values.full_name,
          phone: values.phone,
          country_id: values.country_id,
          preferred_language: values.preferred_language,
          preferred_currency: country?.default_currency ?? null,
          address_line: values.address_line || null,
          bio: values.bio || null,
        },
      });
      if (values.is_professional && !account.roles.includes("profesional")) {
        await addMyRole({ data: { role: "profesional" } });
      }
    },
    onSuccess: async () => {
      toast.success("Perfil actualizado");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Completa tu perfil</CardTitle>
            <CardDescription>
              Estos datos nos ayudan a conectarte con profesionales en tu zona.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" {...form.register("full_name")} />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" {...form.register("phone")} />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Idioma preferido</Label>
                  <Select
                    value={form.watch("preferred_language")}
                    onValueChange={(v) =>
                      form.setValue("preferred_language", v as "es" | "en" | "pt")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>País</Label>
                <Select
                  value={form.watch("country_id")}
                  onValueChange={(v) => form.setValue("country_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.country_id && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.country_id.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address_line">Dirección (opcional)</Label>
                <Input id="address_line" {...form.register("address_line")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Sobre ti (opcional)</Label>
                <Textarea id="bio" rows={3} {...form.register("bio")} />
              </div>

              <label className="flex items-start gap-2 rounded-md border border-border/60 p-3">
                <Checkbox
                  checked={form.watch("is_professional")}
                  onCheckedChange={(v) =>
                    form.setValue("is_professional", v === true)
                  }
                />
                <div className="text-sm">
                  <div className="font-medium">También soy profesional / técnico</div>
                  <div className="text-muted-foreground">
                    Activa esta opción si además quieres ofrecer servicios.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Guardando..." : "Guardar perfil"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
