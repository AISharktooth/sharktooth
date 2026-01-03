export type PiiPayload = {
  customerName?: string;
  emails?: string[];
  phones?: string[];
  vins?: string[];
  licensePlates?: string[];
  paymentMethods?: string[];
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

const unique = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));

const stripXmlTags = (value: string): string => {
  let result = "";
  let idx = 0;
  while (idx < value.length) {
    const nextTag = value.indexOf("<", idx);
    if (nextTag === -1) {
      result += value.slice(idx);
      break;
    }
    result += value.slice(idx, nextTag);
    const close = value.indexOf(">", nextTag);
    if (close === -1) break;
    idx = close + 1;
  }
  return result.trim();
};

const extractTagValues = (xml: string, tagName: string): string[] => {
  const lower = xml.toLowerCase();
  const openPrefix = `<${tagName.toLowerCase()}`;
  const closeTag = `</${tagName.toLowerCase()}>`;
  const values: string[] = [];
  let idx = 0;

  while (idx < lower.length) {
    const start = lower.indexOf(openPrefix, idx);
    if (start === -1) break;
    const openEnd = lower.indexOf(">", start);
    if (openEnd === -1) break;
    const closeIdx = lower.indexOf(closeTag, openEnd + 1);
    if (closeIdx === -1) break;
    const raw = xml.slice(openEnd + 1, closeIdx);
    const cleaned = stripXmlTags(raw);
    if (cleaned) values.push(cleaned);
    idx = closeIdx + closeTag.length;
  }

  return values;
};

const tagAliases = (names: string[]) => names.flatMap((name) => [name, name.toLowerCase()]);

export const extractPii = (xml: string): PiiPayload | null => {
  const customerNameTags = tagAliases(["customer_name", "customerName", "customer"]);
  const emailTags = tagAliases(["email", "email_address", "emailAddress"]);
  const phoneTags = tagAliases(["phone", "phone_number", "phoneNumber", "phones"]);
  const vinTags = tagAliases(["vin", "vehicle_vin", "vehicleVin"]);
  const licenseTags = tagAliases(["license_plate", "licensePlate", "plate"]);
  const paymentTags = tagAliases(["payment_method", "paymentMethod"]);
  const addressLine1Tags = tagAliases(["address", "address_line1", "addressLine1"]);
  const addressLine2Tags = tagAliases(["address_line2", "addressLine2"]);
  const cityTags = tagAliases(["address_city", "addressCity", "city"]);
  const stateTags = tagAliases(["address_state", "addressState", "state"]);
  const zipTags = tagAliases(["address_zip", "addressZip", "zip", "postal_code", "postalCode"]);

  const customerNames = unique(customerNameTags.flatMap((tag) => extractTagValues(xml, tag)));
  const emails = unique(emailTags.flatMap((tag) => extractTagValues(xml, tag)));
  const phones = unique(phoneTags.flatMap((tag) => extractTagValues(xml, tag)));
  const vins = unique(vinTags.flatMap((tag) => extractTagValues(xml, tag)));
  const licensePlates = unique(licenseTags.flatMap((tag) => extractTagValues(xml, tag)));
  const paymentMethods = unique(paymentTags.flatMap((tag) => extractTagValues(xml, tag)));

  const addressLine1 = unique(addressLine1Tags.flatMap((tag) => extractTagValues(xml, tag)))[0];
  const addressLine2 = unique(addressLine2Tags.flatMap((tag) => extractTagValues(xml, tag)))[0];
  const city = unique(cityTags.flatMap((tag) => extractTagValues(xml, tag)))[0];
  const state = unique(stateTags.flatMap((tag) => extractTagValues(xml, tag)))[0];
  const zip = unique(zipTags.flatMap((tag) => extractTagValues(xml, tag)))[0];

  const payload: PiiPayload = {};
  if (customerNames.length) payload.customerName = customerNames[0];
  if (emails.length) payload.emails = emails;
  if (phones.length) payload.phones = phones;
  if (vins.length) payload.vins = vins;
  if (licensePlates.length) payload.licensePlates = licensePlates;
  if (paymentMethods.length) payload.paymentMethods = paymentMethods;
  if (addressLine1 || addressLine2 || city || state || zip) {
    payload.address = {};
    if (addressLine1) payload.address.line1 = addressLine1;
    if (addressLine2) payload.address.line2 = addressLine2;
    if (city) payload.address.city = city;
    if (state) payload.address.state = state;
    if (zip) payload.address.zip = zip;
  }

  return Object.keys(payload).length ? payload : null;
};
