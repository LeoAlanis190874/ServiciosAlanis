# Servicios Alanis — Arquitectura Profesional

Plataforma multi-rol (Cliente / Profesional / Administrador) para solicitar servicios y recibir cotizaciones, diseñada para escalar internacionalmente.

---

## 1. Stack y decisiones base

- **Frontend**: TanStack Start (React 19 + Vite 7), Tailwind v4, shadcn/ui.
- **Backend**: Lovable Cloud (PostgreSQL + Auth + Storage + Server Functions).
- **Auth**: Email/Password + Google (por defecto Lovable Cloud).
- **i18n**: arquitectura preparada desde el día 1 (es, en, pt) con tablas multi-moneda y multi-zona horaria.
- **Pagos** (fase posterior): Stripe Connect para pagos a profesionales.

---

## 2. Estructura de carpetas

```text
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx                    # Landing pública
│   ├── auth.tsx                     # Login / Signup
│   ├── reset-password.tsx
│   ├── servicios.tsx                # Catálogo público de categorías
│   ├── servicios.$categoria.tsx
│   ├── profesionales.$slug.tsx      # Perfil público profesional
│   ├── _authenticated/
│   │   ├── route.tsx                # Gate de sesión (managed)
│   │   ├── dashboard.tsx            # Router por rol
│   │   ├── cliente/
│   │   │   ├── solicitudes.tsx
│   │   │   ├── solicitudes.$id.tsx
│   │   │   ├── cotizaciones.tsx
│   │   │   └── mensajes.tsx
│   │   ├── profesional/
│   │   │   ├── perfil.tsx
│   │   │   ├── oportunidades.tsx
│   │   │   ├── cotizaciones.tsx
│   │   │   ├── trabajos.tsx
│   │   │   └── verificacion.tsx
│   │   └── _admin/
│   │       ├── route.tsx            # Gate rol admin
│   │       ├── usuarios.tsx
│   │       ├── verificaciones.tsx
│   │       ├── categorias.tsx
│   │       ├── disputas.tsx
│   │       └── reportes.tsx
│   └── api/public/
│       └── webhooks.*.ts            # Stripe, notificaciones
├── components/
│   ├── ui/                          # shadcn
│   ├── layout/                      # Shells por rol
│   ├── solicitudes/
│   ├── cotizaciones/
│   ├── perfil/
│   └── mensajeria/
├── lib/
│   ├── solicitudes.functions.ts
│   ├── cotizaciones.functions.ts
│   ├── profesionales.functions.ts
│   ├── admin.functions.ts
│   ├── notificaciones.functions.ts
│   └── i18n/
├── hooks/
├── integrations/supabase/
└── styles.css
```

---

## 3. Modelo de datos (alto nivel)

**Identidad y roles**
- `profiles` — datos comunes (nombre, avatar, idioma, país, zona horaria, teléfono).
- `app_role` enum: `cliente | profesional | admin`.
- `user_roles` — roles por usuario (tabla separada, validada vía `has_role()` SECURITY DEFINER).

**Catálogo**
- `categorias` (plomería, electricidad, etc.) con `categorias_i18n` para traducciones.
- `subcategorias`.
- `paises`, `monedas`, `regiones` — soporte internacional.

**Profesionales**
- `profesionales` — extiende profile (bio, años exp, radio servicio, tarifa base, moneda).
- `profesional_categorias` (N:N).
- `profesional_zonas` (cobertura geográfica).
- `verificaciones` — KYC, documentos, estado.
- `portafolio` — imágenes/proyectos.

**Solicitudes y cotizaciones**
- `solicitudes` — cliente_id, categoria, descripción, ubicación, presupuesto, estado, urgencia.
- `solicitud_adjuntos`.
- `cotizaciones` — solicitud_id, profesional_id, monto, moneda, tiempo estimado, estado.
- `contratos` — cotización aceptada → trabajo en curso.
- `pagos` (fase pagos).

**Interacción**
- `conversaciones` y `mensajes` (vinculados a solicitud o contrato).
- `reseñas` (cliente↔profesional, bidireccional).
- `notificaciones`.

