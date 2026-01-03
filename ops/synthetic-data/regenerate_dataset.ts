import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(__dirname, "ro_documents");

const firstNames = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Avery",
  "Cameron",
  "Drew",
  "Logan"
];

const lastNames = [
  "Parker",
  "Reed",
  "Morgan",
  "Hayes",
  "Brooks",
  "Foster",
  "Reyes",
  "Sullivan",
  "Griffin",
  "Coleman"
];

const streets = [
  "Maple St",
  "Oak Ave",
  "Cedar Blvd",
  "Pine Dr",
  "Elm St",
  "Willow Ln",
  "Birch Ct",
  "Ash Rd",
  "Spruce Way",
  "Lakeview Rd"
];

const cities = ["Springfield", "Riverside", "Fairview", "Madison", "Georgetown"];
const states = ["CA", "TX", "FL", "IL", "WA"];
const zips = ["90001", "73301", "33101", "60601", "98101"];

const paymentMethods = ["Visa", "Mastercard", "Amex", "Cash", "Warranty"];

const ensureDir = () => {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
};

const pad4 = (value: number) => value.toString().padStart(4, "0");
const pad9 = (value: number) => value.toString().padStart(9, "0");

const buildCustomerBlock = (index: number) => {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[index % lastNames.length];
  const name = `${first} ${last}`;
  const email = `${first}.${last}.${pad4(index + 1)}@example.test`.toLowerCase();
  const phone = `555-${(100 + (index % 900)).toString().padStart(3, "0")}-${(
    1000 + ((index * 7) % 9000)
  ).toString().padStart(4, "0")}`;
  const address = `${100 + (index % 800)} ${streets[index % streets.length]}`;
  const city = cities[index % cities.length];
  const state = states[index % states.length];
  const zip = zips[index % zips.length];
  const license = `DEMO${(1000 + index).toString().slice(-4)}`;
  const payment = paymentMethods[index % paymentMethods.length];

  return [
    "  <customer>",
    `    <customer_name>${name}</customer_name>`,
    `    <email>${email}</email>`,
    `    <phone>${phone}</phone>`,
    `    <address>${address}</address>`,
    `    <address_city>${city}</address_city>`,
    `    <address_state>${state}</address_state>`,
    `    <address_zip>${zip}</address_zip>`,
    `    <license_plate>${license}</license_plate>`,
    `    <payment_method>${payment}</payment_method>`,
    "  </customer>"
  ].join("\n");
};

const updateXml = (xml: string, index: number) => {
  const roNumber = `RO-${pad4(index + 1)}`;
  const vin = `SYNTHVIN${pad9(index + 1)}`;
  let updated = xml;
  updated = updated.replace(/<ro_number>[\s\S]*?<\/ro_number>/i, `<ro_number>${roNumber}</ro_number>`);
  updated = updated.replace(/<vin>[\s\S]*?<\/vin>/i, `<vin>${vin}</vin>`);

  if (updated.includes("<customer>")) {
    updated = updated.replace(/<customer>[\s\S]*?<\/customer>/i, buildCustomerBlock(index));
  } else {
    updated = updated.replace(/<\/vehicle>/i, `</vehicle>\n${buildCustomerBlock(index)}`);
  }

  return { roNumber, xml: updated };
};

const wipeExistingDocs = () => {
  if (!fs.existsSync(DOCS_DIR)) return;
  const files = fs.readdirSync(DOCS_DIR).filter((file) => file.toLowerCase().endsWith(".xml"));
  for (const file of files) {
    fs.unlinkSync(path.join(DOCS_DIR, file));
  }
};

const readSourceDocs = (): string[] => {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const files = fs.readdirSync(DOCS_DIR).filter((file) => file.toLowerCase().endsWith(".xml"));
  return files.map((file) => fs.readFileSync(path.join(DOCS_DIR, file), "utf8"));
};

const writeDocs = (docs: { roNumber: string; xml: string }[]) => {
  for (const doc of docs) {
    fs.writeFileSync(path.join(DOCS_DIR, `${doc.roNumber}.xml`), doc.xml);
  }
};

const main = () => {
  ensureDir();
  const sourceDocs = readSourceDocs();
  if (!sourceDocs.length) {
    console.error("No source XML documents found to regenerate.");
    process.exit(1);
  }

  const regenerated = sourceDocs.map((xml, index) => updateXml(xml, index));
  wipeExistingDocs();
  writeDocs(regenerated);

  console.log(`Regenerated ${regenerated.length} synthetic RO documents with synthetic PII.`);
};

main();
