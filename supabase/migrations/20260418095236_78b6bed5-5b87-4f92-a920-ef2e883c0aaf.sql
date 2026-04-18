DROP POLICY IF EXISTS "Anyone can submit activity requests" ON public.activity_requests;

CREATE POLICY "Consumers can submit activity requests"
ON public.activity_requests
FOR INSERT
TO authenticated
WITH CHECK (
  char_length(message) >= 2
  AND char_length(message) <= 300
  AND user_id = auth.uid()
  AND has_role(auth.uid(), 'consumer'::app_role)
);