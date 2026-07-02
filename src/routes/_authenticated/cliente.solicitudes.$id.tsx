import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Check, Star, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { getMyRequest, transitionRequestStatus, type RequestStatus } from "@/lib/requests.functions";
import { listQuotesForMyRequest, acceptQuote } from "@/lib/quotes.functions";
import { createReview, listReviewsForRequest } from "@/lib/reviews.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const requestQuery = (id: string) =>
  queryOptions({ queryKey: ["me", "request", id], queryFn: () => getMyRequest({ data: { id } }) });
const quotesQuery = (id: string) =>
  queryOptions({
    queryKey: ["me", "request", id, "quotes"],
    queryFn: () => listQuotesForMyRequest({ data: { request_id: id } }),
  });
const reviewsQuery = (id: string) =>
  queryOptions({
    queryKey: ["me", "request", id, "reviews"],
    queryFn: () => listReviewsForRequest({ data: { request_id: id } }),
  });

export const Route = createFileRoute("/_authenticated/cliente/solicitudes/$id")({
  head: ({ params }) => ({ meta: [{ title: `Solicitud ${params.id.slice(0, 8)} — Servicios Alanis` }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(requestQuery(params.id)),
      context.queryClient.ensureQueryData(quotesQuery(params.id)),
      context.queryClient.ensureQueryData(reviewsQuery(params.id)),
    ]);
  },
  component: RequestDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Solicitud no encontrada.</div>,
});

const statusLabel: Record<RequestStatus, string> = {
  draft: "Borrador",
  open: "Abierta",
  quoted: "Con cotizaciones",
  assigned: "Asignada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  disputed: "En disputa",
};

function RequestDetail() {
  const { id } = Route.useParams();
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: r } = useSuspenseQuery(requestQuery(id));
  const { data: quotes } = useSuspenseQuery(quotesQuery(id));
  const { data: reviews } = useSuspenseQuery(reviewsQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["me", "request", id] });
    qc.invalidateQueries({ queryKey: ["me", "request", id, "quotes"] });
    qc.invalidateQueries({ queryKey: ["me", "request", id, "reviews"] });
    qc.invalidateQueries({ queryKey: ["me", "requests"] });
  }

  const acceptMut = useMutation({
    mutationFn: (quote_id: string) => acceptQuote({ data: { quote_id } }),
    onSuccess: ({ conversation_id }) => {
      toast.success("Cotización aceptada");
      invalidate();
      qc.invalidateQueries({ queryKey: ["me", "conversations"] });
      navigate({ to: "/mensajes/$id", params: { id: conversation_id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al aceptar"),
  });

  const transitionMut = useMutation({
    mutationFn: (new_status: "in_progress" | "completed" | "cancelled") =>
      transitionRequestStatus({ data: { request_id: id, new_status } }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  const isAssigned = r.status === "assigned" || r.status === "in_progress" || r.status === "completed";
  const alreadyReviewed = reviews.some((rv) => rv.reviewer_id === account.userId);

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/cliente/solicitudes"><ChevronLeft className="mr-1 h-4 w-4" /> Volver</Link>
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{statusLabel[r.status as RequestStatus]}</Badge>
              <Badge variant="outline">{r.category_name}</Badge>
              <Badge variant="secondary">Urgencia: {r.urgency}</Badge>
            </div>
            <CardTitle className="mt-3 text-2xl">{r.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{r.description}</p>
            <div className="text-sm text-muted-foreground">
              Presupuesto: {r.budget_min ?? "?"} – {r.budget_max ?? "?"} {r.budget_currency ?? ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {r.status === "assigned" && (
                <Button size="sm" variant="outline" onClick={() => transitionMut.mutate("in_progress")} disabled={transitionMut.isPending}>
                  Marcar en curso
                </Button>
              )}
              {(r.status === "assigned" || r.status === "in_progress") && (
                <Button size="sm" onClick={() => transitionMut.mutate("completed")} disabled={transitionMut.isPending}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Marcar completada
                </Button>
              )}
              {["open", "quoted", "assigned", "in_progress"].includes(r.status) && (
                <Button size="sm" variant="destructive" onClick={() => transitionMut.mutate("cancelled")} disabled={transitionMut.isPending}>
                  <X className="mr-1 h-4 w-4" /> Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {r.status === "completed" && !alreadyReviewed && (
          <ReviewForm requestId={id} onDone={invalidate} />
        )}

        {reviews.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-semibold">Reseñas</h2>
            <div className="mt-3 grid gap-3">
              {reviews.map((rv) => (
                <Card key={rv.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < rv.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(rv.created_at).toLocaleString("es")}
                      </span>
                    </div>
                    {rv.comment && <p className="mt-2 whitespace-pre-wrap text-sm">{rv.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <h2 className="mt-8 text-lg font-semibold">Cotizaciones ({quotes.length})</h2>
        <div className="mt-3 grid gap-3">
          {quotes.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aún no hay cotizaciones.</CardContent></Card>
          )}
          {quotes.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{q.professional_name ?? "Profesional"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("es")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{q.amount} {q.currency_code}</div>
                    {q.estimated_days && <div className="text-xs text-muted-foreground">{q.estimated_days} día(s)</div>}
                  </div>
                </div>
                {q.message && <p className="whitespace-pre-wrap text-sm">{q.message}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge>
                  {q.status === "pending" && !isAssigned && (
                    <Button size="sm" disabled={acceptMut.isPending} onClick={() => acceptMut.mutate(q.id)}>
                      <Check className="mr-1 h-4 w-4" /> Aceptar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ReviewForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const mut = useMutation({
    mutationFn: () => createReview({ data: { request_id: requestId, rating, comment: comment || null } }),
    onSuccess: () => {
      toast.success("Reseña enviada");
      setComment("");
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo enviar"),
  });
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle className="text-base">Califica al profesional</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1;
            return (
              <button key={v} type="button" onClick={() => setRating(v)} aria-label={`${v} estrellas`}>
                <Star className={`h-6 w-6 ${v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>
        <div>
          <Label htmlFor="comment">Comentario (opcional)</Label>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} />
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Enviar reseña</Button>
      </CardContent>
    </Card>
  );
}
