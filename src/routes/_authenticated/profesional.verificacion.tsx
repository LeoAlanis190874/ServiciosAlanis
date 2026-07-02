import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { getMyProfessionalProfile, submitVerification } from "@/lib/professional.functions";

const accountQuery = queryOptions({ queryKey: ["me", "account"], queryFn: () => getMyAccount() });
const profileQuery = queryOptions({
  queryKey: ["me", "professional"],
  queryFn: () => getMyProfessionalProfile(),
});

export const Route = createFileRoute("/_authenticated/profesional/verificacion")({
  head: () => ({ meta: [{ title: "Verificación — Servicios Alanis" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(profileQuery),
    ]);
  },
  component: VerificationPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">No encontrado.</div>,
});

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  verified: "default",
  rejected: "destructive",
  unverified: "outline",
};

function VerificationPage() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();

  const [documentType, setDocumentType] = useState("ID oficial");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      submitVerification({
        data: { document_type: documentType, document_url: documentUrl, notes: notes || null },
      }),
    onSuccess: () => {
      toast.success("Documento enviado — revisaremos tu solicitud");
      setDocumentUrl("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["me", "professional"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const v = profile.verification;

  return (
    <AppShell roles={account.roles} email={account.email}>
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BadgeCheck className="h-6 w-6" /> Verificación profesional
        </h1>

        {v && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={statusVariant[v.status ?? "unverified"]}>{v.status ?? "—"}</Badge>
              </div>
              {v.document_type && <div><span className="text-muted-foreground">Documento:</span> {v.document_type}</div>}
              {v.reviewed_at && <div className="text-xs text-muted-foreground">Revisado: {new Date(v.reviewed_at).toLocaleString("es")}</div>}
              {v.notes && <div className="rounded-md bg-muted p-3 text-sm">{v.notes}</div>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <div>
                <Label htmlFor="dt">Tipo de documento</Label>
                <Input id="dt" required maxLength={60} value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="du">URL del documento</Label>
                <Input id="du" type="url" required value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://…" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Por ahora, sube tu documento a un servicio público (Drive, Dropbox) y pega la URL.
                </p>
              </div>
              <div>
                <Label htmlFor="nt">Notas (opcional)</Label>
                <Textarea id="nt" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Enviando…" : "Enviar para revisión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
