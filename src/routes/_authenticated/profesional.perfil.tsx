import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { getActiveCategories } from "@/lib/categories.functions";
import { getActiveCountries } from "@/lib/reference.functions";
import {
  getMyProfessionalProfile,
  setProfessionalCategories,
  setProfessionalCoverage,
} from "@/lib/professional.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const profileQuery = queryOptions({
  queryKey: ["me", "professional"],
  queryFn: () => getMyProfessionalProfile(),
});
const catsQuery = queryOptions({ queryKey: ["public", "categories"], queryFn: () => getActiveCategories() });
const countriesQuery = queryOptions({ queryKey: ["ref", "countries"], queryFn: () => getActiveCountries() });

export const Route = createFileRoute("/_authenticated/profesional/perfil")({
  head: () => ({ meta: [{ title: "Perfil profesional — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(catsQuery),
      context.queryClient.ensureQueryData(countriesQuery),
    ]);
  },
  component: ProProfilePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function ProProfilePage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const qc = useQueryClient();

  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(profile.categories.map((c) => c.category_id)),
  );
  const [hourlyRate, setHourlyRate] = useState(
    String(profile.categories[0]?.hourly_rate ?? ""),
  );
  const [currency, setCurrency] = useState(profile.categories[0]?.currency_code ?? "MXN");
  const [coverageCountries, setCoverageCountries] = useState<Set<string>>(
    new Set(profile.coverage.map((c) => c.country_id).filter(Boolean) as string[]),
  );
  const [radius, setRadius] = useState(String(profile.coverage[0]?.service_radius_km ?? "50"));

  const saveCats = useMutation({
    mutationFn: () =>
      setProfessionalCategories({
        data: {
          items: Array.from(selectedCats).map((id) => ({
            category_id: id,
            hourly_rate: hourlyRate ? Number(hourlyRate) : null,
            currency_code: currency.toUpperCase() || null,
            years_experience: null,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Categorías actualizadas");
      qc.invalidateQueries({ queryKey: ["me", "professional"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveCov = useMutation({
    mutationFn: () =>
      setProfessionalCoverage({
        data: {
          items: Array.from(coverageCountries).map((country_id) => ({
            country_id,
            service_radius_km: radius ? Number(radius) : null,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Cobertura actualizada");
      qc.invalidateQueries({ queryKey: ["me", "professional"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleSet(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Perfil profesional</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Categorías de servicio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {cats.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <Checkbox
                    checked={selectedCats.has(c.id)}
                    onCheckedChange={() => setSelectedCats((s) => toggleSet(s, c.id))}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <Label htmlFor="rate">Tarifa por hora</Label>
                <Input id="rate" type="number" min="0" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="curp">Moneda</Label>
                <Input id="curp" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
            </div>
            <Button disabled={saveCats.isPending} onClick={() => saveCats.mutate()}>
              {saveCats.isPending ? "Guardando…" : "Guardar categorías"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cobertura geográfica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {countries.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <Checkbox
                    checked={coverageCountries.has(c.id)}
                    onCheckedChange={() => setCoverageCountries((s) => toggleSet(s, c.id))}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            <div>
              <Label htmlFor="rad">Radio de servicio (km)</Label>
              <Input id="rad" type="number" min="1" max="2000" value={radius} onChange={(e) => setRadius(e.target.value)} />
            </div>
            <Button disabled={saveCov.isPending} onClick={() => saveCov.mutate()}>
              {saveCov.isPending ? "Guardando…" : "Guardar cobertura"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
