import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { getOpportunity, createQuote } from "@/lib/quotes.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const oppQuery = (id: string) =>
  queryOptions({ queryKey: ["pro", "opportunity", id], queryFn: () => getOpportunity({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/profesional/oportunidades/$id")({
  head: () => ({ meta: [{ title: "Cotizar oportunidad — Servicios Alanis" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(oppQuery(params.id)),
    ]);
  },
  component: OpportunityDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data } = useSuspenseQuery(oppQuery(id));
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(data.request.budget_currency || "MXN");
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async () =>
      createQuote({
        data: {
          request_id: id,
          amount: Number(amount),
          currency_code: currency.toUpperCase(),
          estimated_days: days ? Number(days) : null,
          message,
        },
      }),
    onSuccess: () => {
      toast.success("Cotización enviada");
      qc.invalidateQueries({ queryKey: ["pro", "opportunity", id] });
      qc.invalidateQueries({ queryKey: ["pro", "quotes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo enviar"),
  });

  const isPro = account.roles.includes("profesional");
  const r = data.request as any;

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/profesional/oportunidades"><ChevronLeft className="mr-1 h-4 w-4" /> Volver</Link>
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{r.category_name}</Badge>
              <Badge variant="secondary">Urgencia: {r.urgency}</Badge>
            </div>
            <CardTitle className="mt-3 text-2xl">{r.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm">{r.description}</p>
            <div className="text-sm text-muted-foreground">
              Presupuesto: {r.budget_min ?? "?"} – {r.budget_max ?? "?"} {r.budget_currency ?? ""}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Enviar cotización</CardTitle></CardHeader>
          <CardContent>
            {!isPro && (
              <p className="text-sm text-muted-foreground">
                Necesitas el rol Profesional para cotizar. <Link to="/onboarding" className="underline">Activa tu perfil profesional</Link>.
              </p>
            )}
            {isPro && data.myQuote && (
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
                Ya enviaste una cotización por <strong>{data.myQuote.amount} {data.myQuote.currency_code}</strong> ({data.myQuote.status}).
              </div>
            )}
            {isPro && !data.myQuote && (
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <div>
                    <Label htmlFor="amount">Monto</Label>
                    <Input id="amount" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cur">Moneda</Label>
                    <Input id="cur" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="days">Días estimados</Label>
                  <Input id="days" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="msg">Mensaje al cliente</Label>
                  <Textarea id="msg" rows={5} required minLength={10} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explica tu propuesta, materiales incluidos, etc." />
                </div>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Enviando…" : "Enviar cotización"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
