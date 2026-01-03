import { redactPii } from "../../workloads/ro-assistant/src/services/ingest/redact";

const sample = `<repair_order>
  <customer_name>Jane Roe</customer_name>
  <email>jane.roe@example.com</email>
  <phone>555-123-4567</phone>
  <vin>1HGCM82633A123456</vin>
  <license_plate>ABC1234</license_plate>
  <payment_method>Visa</payment_method>
  <address>123 Main St</address>
  <address_city>Springfield</address_city>
  <address_state>IL</address_state>
  <address_zip>62704</address_zip>
</repair_order>`;

const redacted = redactPii(sample);
const checks = [
  "Jane Roe",
  "jane.roe@example.com",
  "555-123-4567",
  "1HGCM82633A123456",
  "ABC1234",
  "Visa",
  "123 Main St",
  "Springfield",
  "IL",
  "62704"
];

const leaked = checks.find((value) => redacted.includes(value));
if (leaked) {
  console.error("PII detected in redacted XML:", leaked);
  process.exit(1);
}

console.log("Redaction harness passed: XML fields redacted.");
