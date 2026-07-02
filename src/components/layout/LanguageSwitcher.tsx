import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, LANG_OPTIONS, type Lang } from "@/lib/i18n/context";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const current = LANG_OPTIONS.find((o) => o.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("common.language")}>
          <Globe className="h-4 w-4" />
          {!compact && <span className="ml-1.5 text-xs uppercase">{lang}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANG_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.code}
            onClick={() => setLang(o.code as Lang)}
            className={o.code === current?.code ? "font-semibold" : undefined}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
