import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, Star, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Profesionales verificados
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Encuentra ayuda profesional <span className="text-primary">cerca de ti</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Solicita un servicio, recibe cotizaciones de técnicos y profesionales calificados, y elige
            con confianza. Rápido, seguro y sin complicaciones.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-6">
              <Link to="/auth">
                <Search className="mr-2 h-4 w-4" />
                Solicitar un servicio
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6">
              <Link to="/auth">Soy profesional</Link>
            </Button>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-6 text-center">
            <Stat icon={<Users className="h-4 w-4" />} label="Clientes" value="10k+" />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Verificados" value="100%" />
            <Stat icon={<Star className="h-4 w-4" />} label="Calificación" value="4.9" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
