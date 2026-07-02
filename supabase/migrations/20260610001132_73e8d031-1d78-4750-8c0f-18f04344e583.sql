
INSERT INTO languages (code, name, native_name, is_active) VALUES
  ('es','Spanish','Español',true),('en','English','English',true),('pt','Portuguese','Português',true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO currencies (code, name, symbol, decimal_digits, is_active) VALUES
  ('USD','US Dollar','$',2,true),('MXN','Mexican Peso','$',2,true),('EUR','Euro','€',2,true),
  ('COP','Colombian Peso','$',2,true),('ARS','Argentine Peso','$',2,true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (iso2, iso3, name, phone_code, default_currency, default_language, default_timezone, is_active) VALUES
  ('MX','MEX','México','+52','MXN','es','America/Mexico_City',true),
  ('US','USA','United States','+1','USD','en','America/New_York',true),
  ('ES','ESP','España','+34','EUR','es','Europe/Madrid',true),
  ('CO','COL','Colombia','+57','COP','es','America/Bogota',true),
  ('AR','ARG','Argentina','+54','ARS','es','America/Argentina/Buenos_Aires',true)
ON CONFLICT (iso2) DO NOTHING;

WITH cats(slug, icon, sort_order, name, description) AS (VALUES
  ('plomeria','Wrench',1,'Plomería','Reparación e instalación de tuberías, fugas y sanitarios.'),
  ('electricidad','Zap',2,'Electricidad','Instalaciones eléctricas, cableado y reparaciones.'),
  ('limpieza','Sparkles',3,'Limpieza','Limpieza profunda de hogar, oficinas y posconstrucción.'),
  ('carpinteria','Hammer',4,'Carpintería','Muebles a medida, reparaciones y acabados en madera.'),
  ('pintura','Paintbrush',5,'Pintura','Pintura interior, exterior y acabados decorativos.'),
  ('jardineria','Trees',6,'Jardinería','Mantenimiento de jardines, poda y paisajismo.'),
  ('aire-acondicionado','Wind',7,'Aire Acondicionado','Instalación, mantenimiento y reparación de climas.'),
  ('cerrajeria','Key',8,'Cerrajería','Apertura, cambio e instalación de cerraduras.'),
  ('mudanzas','Truck',9,'Mudanzas','Servicios de mudanza local y fletes.'),
  ('tecnologia','Laptop',10,'Tecnología','Soporte técnico, redes y reparación de equipos.'),
  ('belleza','Scissors',11,'Belleza','Servicios de belleza, peluquería y estética a domicilio.'),
  ('clases','GraduationCap',12,'Clases particulares','Tutorías y clases personalizadas a domicilio o en línea.')
), inserted AS (
  INSERT INTO categories (slug, icon, sort_order, is_active)
  SELECT slug, icon, sort_order, true FROM cats
  ON CONFLICT (slug) DO UPDATE SET icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order, is_active=true
  RETURNING id, slug
)
INSERT INTO category_translations (category_id, language_code, name, description)
SELECT i.id, 'es', c.name, c.description FROM inserted i JOIN cats c ON c.slug=i.slug
ON CONFLICT (category_id, language_code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;
