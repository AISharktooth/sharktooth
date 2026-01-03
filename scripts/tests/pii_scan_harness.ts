import { extractPii } from "../../workloads/ro-assistant/src/services/pii/piiExtract";

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

const payload = extractPii(sample);
if (!payload) {
  console.error("PII was not detected for XML sample");
  process.exit(1);
}

if (!payload.customerName || !payload.emails?.length || !payload.phones?.length || !payload.vins?.length) {
  console.error("PII payload missing expected fields", payload);
  process.exit(1);
}

console.log("PII scan harness passed: XML fields detected.");
