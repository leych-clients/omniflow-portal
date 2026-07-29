-- Job openings for careers (managed in admin, published on omniflow.com)

CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
  summary TEXT,
  description TEXT,
  apply_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('open', 'closed', 'draft')),
  posted_at DATE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_openings_status_sort_idx
  ON job_openings (status, sort_order ASC, posted_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS job_openings_slug_idx ON job_openings (slug);

ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;

-- Authenticated portal users may read open roles; marketing site uses service role via API.
CREATE POLICY "job_openings_select_open"
  ON job_openings
  FOR SELECT
  TO authenticated
  USING (status = 'open');

-- Reuse shared updated_at trigger if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at'
  ) THEN
    CREATE TRIGGER job_openings_updated_at
      BEFORE UPDATE ON job_openings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Seed placeholder openings (safe to re-run: skip if slug exists)
INSERT INTO job_openings (
  title, slug, department, location, employment_type, summary, description, status, posted_at, sort_order
)
SELECT
  'Firmware Engineer',
  'firmware-engineer',
  'Engineering',
  'Sugar Land, TX',
  'full_time',
  'Design and maintain embedded firmware for OMNI flow computers used in custody transfer worldwide.',
  $html$
<p>OMNI Flow Computers is looking for a Firmware Engineer to help design and evolve the embedded software that powers our industry-leading custody transfer systems.</p>
<h3>What you&rsquo;ll do</h3>
<ul>
  <li>Develop and maintain firmware for OMNI flow computer platforms</li>
  <li>Collaborate with hardware, QA, and product teams on new features and lifecycle updates</li>
  <li>Write clear technical documentation and support field issues when needed</li>
</ul>
<h3>What we&rsquo;re looking for</h3>
<ul>
  <li>Strong experience with C/C++ on embedded systems</li>
  <li>Comfort with real-time constraints, communications protocols, and rigorous testing</li>
  <li>Interest in oil &amp; gas measurement or industrial automation is a plus</li>
</ul>
<p><em>This is a placeholder listing for site development. Replace with a live posting before promoting widely.</em></p>
$html$,
  'open',
  CURRENT_DATE,
  10
WHERE NOT EXISTS (SELECT 1 FROM job_openings WHERE slug = 'firmware-engineer');

INSERT INTO job_openings (
  title, slug, department, location, employment_type, summary, description, status, posted_at, sort_order
)
SELECT
  'Customer Support Specialist',
  'customer-support-specialist',
  'Customer Support',
  'Sugar Land, TX / Hybrid',
  'full_time',
  'Help customers configure, operate, and maintain OMNI systems with clear technical guidance.',
  $html$
<p>Join OMNI&rsquo;s support team and help customers worldwide keep custody transfer systems running accurately and reliably.</p>
<h3>What you&rsquo;ll do</h3>
<ul>
  <li>Respond to technical support requests via email, phone, and the customer portal</li>
  <li>Guide customers through configuration, troubleshooting, and best practices</li>
  <li>Escalate complex issues and contribute to knowledge base articles</li>
</ul>
<h3>What we&rsquo;re looking for</h3>
<ul>
  <li>Clear written and verbal communication skills</li>
  <li>Experience supporting industrial hardware/software or related technical products</li>
  <li>Patience, organization, and a customer-first mindset</li>
</ul>
<p><em>This is a placeholder listing for site development. Replace with a live posting before promoting widely.</em></p>
$html$,
  'open',
  CURRENT_DATE,
  20
WHERE NOT EXISTS (SELECT 1 FROM job_openings WHERE slug = 'customer-support-specialist');
