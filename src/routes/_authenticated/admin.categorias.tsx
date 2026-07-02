import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { listCategoriesAdmin, upsertCategory, type AdminCategory } from "@/lib/admin.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const catsQuery = queryOptions({
  queryKey: ["admin", "categories"],
  queryFn: () => listCategoriesAdmin(),
  staleTime: 10_000,
});

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorías — Admin" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.roles.includes("admin")) throw redirect({ to: "/dashboard" });
    await context.queryClient.ensureQueryData(catsQuery);
  },
  component: AdminCategoriesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const emptyForm = {
  id: null as string | null,
  slug: "",
  icon: "",
  is_active: true,
  sort_order: 0,
  name_es: "",
};

function AdminCategoriesPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const save = useMutation({
    mutationFn: () =>
      upsertCategory({
        data: {
          id: form.id ?? undefined,
          slug: form.slug,
          icon: form.icon || null,
          is_active: form.is_active,
          sort_order: Number(form.sort_order) || 0,
          name_es: form.name_es,
        },
      }),
    onSuccess: () => {
      toast.success("Categoría guardada");
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["public", "categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function edit(c: AdminCategory) {
    setForm({
      id: c.id,
      slug: c.slug,
      icon: c.icon ?? "",
      is_active: c.is_active,
      sort_order: c.sort_order,
      name_es: c.name_es ?? "",
    });
  }

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>

        <Card className="mt-4">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Nombre (ES)</Label>
              <Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                placeholder="plomeria"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Icono (lucide)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Wrench" />
            </div>
            <div className="grid gap-1.5">
              <Label>Orden</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Activa</Label>
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              {form.id && (
                <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancelar</Button>
              )}
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.slug || !form.name_es}>
                {form.id ? "Guardar cambios" : "Crear categoría"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-2">
          {cats.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name_es ?? c.slug}</span>
                    <Badge variant={c.is_active ? "default" : "outline"}>
                      {c.is_active ? "activa" : "inactiva"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.slug} · orden {c.sort_order} {c.icon ? `· ${c.icon}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => edit(c)}>Editar</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
