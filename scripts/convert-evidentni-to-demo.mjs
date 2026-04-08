import fs from "node:fs";
import path from "node:path";

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "demo-imports", "evidentni-demo");
const PROGRAM_TYPE = "Редовна";

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compactLines(lines) {
  return lines.map((line) => nonEmpty(line)).filter(Boolean).join("\n");
}

function compactInline(parts, separator = " · ") {
  return parts.map((part) => nonEmpty(part)).filter(Boolean).join(separator);
}

function hasUsefulObjectValue(value, ignoredKeys = []) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, item]) => {
    if (ignoredKeys.includes(key)) {
      return false;
    }

    if (typeof item === "boolean") {
      return item;
    }

    return nonEmpty(item);
  });
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function formatGrade(profile) {
  return compactInline([profile?.grade, profile?.classSection], " ");
}

function formatSchoolYear(profile) {
  const start = Number(profile?.yearStart);
  const end = Number(profile?.yearEnd);

  if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > 0) {
    return `${start} / ${end}`;
  }

  return "";
}

function summarizeContacts(contacts) {
  const items = (Array.isArray(contacts) ? contacts : [])
    .map((contact) => compactInline([contact?.name, contact?.profession], " - "))
    .filter(Boolean);

  return items.length ? items.join("; ") : "";
}

function summarizeExaminers(examiners) {
  const items = Object.entries(examiners ?? {})
    .map(([slot, name]) => {
      const cleanName = nonEmpty(name);
      return cleanName ? `${slot}: ${cleanName}` : "";
    })
    .filter(Boolean);

  return items.length ? items.join("; ") : "";
}

function summarizeScores(scores) {
  const entries = Object.entries(scores ?? {});
  const numericValues = entries
    .map(([, value]) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value));
  const markValues = entries.filter(([, value]) => value === "√" || value === "X");
  const groups = {};

  for (const [key] of entries) {
    const prefix = key.split("_")[0];
    groups[prefix] = (groups[prefix] ?? 0) + 1;
  }

  const domainSummary = Object.entries(groups)
    .sort(([left], [right]) => left.localeCompare(right, "mk-MK"))
    .map(([key, count]) => `${key}:${count}`)
    .join(", ");

  const average = numericValues.length
    ? (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2)
    : "";

  return compactInline(
    [
      entries.length ? `Скорови: ${entries.length} ставки` : "",
      numericValues.length ? `бројчени ${numericValues.length}` : "",
      markValues.length ? `ознаки ${markValues.length}` : "",
      average ? `просек ${average}` : "",
      domainSummary ? `домени ${domainSummary}` : ""
    ],
    " | "
  );
}

function detectCabinets(record) {
  const cabinets = [];

  if (record?.hearing?.enabled || hasUsefulObjectValue(record?.hearing, ["enabled"])) {
    cabinets.push("surd");
  }

  if (hasUsefulObjectValue(record?.speech)) {
    cabinets.push("logo");
  }

  if (record?.vision?.enabled || hasUsefulObjectValue(record?.vision, ["enabled", "color", "stereo"])) {
    cabinets.push("tifl");
  }

  if (record?.biofeedback?.enabled || hasUsefulObjectValue(record?.biofeedback, ["enabled", "type", "coop"])) {
    cabinets.push("biof");
  }

  return unique(cabinets);
}

function buildDisability(record) {
  return compactLines([
    record?.profile?.diagnosis,
    record?.hearing?.enabled ? record?.hearing?.surdoDiag : "",
    record?.vision?.enabled ? record?.vision?.diag : "",
    record?.speech?.diag
  ]);
}

