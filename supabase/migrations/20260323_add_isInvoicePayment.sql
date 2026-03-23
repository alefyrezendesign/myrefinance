-- Add isInvoicePayment column to transactions table
-- This flag identifies auto-generated invoice payment transactions,
-- replacing the fragile description.startsWith('Fatura ') check.

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS "isInvoicePayment" boolean DEFAULT false;

-- Backfill existing invoice payment transactions.
-- These are identified by their ID being referenced in faturas.paymentTxId.
UPDATE public.transactions t
SET "isInvoicePayment" = true
FROM public.faturas f
WHERE f."paymentTxId" = t.id;
