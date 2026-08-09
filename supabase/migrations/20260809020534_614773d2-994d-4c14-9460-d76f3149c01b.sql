REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

SELECT cron.alter_job(
  1,
  command := $$
  SELECT net.http_post(
    url:='https://project--ff0c2448-cbe2-42d2-983d-857b5a63a617.lovable.app/api/public/hooks/sync-sheets',
    headers:='{"Content-Type": "application/json", "x-sync-token": "3b45fc36294666993a1fcb49d43ee2af80a563717d1dcbc99a90349216a5b8b0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);