function buildNotes(record) {
  const profile = record?.profile ?? {};
  const institution = compactInline([profile.institution, profile.place, profile.municipality]);
  const school = compactInline(
    [
      formatGrade(profile),
      formatSchoolYear(profile),
      nonEmpty(profile.schoolType) ? `тип: ${profile.schoolType}` : ""
    ]
  );
  const personal = compactInline(
    [
      nonEmpty(profile.dob) ? `роден: ${profile.dob}` : "",
      nonEmpty(profile.pob) ? `место на раѓање: ${profile.pob}` : ""
    ]
  );
  const contacts = summarizeContacts(record?.contacts);
  const scores = summarizeScores(record?.scores);
  const speech = compactInline(
    [
      nonEmpty(record?.speech?.logoped) ? `логопед: ${record.speech.logoped}` : "",
      record?.speech?.verbal ? `вербално: ${record.speech.verbal}` : "",
      record?.speech?.both ? `комуникација: ${record.speech.both}` : ""
    ]
  );
  const hearing = record?.hearing?.enabled
    ? compactInline(
        [
          nonEmpty(record?.hearing?.surdologist) ? `сурдолог: ${record.hearing.surdologist}` : "",
          nonEmpty(record?.hearing?.aids) ? `апарати: ${record.hearing.aids}` : "",
          nonEmpty(record?.hearing?.opinion) ? `слух: ${record.hearing.opinion}` : ""
        ]
      )
    : "";
  const vision = record?.vision?.enabled
    ? compactInline(
        [
          nonEmpty(record?.vision?.tiflologist) ? `тифлолог: ${record.vision.tiflologist}` : "",
          nonEmpty(record?.vision?.diag) ? `вид: ${record.vision.diag}` : "",
          nonEmpty(record?.vision?.rehab) ? `рехабилитација: ${record.vision.rehab}` : ""
        ]
      )
    : "";

  return compactLines([
    "Демо конверзија од евидентен лист.",
    institution,
    school,
    personal,
    speech,
    hearing,
    vision,
    contacts ? `Контакти: ${contacts}` : "",
    scores,
    record?.id ? `Изворен запис: ${record.id}` : ""
  ]);
}

function buildPhaseA(record) {
  const profile = record?.profile ?? {};
  const contacts = summarizeContacts(record?.contacts);
  const examiners = summarizeExaminers(record?.examiners);

  return {
    date: nonEmpty(record?.placeDate) || nonEmpty(record?._meta?.createdAt),
    observation: compactLines([
      compactInline([profile.institution, profile.place, profile.municipality]),
      compactInline([formatGrade(profile), formatSchoolYear(profile)]),
      compactInline(
        [
          nonEmpty(profile.dob) ? `роден: ${profile.dob}` : "",
          nonEmpty(profile.pob) ? `место на раѓање: ${profile.pob}` : ""
        ]
      ),
      nonEmpty(record?.speech?.verbal),
      nonEmpty(record?.speech?.both)
    ]),
    diagnostics: compactLines([
      buildDisability(record),
      record?.hearing?.enabled ? nonEmpty(record?.hearing?.opinion) : "",
      record?.vision?.enabled ? nonEmpty(record?.vision?.obs) : "",
      nonEmpty(record?.speech?.triage),
      nonEmpty(record?.speech?.artic)
    ]),
    teamConf: compactLines([
      contacts ? `Контакти: ${contacts}` : "",
      examiners ? `Стручни лица: ${examiners}` : "",
      nonEmpty(record?._meta?.createdBy) ? `Креирано од: ${record._meta.createdBy}` : ""
    ])
  };
}

function buildIop(record) {
  const goals = unique([
    hasUsefulObjectValue(record?.speech) ? "Говор и комуникација" : "",
    record?.hearing?.enabled || hasUsefulObjectValue(record?.hearing, ["enabled"]) ? "Аудитивна поддршка" : "",
    record?.vision?.enabled || hasUsefulObjectValue(record?.vision, ["enabled", "color", "stereo"]) ? "Визуелна поддршка" : "",
    summarizeContacts(record?.contacts) ? "Соработка со семејство" : ""
  ]).join("\n");

  const strategies = compactLines([
    nonEmpty(record?.speech?.verbal),
    nonEmpty(record?.speech?.both),
    record?.hearing?.enabled ? nonEmpty(record?.hearing?.opinion) : "",
    record?.vision?.enabled ? nonEmpty(record?.vision?.rehab) : ""
  ]);

  const adaptations = compactLines([
    nonEmpty(record?.hearing?.aids),
    nonEmpty(record?.vision?.correction),
    nonEmpty(record?.vision?.acuity),
    nonEmpty(record?.speech?.nonverbal)
  ]);

  return {
    goals,
    strategies,
    adaptations,
    assistant: ""
  };
}

