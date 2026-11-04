-- Training certificates: one authoritative, verifiable record per issued certificate.
-- Public lookups go through server routes (service role); RLS is enabled with no policies.

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_code TEXT NOT NULL UNIQUE,
  registration_id UUID UNIQUE REFERENCES public.training_registrations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL,

  -- Snapshot of what is printed on the certificate (immutable after issue)
  recipient_name TEXT NOT NULL,
  company_name TEXT,
  course_title TEXT NOT NULL,
  completed_on DATE NOT NULL,
  expires_on DATE,

  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'superseded')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- HMAC-SHA256 over the canonical snapshot fields; detects out-of-band edits to this row
  signature TEXT NOT NULL,
  issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_session_id ON public.certificates(session_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.certificates IS 'Issued training certificates. verification_code is printed on the certificate and resolved by /verify/[code].';
COMMENT ON COLUMN public.certificates.signature IS 'HMAC-SHA256 of the canonical snapshot (see src/lib/certificates.ts).';

-- Snapshot fields cannot change after issue; only status/revocation columns may be updated.
CREATE OR REPLACE FUNCTION public.certificates_protect_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS DISTINCT FROM OLD.verification_code
     OR NEW.recipient_name IS DISTINCT FROM OLD.recipient_name
     OR NEW.company_name IS DISTINCT FROM OLD.company_name
     OR NEW.course_title IS DISTINCT FROM OLD.course_title
     OR NEW.completed_on IS DISTINCT FROM OLD.completed_on
     OR NEW.expires_on IS DISTINCT FROM OLD.expires_on
     OR NEW.signature IS DISTINCT FROM OLD.signature
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
    RAISE EXCEPTION 'Issued certificate fields are immutable; revoke and re-issue instead';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certificates_protect_snapshot ON public.certificates;
CREATE TRIGGER certificates_protect_snapshot
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.certificates_protect_snapshot();
