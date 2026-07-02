import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { getActiveCategories } from "@/lib/categories.functions";
import { createServiceRequest } from "@/lib/requests.functions";

const accountQuery = queryOptions({
  queryKey: ["me", "account"],
  queryFn: () => getMyAccount(),
});
const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => getActiveCategories(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/_authenticated/cliente/solicitudes/nueva")({
  head: () => ({ meta: [{ title: "Nueva solicitud — Servicios Alanis" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]),
  component: NewRequestPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const formSchema = z
  .object({
    category_id: z.string().uuid("Selecciona una categoría"),
    title: z.string().min(5, "Mínimo 5 caracteres").max(120),
    description: z.string().min(20, "Describe con al menos 20 caracteres").max(2000),
    urgency: z.enum(["low", "normal", "high", "urgent"]),
    budget_min: z.string(),
    budget_max: z.string(),
    budget_currency: z.string(),
    address_line: z.string().max(200),
    preferred_date: z.string(),
  })
  .refine(
    (d) => {
      if (!d.budget_min || !d.budget_max) return true;
      return Number(d.budget_max) >= Number(d.budget_min);
    },
    { message: "El presupuesto máximo debe ser mayor o igual al mínimo", path: ["budget_max"] },
  );

type FormValues = z.infer<typeof formSchema>;

function NewRequestPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: "",
      title: "",
      description: "",
      urgency: "normal",
      budget_min: "",
      budget_max: "",
      budget_currency: account.profile.preferred_currency ?? "MXN",
      address_line: account.profile.address_line ?? "",
      preferred_date: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createServiceRequest({
        data: {
          category_id: values.category_id,
          title: values.title,
          description: values.description,
          urgency: values.urgency,
          budget_min: values.budget_min ? Number(values.budget_min) : null,
          budget_max: values.budget_max ? Number(values.budget_max) : null,
          budget_currency: values.budget_currency || null,
          address_line: values.address_line || null,
          preferred_date: values.preferred_date || null,
        },
      }),
    onSuccess: async (res) => {
      toast.success("Solicitud publicada");
      await queryClient.invalidateQueries({ queryKey: ["me", "requests"] });
      navigate({ to: "/cliente/solicitudes/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!account.onboardingComplete) {
    return (
      <AppShell roles={account.roles} email={account.email}>
        <div className="container mx-auto max-w-xl px-4 py-12 text-center">
          <h1 className="text-xl font-semibold">Completa tu perfil primero</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitamos tu nombre, teléfono y país antes de publicar una solicitud.
          </p>
          <Button asChild className="mt-6">
            <Link to="/onboarding">Ir a completar perfil</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/cliente/solicitudes">
            <ChevronLeft className="mr-1 h-4 w-4" /> Volver
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Nueva solicitud</CardTitle>
            <CardDescription>
              Describe el trabajo que necesitas. Los profesionales te enviarán cotizaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select
                  value={form.watch("category_id")}
                  onValueChange={(v) => form.setValue("category_id", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category_id && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.category_id.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ej. Reparar fuga en lavabo del baño"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Cuenta los detalles: qué necesitas, condiciones, materiales, etc."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Urgencia</Label>
                  <Select
                    value={form.watch("urgency")}
                    onValueChange={(v) =>
                      form.setValue("urgency", v as FormValues["urgency"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="preferred_date">Fecha preferida (opcional)</Label>
                  <Input id="preferred_date" type="date" {...form.register("preferred_date")} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="budget_min">Presupuesto mín.</Label>
                  <Input id="budget_min" type="number" min="0" {...form.register("budget_min")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget_max">Presupuesto máx.</Label>
                  <Input id="budget_max" type="number" min="0" {...form.register("budget_max")} />
                  {form.formState.errors.budget_max && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.budget_max.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Moneda</Label>
                  <Select
                    value={form.watch("budget_currency") || "MXN"}
                    onValueChange={(v) => form.setValue("budget_currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address_line">Dirección o zona (opcional)</Label>
                <Input id="address_line" {...form.register("address_line")} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Publicando..." : "Publicar solicitud"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
