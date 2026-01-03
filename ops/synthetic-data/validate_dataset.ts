import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(__dirname, "ro_documents");

const hasValue = (value: string) => value.trim().length > 0;

const errors: string[] = [];

const addError = (message: string) => {
  errors.push(message);
};

const ensureXmlWellFormed = (xml: string, fileName: string) => {
  const tagRegex = /<[^>]+>/g;
  const stack: string[] = [];
  let rootName = "";
  let rootClosed = false;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const tag = match[0];
    if (tag.startsWith("<?") || tag.startsWith("<!--") || tag.startsWith("<!")) continue;
    const isClosing = tag.startsWith("</");
    const isSelfClosing = tag.endsWith("/>");
    const nameMatch = tag.match(/^<\/?\s*([^\s/>]+)[^>]*>/);
    if (!nameMatch) {
      addError(`${fileName}: malformed tag ${tag}`);
      return;
    }
    const name = nameMatch[1];

    if (isClosing) {
      if (!stack.length || stack[stack.length - 1] !== name) {
        addError(`${fileName}: mismatched closing tag </${name}>`);
        return;
      }
      stack.pop();
      if (!stack.length) {
        rootClosed = true;
      }
      continue;
    }

    if (rootClosed && stack.length === 0) {
      addError(`${fileName}: multiple root elements detected`);
      return;
    }

    if (!stack.length) {
      rootName = rootName || name;
      if (rootName !== "repair_order") {
        addError(`${fileName}: root element must be <repair_order>`);
        return;
      }
    }

    if (!isSelfClosing) {
      stack.push(name);
    }
  }

  if (stack.length) {
    addError(`${fileName}: unclosed tag <${stack[stack.length - 1]}>`);
  }
};

const extractTagValue = (xml: string, tagName: string) => {
  const re = new RegExp(`<${tagName}>\\s*([^<]+)\\s*</${tagName}>`, "i");
  const match = xml.match(re);
  return match ? match[1].trim() : "";
};

const requireTag = (xml: string, fileName: string, tagName: string) => {
  const value = extractTagValue(xml, tagName);
  if (!hasValue(value)) addError(`${fileName}: missing <${tagName}>`);
  return value;
};

const requireSyntheticEmail = (value: string, fileName: string) => {
  if (!value.endsWith("@example.test")) {
    addError(`${fileName}: email must use @example.test`);
  }
};

const requireSyntheticPhone = (value: string, fileName: string) => {
  if (!value.startsWith("555-")) {
    addError(`${fileName}: phone must use 555-###-#### synthetic range`);
  }
};

const requireSyntheticVin = (value: string, fileName: string) => {
  if (!value.startsWith("SYNTHVIN") || value.length !== 17) {
    addError(`${fileName}: vin must be a 17-char synthetic value starting with SYNTHVIN`);
  }
};

const hasDiagnosticEntry = (xml: string) => {
  return /<diagnostic_entry>\s*<diagnostic_text>[^<]+<\/diagnostic_text>\s*<\/diagnostic_entry>/i.test(xml);
};

const hasLaborOperation = (xml: string) => {
  return /<labor_operation>\s*<opcode>[^<]+<\/opcode>/i.test(xml);
};

if (!fs.existsSync(DOCS_DIR)) {
  console.error(`ERROR: Document directory not found: ${DOCS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(DOCS_DIR);
if (!files.length) {
  console.error(`ERROR: No files found in ${DOCS_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(DOCS_DIR, file);
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) continue;
  if (!file.toLowerCase().endsWith(".xml")) {
    addError(`${file}: non-XML file found in ro_documents`);
    continue;
  }

  const xml = fs.readFileSync(filePath, "utf8");
  if (!xml.trim()) {
    addError(`${file}: empty file`);
    continue;
  }

  ensureXmlWellFormed(xml, file);

  const roNumber = extractTagValue(xml, "ro_number");
  if (!roNumber) addError(`${file}: missing <ro_number>`);

  const baseName = path.basename(file, ".xml");
  if (roNumber && roNumber !== baseName) {
    addError(`${file}: filename does not match RO number (${roNumber})`);
  }

  if (!hasDiagnosticEntry(xml)) {
    addError(`${file}: missing technician diagnostic entry`);
  }

  if (!hasLaborOperation(xml)) {
    addError(`${file}: missing labor operation`);
  }

  const customerName = requireTag(xml, file, "customer_name");
  const email = requireTag(xml, file, "email");
  const phone = requireTag(xml, file, "phone");
  const address = requireTag(xml, file, "address");
  const city = requireTag(xml, file, "address_city");
  const state = requireTag(xml, file, "address_state");
  const zip = requireTag(xml, file, "address_zip");
  const license = requireTag(xml, file, "license_plate");
  const payment = requireTag(xml, file, "payment_method");
  const vin = requireTag(xml, file, "vin");

  if (hasValue(customerName) && customerName.includes("PLACEHOLDER")) {
    addError(`${file}: customer_name contains placeholder text`);
  }
  if (hasValue(address) && address.includes("PLACEHOLDER")) {
    addError(`${file}: address contains placeholder text`);
  }
  if (hasValue(city) && city.includes("PLACEHOLDER")) {
    addError(`${file}: address_city contains placeholder text`);
  }
  if (hasValue(state) && state.includes("PLACEHOLDER")) {
    addError(`${file}: address_state contains placeholder text`);
  }
  if (hasValue(zip) && zip.includes("PLACEHOLDER")) {
    addError(`${file}: address_zip contains placeholder text`);
  }
  if (hasValue(license) && license.includes("PLACEHOLDER")) {
    addError(`${file}: license_plate contains placeholder text`);
  }
  if (hasValue(payment) && payment.includes("PLACEHOLDER")) {
    addError(`${file}: payment_method contains placeholder text`);
  }

  requireSyntheticEmail(email, file);
  requireSyntheticPhone(phone, file);
  requireSyntheticVin(vin, file);
}

if (errors.length) {
  for (const message of errors) console.error(`ERROR: ${message}`);
  process.exit(1);
}

console.log("Validation passed.");
