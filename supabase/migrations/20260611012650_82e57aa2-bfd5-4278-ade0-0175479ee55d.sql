
-- Enable realtime for messaging tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Helper RPC: accept quote atomically (sets quote accepted, rejects others, updates request)
CREATE OR REPLACE FUNCTION public.accept_quote(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id uuid;
  _professional_id uuid;
  _client_id uuid;
  _conversation_id uuid;
BEGIN
  -- Verify quote exists and caller owns the parent request
  SELECT q.request_id, q.professional_id, r.client_id
    INTO _request_id, _professional_id, _client_id
  FROM public.quotes q
  JOIN public.service_requests r ON r.id = q.request_id
  WHERE q.id = _quote_id;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  IF _client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only request owner can accept quotes';
  END IF;

  -- Accept this quote, reject siblings
  UPDATE public.quotes SET status = 'accepted', updated_at = now()
  WHERE id = _quote_id;
  UPDATE public.quotes SET status = 'rejected', updated_at = now()
  WHERE request_id = _request_id AND id <> _quote_id AND status = 'pending';

  -- Assign request
  UPDATE public.service_requests
  SET assigned_quote_id = _quote_id,
      assigned_professional_id = _professional_id,
      status = 'assigned',
      updated_at = now()
  WHERE id = _request_id;

  -- Get or create conversation
  SELECT id INTO _conversation_id FROM public.conversations
  WHERE request_id = _request_id AND client_id = _client_id AND professional_id = _professional_id
  LIMIT 1;

  IF _conversation_id IS NULL THEN
    INSERT INTO public.conversations (request_id, client_id, professional_id)
    VALUES (_request_id, _client_id, _professional_id)
    RETURNING id INTO _conversation_id;
  END IF;

  RETURN _conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_quote(uuid) TO authenticated;
