import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="text-base font-semibold">Servicios Alanis</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Encuentra ayuda profesional cerca de ti.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Plataforma</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/servicios" className="hover:text-foreground">Servicios</Link></li>
            <li><a href="/#como-funciona" className="hover:text-foreground">Cómo funciona</a></li>
            <li><a href="/#profesionales" className="hover:text-foreground">Para profesionales</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Cuenta</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Iniciar sesión</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Registrarme</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Términos</li>
            <li>Privacidad</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container mx-auto px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Servicios Alanis. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
