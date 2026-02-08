
-- Add inactive tracking and soft delete columns to vouchers
ALTER TABLE public.vouchers
  ADD COLUMN became_inactive_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for cleanup queries
CREATE INDEX idx_vouchers_inactive_cleanup 
  ON public.vouchers (became_inactive_at) 
  WHERE deleted_at IS NULL AND became_inactive_at IS NOT NULL;

-- Index for default active query
CREATE INDEX idx_vouchers_deleted_at 
  ON public.vouchers (deleted_at) 
  WHERE deleted_at IS NULL;
