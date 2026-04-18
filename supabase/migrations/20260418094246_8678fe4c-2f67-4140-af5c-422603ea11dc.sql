CREATE TABLE public.activity_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NULL,
  user_email text NULL,
  message text NOT NULL,
  context_city text NULL,
  context_category text NULL,
  context_day_filter text NULL,
  status text NOT NULL DEFAULT 'new',
  admin_notes text NULL
);

ALTER TABLE public.activity_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (auth or anon) may submit a preference
CREATE POLICY "Anyone can submit activity requests"
ON public.activity_requests
FOR INSERT
TO public
WITH CHECK (
  char_length(message) >= 2
  AND char_length(message) <= 300
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Users can view their own submissions
CREATE POLICY "Users can view own activity requests"
ON public.activity_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can view all activity requests"
ON public.activity_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update activity requests"
ON public.activity_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete activity requests"
ON public.activity_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_activity_requests_updated_at
BEFORE UPDATE ON public.activity_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for admin listing
CREATE INDEX idx_activity_requests_created_at ON public.activity_requests (created_at DESC);
CREATE INDEX idx_activity_requests_status ON public.activity_requests (status);