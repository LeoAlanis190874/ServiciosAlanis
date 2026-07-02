
REVOKE ALL ON FUNCTION public.notify_quote_inserted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_quote_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_message_inserted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_request_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_review_inserted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_request_status(uuid, request_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_request_status(uuid, request_status) TO authenticated;
