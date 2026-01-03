# Synthetic Repair Order XML Schema

Purpose: Define the canonical XML structure for synthetic Repair Orders.

## Format
- XML only
- One `repair_order` per file
- All identifiers must be synthetic placeholders
- Synthetic PII is allowed for demo; no real customer data

## Root Element
- `repair_order`
  - Attributes:
    - `schema_version` (placeholder; required)

## Required Sections

### RO Header
- `ro_header` (required)
  - `ro_number` (required; synthetic placeholder)
  - `open_date` (required; ISO-8601 date placeholder)
  - `close_date` (required; ISO-8601 date placeholder)
  - `status` (required; placeholder, e.g., <STATUS>)
  - `advisor_id` (required; placeholder, e.g., <ADVISOR_ID>)
  - `technician_id` (required; placeholder, e.g., <TECH_ID>)

### Vehicle Information
- `vehicle` (required)
  - `model_year` (required; placeholder, e.g., <MODEL_YEAR>)
  - `make` (required; placeholder, e.g., <MAKE>)
  - `model` (required; placeholder, e.g., <MODEL>)
  - `vin` (required; synthetic VIN value)

### Customer Information
- `customer` (required)
  - `customer_name` (required; synthetic)
  - `email` (required; synthetic, e.g., @example.test)
  - `phone` (required; synthetic, e.g., 555-###-####)
  - `address` (required; synthetic)
  - `address_city` (required; synthetic)
  - `address_state` (required; synthetic)
  - `address_zip` (required; synthetic)
  - `license_plate` (required; synthetic)
  - `payment_method` (required; synthetic)

### Customer Concern
- `customer_concern` (required)
  - `concern_text` (required; free-text)

### Technician Diagnostics
- `technician_diagnostics` (required)
  - `diagnostic_entry` (repeatable; one or more)
    - `diagnostic_text` (required; free-text)

### Labor Operations
- `labor_operations` (required; one or more `labor_operation`)
  - `labor_operation` (repeatable)
    - `opcode` (required; synthetic)
    - `description` (required)
    - `hours` (required; numeric)
    - `labor_rate` (required; numeric, fixed at 275.00)
    - `labor_cost` (required; numeric)

### Parts Line Items
- `parts` (required; zero or more `part`)
  - `part` (repeatable)
    - `part_number` (required; placeholder, e.g., <PART_NUMBER>)
    - `description` (required)
    - `quantity` (required; numeric)
    - `unit_price` (required; numeric)
    - `line_total` (required; numeric)

### Repair Outcome / Resolution Notes
- `resolution` (required)
  - `outcome_notes` (required; free-text)

## Validation Notes
- All required elements must be present.
- One `repair_order` per XML file.
- Placeholders must be used for all identifiers.
- Dates must be in ISO-8601 format.
- Numeric fields must contain only numbers and decimal points.
- Extensions should add new optional elements without changing existing element meanings.