**Administración**
- `disputas`, `reportes_usuario`, `audit_log`.

---

## 4. Roles y permisos

- Roles en tabla `user_roles` (NUNCA en `profiles`).
- Función `has_role(uid, role)` SECURITY DEFINER usada en todas las RLS.
- Un usuario puede ser Cliente y Profesional simultáneamente.
- Admin se asigna manualmente vía panel/DB.

**Matriz resumida**
| Acción | Cliente | Profesional | Admin |
|---|---|---|---|
| Crear solicitud | ✅ | — | ✅ |
| Ver solicitudes abiertas en su categoría/zona | — | ✅ | ✅ |
| Cotizar | — | ✅ (verificado) | — |
| Aceptar cotización | ✅ (dueño) | — | — |
| Mensajería | ✅ partes | ✅ partes | ✅ |
| Verificar profesionales | — | — | ✅ |
| Gestionar categorías/disputas | — | — | ✅ |

RLS por tabla con políticas estrictas basadas en `auth.uid()` + `has_role()`.

---

## 5. Flujos de usuario

**Cliente**
1. Registro → elige rol Cliente → completa perfil/ubicación.
2. Crea solicitud (categoría, descripción, fotos, presupuesto, urgencia).
3. Recibe cotizaciones → compara → chat → acepta una.
4. Trabajo en curso → confirma finalización → paga → reseña.

**Profesional**
1. Registro → rol Profesional → completa perfil → sube documentos → espera verificación.
2. Configura categorías, zonas, tarifa.
3. Ve oportunidades filtradas → envía cotización → chat con cliente.
4. Cotización aceptada → ejecuta → marca finalizado → recibe pago → reseña.

**Administrador**
1. Verifica profesionales (KYC).
2. Gestiona catálogo y traducciones.
3. Modera disputas y reportes.
4. Métricas y reportes.

---

## 6. Módulos principales

1. **Auth & Onboarding** (multi-rol con selector).
2. **Catálogo de Servicios** (i18n).
3. **Solicitudes** (creación, listado, estados, adjuntos).
4. **Cotizaciones** (envío, comparación, aceptación).
5. **Mensajería** (realtime por solicitud/contrato).
6. **Verificación / KYC**.
7. **Reseñas y Reputación**.
8. **Notificaciones** (in-app + email; SMS/push futuro).
9. **Pagos** (Stripe Connect, fase 2).
10. **Panel Admin**.
11. **Búsqueda y matching** (categoría + geolocalización + rating).
12. **Reportes y analítica**.

---

## 7. Escalabilidad internacional

- **i18n estructural**: tablas `*_i18n` para contenido traducible; rutas con namespace de idioma opcional (`/es`, `/en`).
- **Multi-moneda**: cada cotización guarda `monto` + `moneda`; conversión vía tabla de tipos de cambio.
- **Multi-país**: `paises`, `regiones`, formatos de teléfono/documento por país.
- **Zonas horarias**: timestamps en UTC, render con TZ del usuario.
- **Geolocalización**: lat/lng + PostGIS (extensión) para matching por radio.
- **CDN/Edge**: SSR en Cloudflare Workers; assets en Storage con CDN.
- **Feature flags por país** para activar pagos/verificación según jurisdicción.
- **Cumplimiento**: GDPR/LOPD, exportación y borrado de datos del usuario.
- **Observabilidad**: audit log, métricas, captura de errores ya integrada.

---

## 8. Roadmap de implementación sugerido (fases)

1. **Fundación**: Cloud activado, schema base (profiles, roles, categorías), auth + onboarding multi-rol.
2. **Solicitudes y cotizaciones** (núcleo del marketplace).
3. **Mensajería + notificaciones**.
4. **Verificación profesional + reseñas**.
5. **Panel admin**.
6. **Pagos (Stripe Connect)**.
7. **i18n completo + segundo país piloto**.
8. **Búsqueda avanzada + matching geográfico**.

---

Si apruebas esta arquitectura, el siguiente paso es activar Lovable Cloud y crear el schema base + auth multi-rol (Fase 1).