function buildYearEnd(record) {
  return {
    summary: compactLines([
      "Пренесен демо запис од евидентен лист.",
      summarizeScores(record?.scores),
      "Суровите полиња од изворот се зачувани во _source."
    ]),
    transition: "",
    summerNotes: ""
  };
}

function validateRecord(record, index) {
  const requiredStringFields = ["id", "name", "grade", "disability", "notes", "programType"];

  for (const key of requiredStringFields) {
    if (typeof record[key] !== "string") {
      throw new Error(`Record ${index + 1} is missing string field "${key}".`);
    }
  }

  if (!["Редовна", "Модифицирана", "Индивидуална"].includes(record.programType)) {
    throw new Error(`Record ${index + 1} has invalid programType "${record.programType}".`);
  }

  if (!Array.isArray(record.cabinets)) {
    throw new Error(`Record ${index + 1} is missing cabinets array.`);
  }

  if (typeof record.phaseA !== "object" || typeof record.iop !== "object" || typeof record.yearEnd !== "object") {
    throw new Error(`Record ${index + 1} is missing nested sections.`);
  }
}

function convertRecord(record, index, inputPath) {
  const profile = record?.profile ?? {};
  const name = nonEmpty(profile.fullName) || `Ученик ${index + 1}`;

  const converted = {
    id: nonEmpty(record?.id) || `demo-${index + 1}`,
    name,
    grade: formatGrade(profile),
    disability: buildDisability(record),
    notes: buildNotes(record),
    cabinets: detectCabinets(record),
    programType: PROGRAM_TYPE,
    phaseA: buildPhaseA(record),
    exercises: {},
    quarters: [],
    iop: buildIop(record),
    yearEnd: buildYearEnd(record),
    _meta: {
      createdAt: nonEmpty(record?._meta?.createdAt),
      createdBy: nonEmpty(record?._meta?.createdBy) || "demo-import",
      lastEditedAt: nonEmpty(record?._meta?.lastEditedAt) || nonEmpty(record?._meta?.createdAt),
      lastEditedBy: nonEmpty(record?._meta?.lastEditedBy) || nonEmpty(record?._meta?.createdBy) || "demo-import"
    },
    _conversion: {
      sourceFile: inputPath,
      sourceSchoolYear: formatSchoolYear(profile),
      generatedAt: new Date().toISOString(),
      assumedProgramType: PROGRAM_TYPE
    },
    _source: record
  };

  validateRecord(converted, index);
  return converted;
}

function main() {
  const inputPath = process.argv[2];
  const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_DIR;

  if (!inputPath) {
    console.error("Usage: node scripts/convert-evidentni-to-demo.mjs <input.json> [output-dir]");
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  const raw = fs.readFileSync(resolvedInput, "utf8");
  const source = JSON.parse(raw);

  if (!Array.isArray(source)) {
    throw new Error("Expected the source JSON to be an array of students.");
  }

  const converted = source.map((record, index) => convertRecord(record, index, resolvedInput));
  const manifest = converted.map((record, index) => ({
    index: index + 1,
    id: record.id,
    name: record.name,
    grade: record.grade,
    cabinets: record.cabinets,
    file: `${String(index + 1).padStart(2, "0")}-${slugify(record.name) || "student"}.json`
  }));

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "README.md"),
    [
      "# Demo-compatible legacy JSON",
      "",
      "- `all-students.legacy.json` contains all converted students.",
      "- Individual `NN-name.json` files contain a single student record and are easier to use with the current one-plan import UI.",
      "- The `_source` field preserves the original evidential-list record.",
      "- `programType` is assumed as `Редовна` unless you adjust it manually."
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "all-students.legacy.json"), `${JSON.stringify(converted, null, 2)}\n`, "utf8");

  for (const [index, record] of converted.entries()) {
    const fileName = manifest[index].file;
    fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }

  console.log(`Converted ${converted.length} students.`);
  console.log(`Output directory: ${outputDir}`);
}

main();
