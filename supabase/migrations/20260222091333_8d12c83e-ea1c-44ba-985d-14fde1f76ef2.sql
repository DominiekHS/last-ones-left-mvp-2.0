CREATE OR REPLACE VIEW public.consumer_activity_history
WITH (security_invoker=on) AS
SELECT v.id AS voucher_id,
    v.user_id,
    d.id AS deal_id,
    d.title,
    d.start_time,
    d.city,
    m.company_name AS merchant_name,
    v.claimed_at,
    CASE
        WHEN (d.start_time < now()) THEN GREATEST(d.start_time, v.claimed_at)
        ELSE NULL::timestamp with time zone
    END AS completed_at
FROM ((vouchers v
    JOIN deals d ON ((d.id = v.deal_id)))
    JOIN merchants m ON ((m.id = d.merchant_id)));