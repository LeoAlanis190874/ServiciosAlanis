import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/context";

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">Servicios Alanis</div>
            <div className="text-[11px] text-muted-foreground">{t("tagline")}</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/servicios" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.services")}
          </Link>
          <Link to="/profesionales" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.professionals")}
          </Link>
          <a href="/#como-funciona" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.howItWorks")}
          </a>
          <a href="/#profesionales" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.forPros")}
          </a>
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">{t("cta.signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">{t("cta.start")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
