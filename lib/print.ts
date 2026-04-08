import { LEVEL_LABELS, QUARTER_LABELS, SCALE_LABELS, getCabinetById } from "@/lib/catalog/akciski-plan";
import { ActionPlanDetail } from "@/lib/services/plans";

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function nl(value: unknown) {
  const text = esc(value ?? "");
  return text ? text.replaceAll("\n", "<br>") : '<span class="empty">—</span>';
}

function levelLabel(value: number | null | undefined) {
  return value === 0 || value ? LEVEL_LABELS[value] ?? "—" : "—";
}

function scaleLabel(value: number | null | undefined) {
  return value === 0 || value ? `${value} — ${SCALE_LABELS[value] ?? ""}` : "—";
}

export function renderPrintablePlan(detail: ActionPlanDetail) {
  const payload = detail.payload;
  const exerciseRows = Object.entries(payload.exercises)
    .sort(([left], [right]) => left.localeCompare(right, "mk"))
    .map(([key, exercise]) => {
      const [cabinetId, exerciseName] = key.split("::");
      return `
        <tr>
          <td>${esc(getCabinetById(cabinetId)?.name ?? cabinetId)}</td>
          <td>${esc(exerciseName)}</td>
          <td>${scaleLabel(exercise.baseline)}</td>
          <td>${levelLabel(exercise.level)}</td>
          <td>${payload.quarters.map((_, index) => scaleLabel(exercise.q[index]?.scale)).join(" / ")}</td>
        </tr>
      `;
    })
    .join("");

  const quarterCards = payload.quarters
    .map(
      (quarter, index) => `
        <article class="qcard">
          <h3>${QUARTER_LABELS[index]}</h3>
          <p><strong>Датум:</strong> ${esc(quarter.date || "—")}</p>
          <p><strong>Образовна евалуација:</strong> ${nl(quarter.iopEval)}</p>
          <p><strong>Тимска ревизија:</strong> ${nl(quarter.revision)}</p>
          <p><strong>Родителска средба:</strong> ${nl(quarter.parentMeeting)}</p>
          <p><strong>Извештај:</strong> ${nl(quarter.report)}</p>
        </article>
      `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="mk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Печатење — ${esc(payload.profile.fullName)}</title>
    <style>
      :root {
        --ink: #20302a;
        --muted: #617067;
        --line: #cfd9d1;
        --accent: #275c4d;
        --soft: #edf5f1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Trebuchet MS", "Segoe UI", sans-serif; color: var(--ink); background: #eef3ef; }
      main { max-width: 1200px; margin: 0 auto; padding: 24px; }
      section { background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 12px 34px rgba(32, 48, 42, 0.1); margin-bottom: 18px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; margin: 0 0 10px; }
      h1 { color: var(--accent); font-size: 28px; }
      h2 { color: var(--accent); font-size: 20px; border-bottom: 2px solid var(--soft); padding-bottom: 8px; }
      .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
      .meta-card, .note, .qcard { border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; background: #fbfdfb; }
      .label { color: var(--muted); text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 6px; }
      .value { font-size: 14px; line-height: 1.45; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid var(--line); padding: 8px; vertical-align: top; text-align: left; }
      th { background: var(--soft); }
      .note { white-space: normal; line-height: 1.55; }
      .qgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .empty { color: var(--muted); font-style: italic; }
      @media print {
        body { background: #fff; }
        main { padding: 0; }
        section { box-shadow: none; break-after: page; margin-bottom: 0; border-radius: 0; }
        section:last-child { break-after: auto; }
      }
      @media (max-width: 900px) {
        .meta, .qgrid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <p style="margin:0; text-transform:uppercase; letter-spacing:0.16em; color:var(--muted); font-size:12px;">Akciski plan print view</p>
        <h1>${esc(payload.profile.fullName || "—")}</h1>
        <div class="meta">
          <div class="meta-card"><div class="label">Одделение</div><div class="value">${esc(payload.profile.grade || "—")}</div></div>
          <div class="meta-card"><div class="label">Тип програма</div><div class="value">${esc(payload.profile.programType || "—")}</div></div>
          <div class="meta-card"><div class="label">Учебна година</div><div class="value">${esc(payload.schoolYear)}</div></div>
          <div class="meta-card"><div class="label">Верзија</div><div class="value">${esc(detail.version)}</div></div>
        </div>
      </section>

      <section>
        <h2>Профил на ученик</h2>
        <div class="meta">
          <div class="meta-card"><div class="label">Дијагноза / упатување</div><div class="value">${nl(payload.profile.disability)}</div></div>
          <div class="meta-card"><div class="label">Кабинети</div><div class="value">${payload.cabinets.map((cabinetId) => esc(getCabinetById(cabinetId)?.name ?? cabinetId)).join("<br>") || "—"}</div></div>
          <div class="meta-card"><div class="label">Општи белешки</div><div class="value">${nl(payload.profile.notes)}</div></div>
          <div class="meta-card"><div class="label">Последна промена</div><div class="value">${esc(detail.updatedAt)}</div></div>
        </div>
      </section>

      <section>
        <h2>Фаза А</h2>
        <div class="note"><strong>Датум на прием:</strong> ${esc(payload.phaseA.date || "—")}</div>
        <div class="note"><strong>Опсервација:</strong><br>${nl(payload.phaseA.observation)}</div>
        <div class="note"><strong>Дијагностика:</strong><br>${nl(payload.phaseA.diagnostics)}</div>
        <div class="note"><strong>Тимска конференција:</strong><br>${nl(payload.phaseA.teamConf)}</div>
      </section>

      <section>
        <h2>Фаза Б и оперативни вежби</h2>
        <table>
          <thead>
            <tr>
              <th>Кабинет</th>
              <th>Вежба</th>
              <th>Базална скала</th>
              <th>Почетно ниво</th>
              <th>Q1 / Q2 / Q3 / Q4</th>
            </tr>
          </thead>
          <tbody>
            ${exerciseRows || '<tr><td colspan="5" class="empty">Нема внесени вежби.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Квартален циклус</h2>
        <div class="qgrid">${quarterCards}</div>
      </section>

      <section>
        <h2>ИОП / ЛППР</h2>
        <div class="note"><strong>Цели:</strong><br>${nl(payload.iop.goals)}</div>
        <div class="note"><strong>Стратегии:</strong><br>${nl(payload.iop.strategies)}</div>
        <div class="note"><strong>Прилагодувања:</strong><br>${nl(payload.iop.adaptations)}</div>
        <div class="note"><strong>Образовен асистент:</strong><br>${nl(payload.iop.assistant)}</div>
      </section>

      <section>
        <h2>Годишно затворање</h2>
        <div class="note"><strong>Годишна сумација:</strong><br>${nl(payload.yearEnd.summary)}</div>
        <div class="note"><strong>Транзиција:</strong><br>${nl(payload.yearEnd.transition)}</div>
        <div class="note"><strong>Насоки за лето:</strong><br>${nl(payload.yearEnd.summerNotes)}</div>
      </section>
    </main>
  </body>
</html>
  `;
}
