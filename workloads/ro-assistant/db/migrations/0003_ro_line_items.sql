BEGIN;

-- Labor Line Items (template supports oil/filter change line)
CREATE TABLE IF NOT EXISTS app.ro_labor_lines (
  labor_id        uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  ro_id           uuid NOT NULL REFERENCES app.repair_orders(ro_id) ON DELETE CASCADE,
  operation       text,
  description     text,
  technician_name text,
  technician_code text,
  amount          numeric(10,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.ro_labor_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS labor_tenant_isolation ON app.ro_labor_lines;
CREATE POLICY labor_tenant_isolation
ON app.ro_labor_lines
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

-- Parts Line Items (template supports part_number/qty/unit/line total)
CREATE TABLE IF NOT EXISTS app.ro_parts_lines (
  part_line_id  uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  ro_id         uuid NOT NULL REFERENCES app.repair_orders(ro_id) ON DELETE CASCADE,
  part_number   text,
  description   text,
  quantity      numeric(10,2),
  unit_price    numeric(10,2),
  line_total    numeric(10,2),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.ro_parts_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parts_tenant_isolation ON app.ro_parts_lines;
CREATE POLICY parts_tenant_isolation
ON app.ro_parts_lines
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

COMMIT;
