-- Update goal names to be display-friendly (remove dashes, proper formatting)
-- This makes the names suitable for dropdowns and UI displays

UPDATE public.track_goals
SET name = CASE
  WHEN name = 'agency-1k' THEN '$1K Agency'
  WHEN name = 'agency-5k' THEN '$5K Agency'
  WHEN name = 'agency-10k' THEN '$10K Agency'
  WHEN name = 'agency-30k' THEN '$30K Agency'
  WHEN name = 'agency-50k' THEN '$50K Agency'
  WHEN name = 'agency-100k' THEN '$100K Agency'
  WHEN name = 'agency-250k' THEN '$250K Agency'
  WHEN name = 'agency-500k' THEN '$500K Agency'
  WHEN name = 'saas-1k-mrr' THEN '$1K SaaS MRR'
  WHEN name = 'saas-3k-mrr' THEN '$3K SaaS MRR'
  WHEN name = 'saas-5k-mrr' THEN '$5K SaaS MRR'
  WHEN name = 'saas-10k-mrr' THEN '$10K SaaS MRR'
  WHEN name = 'saas-20k-mrr' THEN '$20K SaaS MRR'
  -- Handle any older goal names that might still exist
  WHEN name = 'Build $10k/month Agency' THEN '$10K Agency'
  WHEN name = 'Optimize for 80% Margins' THEN 'Agency Optimization'
  WHEN name = 'Scale to $25k/month' THEN '$25K Agency'
  WHEN name = 'Build First SaaS MVP' THEN 'SaaS MVP'
  WHEN name = 'Reach $5k MRR' THEN '$5K SaaS MRR'
  WHEN name = 'Scale to $20k MRR' THEN '$20K SaaS MRR'
  ELSE name  -- Keep existing name if no match
END
WHERE name IN (
  'agency-1k', 'agency-5k', 'agency-10k', 'agency-30k', 'agency-50k', 'agency-100k', 'agency-250k', 'agency-500k',
  'saas-1k-mrr', 'saas-3k-mrr', 'saas-5k-mrr', 'saas-10k-mrr', 'saas-20k-mrr',
  'Build $10k/month Agency', 'Optimize for 80% Margins', 'Scale to $25k/month',
  'Build First SaaS MVP', 'Reach $5k MRR', 'Scale to $20k MRR'
);