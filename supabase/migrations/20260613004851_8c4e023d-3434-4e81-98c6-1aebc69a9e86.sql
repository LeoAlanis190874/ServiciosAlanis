
-- 1) Transition function for request status
CREATE OR REPLACE FUNCTION public.transition_request_status(_request_id uuid, _new_status request_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.service_requests;
  _uid uuid := auth.uid();
  _is_client boolean;
  _is_prof boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _r FROM public.service_requests WHERE id = _request_id;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  _is_client := (_r.client_id = _uid);
  _is_prof := (_r.assigned_professional_id = _uid);
  IF NOT (_is_client OR _is_prof OR public.has_role(_uid, 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Allowed transitions
  IF _new_status = 'in_progress' THEN
    IF _r.status <> 'assigned' THEN RAISE EXCEPTION 'Invalid transition'; END IF;
    IF NOT (_is_prof OR _is_client) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  ELSIF _new_status = 'completed' THEN
    IF _r.status NOT IN ('assigned','in_progress') THEN RAISE EXCEPTION 'Invalid transition'; END IF;
    IF NOT _is_client THEN RAISE EXCEPTION 'Only client can mark completed'; END IF;
  ELSIF _new_status = 'cancelled' THEN
    IF _r.status IN ('completed','cancelled','disputed') THEN RAISE EXCEPTION 'Invalid transition'; END IF;
  ELSE
    RAISE EXCEPTION 'Status not allowed via this RPC';
  END IF;

  UPDATE public.service_requests
    SET status = _new_status, updated_at = now()
    WHERE id = _request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_request_status(uuid, request_status) TO authenticated;

-- 2) Notification helper triggers

-- New quote -> notify client
CREATE OR REPLACE FUNCTION public.notify_quote_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client uuid; _title text;
BEGIN
  SELECT client_id, title INTO _client, _title FROM public.service_requests WHERE id = NEW.request_id;
  IF _client IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, payload)
    VALUES (_client, 'quote_received', 'Nueva cotización recibida',
            'Has recibido una cotización para "' || _title || '"',
            jsonb_build_object('request_id', NEW.request_id, 'quote_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_quote_inserted ON public.quotes;
CREATE TRIGGER trg_notify_quote_inserted AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_inserted();

-- Quote status change to accepted/rejected -> notify professional
CREATE OR REPLACE FUNCTION public.notify_quote_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted','rejected') THEN RETURN NEW; END IF;
  SELECT title INTO _title FROM public.service_requests WHERE id = NEW.request_id;
  INSERT INTO public.notifications(user_id, type, title, body, payload)
  VALUES (NEW.professional_id,
          CASE WHEN NEW.status='accepted' THEN 'quote_accepted' ELSE 'quote_rejected' END,
          CASE WHEN NEW.status='accepted' THEN 'Tu cotización fue aceptada' ELSE 'Tu cotización fue rechazada' END,
          'Solicitud: ' || COALESCE(_title,''),
          jsonb_build_object('request_id', NEW.request_id, 'quote_id', NEW.id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_quote_status ON public.quotes;
CREATE TRIGGER trg_notify_quote_status AFTER UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_status();

-- New message -> notify recipient
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client uuid; _prof uuid; _recipient uuid;
BEGIN
  SELECT client_id, professional_id INTO _client, _prof FROM public.conversations WHERE id = NEW.conversation_id;
  _recipient := CASE WHEN NEW.sender_id = _client THEN _prof ELSE _client END;
  IF _recipient IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, payload)
    VALUES (_recipient, 'message_received', 'Nuevo mensaje',
            LEFT(NEW.body, 140),
            jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_message_inserted ON public.messages;
CREATE TRIGGER trg_notify_message_inserted AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_inserted();

-- Request status change to completed -> notify both
CREATE OR REPLACE FUNCTION public.notify_request_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' THEN
    INSERT INTO public.notifications(user_id, type, title, body, payload)
    VALUES (NEW.client_id, 'request_completed', 'Trabajo completado',
            'La solicitud "' || NEW.title || '" se marcó como completada.',
            jsonb_build_object('request_id', NEW.id));
    IF NEW.assigned_professional_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, payload)
      VALUES (NEW.assigned_professional_id, 'request_completed', 'Trabajo completado',
              'El cliente confirmó la finalización de "' || NEW.title || '".',
              jsonb_build_object('request_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_request_completed ON public.service_requests;
CREATE TRIGGER trg_notify_request_completed AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_completed();

-- New review -> notify reviewee
CREATE OR REPLACE FUNCTION public.notify_review_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, payload)
  VALUES (NEW.reviewee_id, 'review_received', 'Has recibido una reseña',
          'Calificación: ' || NEW.rating::text || '/5',
          jsonb_build_object('review_id', NEW.id, 'request_id', NEW.request_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_review_inserted ON public.reviews;
CREATE TRIGGER trg_notify_review_inserted AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_review_inserted();

-- Unique review per (request, reviewer, reviewee)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_request_pair
  ON public.reviews(request_id, reviewer_id, reviewee_id);
