
-- Table for merchant-entered daily sales/refund/redeem data
CREATE TABLE public.deal_sales_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sales INTEGER NOT NULL DEFAULT 0,
  refunds INTEGER NOT NULL DEFAULT 0,
  redeemed INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, date, source)
);

-- Enable RLS
ALTER TABLE public.deal_sales_daily ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own deal sales data
CREATE POLICY "Merchants can view own deal sales"
  ON public.deal_sales_daily FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM deals d JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  ));

-- Merchants can insert sales data for own deals
CREATE POLICY "Merchants can insert own deal sales"
  ON public.deal_sales_daily FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM deals d JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  ));

-- Merchants can update own deal sales data
CREATE POLICY "Merchants can update own deal sales"
  ON public.deal_sales_daily FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM deals d JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  ));

-- Merchants can delete own deal sales data
CREATE POLICY "Merchants can delete own deal sales"
  ON public.deal_sales_daily FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM deals d JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  ));

-- Admins can view all sales data
CREATE POLICY "Admins can view all deal sales"
  ON public.deal_sales_daily FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_deal_sales_daily_deal_date ON public.deal_sales_daily(deal_id, date);
