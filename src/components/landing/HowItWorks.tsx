import { ClipboardList, MessageSquare, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "1. Publica tu solicitud",
    desc: "Describe lo que necesitas, sube fotos y comparte tu ubicación. Toma menos de 2 minutos.",
  },
  {
    icon: MessageSquare,
    title: "2. Recibe cotizaciones",
    desc: "Profesionales verificados te envían propuestas. Compáralas y chatea con ellos.",
  },
  {
    icon: CheckCircle2,
    title: "3. Contrata con confianza",
    desc: "Elige al mejor, agenda el servicio y califica al finalizar. Soporte siempre disponible.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-y border-border/60 bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Cómo funciona</h2>
          <p className="mt-3 text-muted-foreground">
            Tres pasos sencillos para resolver lo que necesitas en tu hogar o negocio.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
