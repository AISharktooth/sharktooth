BEGIN;

-- Documents (source file records)
CREATE TABLE IF NOT EXISTS app.documents (
  doc_id        uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  filename      text NOT NULL,
  mime_type     text NOT NULL,
  sha256        bytea NOT NULL,
  storage_path  text NOT NULL,
  status        text NOT NULL DEFAULT 'stored',
  created_by    uuid NOT NULL REFERENCES app.users(user_id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sha256)
);

ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_tenant_isolation ON app.documents;
CREATE POLICY documents_tenant_isolation
ON app.documents
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

-- Repair Orders (derived from attached RO template o.pdf)
CREATE TABLE IF NOT EXISTS app.repair_orders (
  ro_id              uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  doc_id             uuid NOT NULL REFERENCES app.documents(doc_id) ON DELETE CASCADE,

  ro_number          text NOT NULL,
  ro_open_date       date,
  ro_close_date      date,
  ro_status          text,

  advisor_name       text,
  advisor_tag        text,

  technician_name    text,
  technician_code    text,

  vehicle_year       int,
  vehicle_make       text,
  vehicle_model      text,
  vehicle_color      text,

  mileage_in         int,
  mileage_out        int,
  in_service_date    date,
  delivery_date      date,

  labor_total        numeric(10,2),
  parts_total        numeric(10,2),
  sublet_total       numeric(10,2),
  shop_supplies      numeric(10,2),
  hazardous_total    numeric(10,2),
  tax_total          numeric(10,2),
  discount_total     numeric(10,2),
  total_due          numeric(10,2),

  created_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, ro_number)
);

ALTER TABLE app.repair_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ro_tenant_isolation ON app.repair_orders;
CREATE POLICY ro_tenant_isolation
ON app.repair_orders
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

COMMIT;
