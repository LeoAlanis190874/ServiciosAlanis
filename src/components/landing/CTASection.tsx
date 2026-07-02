import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Briefcase, TrendingUp, Shield } from "lucide-react";

export function CTASection() {
  return (
    <section id="profesionales" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground md:p-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                ¿Eres profesional o técnico?
              </h2>
              <p className="mt-3 text-primary-foreground/90">
                Crece tu negocio. Recibe solicitudes calificadas en tu zona y cobra de forma segura.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary" className="h-12 px-6">
                  <Link to="/auth">Registrarme como profesional</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/servicios">Ver categorías</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <Benefit icon={<Briefcase className="h-5 w-5" />} title="Más clientes" desc="Solicitudes filtradas por tu zona y especialidad." />
              <Benefit icon={<TrendingUp className="h-5 w-5" />} title="Reputación" desc="Reseñas reales que construyen tu marca personal." />
              <Benefit icon={<Shield className="h-5 w-5" />} title="Pagos seguros" desc="Cobra de forma protegida al finalizar el trabajo." />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary-foreground/10 p-4 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/20">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-primary-foreground/80">{desc}</div>
      </div>
    </div>
  );
}
