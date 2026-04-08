"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CABINETS, LEVEL_LABELS, PROGRAM_TYPES, QUARTER_LABELS, SCALE_LABELS, getCabinetById } from "@/lib/catalog/akciski-plan";
import type { ActionPlanPayloadV1 } from "@/lib/schemas/action-plan";
import type { ActionPlanDetail } from "@/lib/services/plans";
import type { StudentDetail } from "@/lib/services/students";
import type { UserListItem } from "@/lib/services/users";
import { SessionUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

type SaveState = "saved" | "pending" | "saving" | "queued" | "error" | "conflict";
type WorkspaceTab = "info" | "phaseA" | "phaseB" | "quarters" | "iop" | "year";

const tabs: Array<[WorkspaceTab, string]> = [
  ["info", "Податоци"],
  ["phaseA", "Фаза А"],
  ["phaseB", "Фаза Б"],
  ["quarters", "Квартали"],
  ["iop", "ИОП"],
  ["year", "Годишно"]
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyExercise() {
  return {
    baseline: null,
    level: null,
    q: Array.from({ length: 4 }, () => ({ scale: null, level: null, note: "" }))
  };
}

function emptyQuarter() {
  return { date: "", iopEval: "", revision: "", report: "", parentMeeting: "" };
}

export function StudentWorkspace({
  currentUser,
  initialStudent,
  initialPlan,
  availableUsers
}: {
  currentUser: SessionUser;
  initialStudent: StudentDetail;
  initialPlan: ActionPlanDetail | null;
  availableUsers: UserListItem[];
}) {
  const [student, setStudent] = useState(initialStudent);
  const [plan, setPlan] = useState(initialPlan);
  const [payload, setPayload] = useState<ActionPlanPayloadV1 | null>(initialPlan?.payload ?? null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("info");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [newYear, setNewYear] = useState("");
  const [copyFromPrevious, setCopyFromPrevious] = useState(true);
  const [busy, setBusy] = useState<{ plan: boolean; assign: boolean; import: boolean; delete: boolean }>({
    plan: false,
    assign: false,
    import: false,
    delete: false
  });
  const canEdit = currentUser.role !== "viewer";
  const payloadRef = useRef(payload);
  const versionRef = useRef(plan?.version ?? 1);
  const savingRef = useRef(false);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    versionRef.current = plan?.version ?? 1;
  }, [plan?.version]);

  const activeCabinets = useMemo(
    () => CABINETS.filter((cabinet) => payload?.cabinets.includes(cabinet.id)),
    [payload]
  );

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const replacePlan = (nextPlan: ActionPlanDetail) => {
    setPlan(nextPlan);
    setPayload(nextPlan.payload);
    setStudent(nextPlan.student as StudentDetail);
    setDirty(false);
    setSaveState("saved");
  };

  const loadPlan = async (planId: string) => {
    const response = await fetch(`/api/students/${student.id}/plans/${planId}`);
    const data = await response.json();
    if (!response.ok) {
      flash(data.error || "Не може да се вчита планот.");
      return;
    }
    replacePlan(data.plan);
  };

  const updateDraft = (recipe: (draft: ActionPlanPayloadV1) => void) => {
    if (!payload || !canEdit) return;
    setPayload((current) => {
      if (!current) return current;
      const draft = clone(current);
      recipe(draft);
      return draft;
    });
    setDirty(true);
    setSaveState("pending");
  };

  const save = async (snapshot: ActionPlanPayloadV1) => {
    if (!plan || !canEdit || savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/students/${student.id}/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: versionRef.current, note: "Autosave", payload: snapshot })
      });
      const data = await response.json();
      if (response.status === 409) {
        setSaveState("conflict");
        flash(data.error || "Судир на верзии.");
        return;
      }
      if (!response.ok) {
        setSaveState("error");
        flash(data.error || "Неуспешно снимање.");
        return;
      }
      setPlan(data.plan);
      setStudent(data.plan.student);
      if (JSON.stringify(payloadRef.current) === JSON.stringify(snapshot)) {
        setPayload(data.plan.payload);
        setDirty(false);
        setSaveState("saved");
      } else {
        setSaveState("queued");
      }
    } catch {
      setSaveState("error");
      flash("Серверот не одговори при снимање.");
    } finally {
      savingRef.current = false;
    }
  };

  useEffect(() => {
    if (!dirty || !payload || !canEdit) return;
    const handle = window.setTimeout(() => void save(payload), 900);
    return () => window.clearTimeout(handle);
  }, [dirty, payload, canEdit]);

  useEffect(() => {
    if (saveState !== "queued" || !dirty || !payload) return;
    const handle = window.setTimeout(() => void save(payload), 260);
    return () => window.clearTimeout(handle);
  }, [saveState, dirty, payload]);

  const ensureExercise = (draft: ActionPlanPayloadV1, key: string) => {
    if (!draft.exercises[key]) draft.exercises[key] = emptyExercise();
  };

  const ensureQuarter = (draft: ActionPlanPayloadV1, index: number) => {
    if (!draft.quarters[index]) draft.quarters[index] = emptyQuarter();
  };

  const createPlan = async () => {
    if (!newYear.trim()) {
      flash("Внесете учебна година.");
      return;
    }
    setBusy((current) => ({ ...current, plan: true }));
    try {
      const response = await fetch(`/api/students/${student.id}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYear: newYear, copyFromPrevious })
      });
      const data = await response.json();
      if (!response.ok) {
        flash(data.error || "Не може да се креира план.");
        return;
      }
      replacePlan(data.plan);
      setNewYear("");
      window.history.replaceState({}, "", `/students/${student.id}?plan=${data.plan.id}`);
      flash("Креирана е нова учебна година.");
    } finally {
      setBusy((current) => ({ ...current, plan: false }));
    }
  };

  const updateAssignments = async (userId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...student.assignments.map((assignment) => assignment.id), userId]))
      : student.assignments.filter((assignment) => assignment.id !== userId).map((assignment) => assignment.id);
    setBusy((current) => ({ ...current, assign: true }));
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserIds: nextIds })
      });
      const data = await response.json();
      if (!response.ok) {
        flash(data.error || "Неуспешно ажурирање на доделувања.");
        return;
      }
      setStudent(data.student);
      flash("Доделувањата се ажурирани.");
    } finally {
      setBusy((current) => ({ ...current, assign: false }));
    }
  };

  const importFile = async (file: File | null) => {
    if (!file || !plan) return;
    setBusy((current) => ({ ...current, import: true }));
    try {
      const source = JSON.parse(await file.text());
      const response = await fetch(`/api/students/${student.id}/plans/${plan.id}/import-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source })
      });
      const data = await response.json();
      if (!response.ok) {
        flash(data.error || "Неуспешен увоз.");
        return;
      }
      replacePlan(data.plan);
      flash("JSON увозот е завршен.");
    } catch {
      flash("Фајлот не е валиден JSON.");
    } finally {
      setBusy((current) => ({ ...current, import: false }));
    }
  };

  const deleteStudent = async () => {
    if (!canEdit || !window.confirm("Дали сте сигурни дека сакате да го избришете ученикот?")) return;
    setBusy((current) => ({ ...current, delete: true }));
    try {
      const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        flash(data.error || "Неуспешно бришење.");
        return;
      }
      window.location.href = "/students";
    } finally {
      setBusy((current) => ({ ...current, delete: false }));
    }
  };

  if (!plan || !payload) {
    return (
      <section className="panel">
        <h3>Нема активен план</h3>
        <p className="muted">За овој ученик нема активен план.</p>
      </section>
    );
  }

  const saveLabel = {
    saved: "Снимено",
    pending: "Промени за снимање",
    saving: "Снима...",
    queued: "Следно снимање...",
    error: "Грешка",
    conflict: "Судир на верзии"
  }[saveState];

  return (
    <div className="workspace-layout">
      <section className="panel workspace-main">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Student workspace</p>
            <h2>{payload.profile.fullName || student.fullName}</h2>
            <p className="muted">{payload.profile.grade || "—"} · {payload.profile.programType || "—"} · {payload.schoolYear}</p>
          </div>
          <div className="save-indicator">
            <span className={`status-pill ${saveState === "error" || saveState === "conflict" ? "archived" : "active"}`}>{saveLabel}</span>
            {saveState === "conflict" ? <button className="secondary-button" type="button" onClick={() => void loadPlan(plan.id)}>Вчитај повторно</button> : null}
          </div>
        </div>

        <div className="tab-row">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" className={`tab-button ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "info" ? (
          <div className="stack">
            <div className="form-grid">
              <label>Име и презиме<input disabled={!canEdit} value={payload.profile.fullName} onChange={(event) => updateDraft((draft) => { draft.profile.fullName = event.target.value; })} /></label>
              <label>Одделение<input disabled={!canEdit} value={payload.profile.grade} onChange={(event) => updateDraft((draft) => { draft.profile.grade = event.target.value; })} /></label>
              <label>Тип програма<select disabled={!canEdit} value={payload.profile.programType} onChange={(event) => updateDraft((draft) => { draft.profile.programType = event.target.value as ActionPlanPayloadV1["profile"]["programType"]; })}>{PROGRAM_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Учебна година<input value={payload.schoolYear} disabled /></label>
              <label className="full-span">Тип попреченост / упатување<textarea disabled={!canEdit} value={payload.profile.disability} onChange={(event) => updateDraft((draft) => { draft.profile.disability = event.target.value; })} /></label>
              <label className="full-span">Белешки<textarea disabled={!canEdit} value={payload.profile.notes} onChange={(event) => updateDraft((draft) => { draft.profile.notes = event.target.value; })} /></label>
            </div>
            <div className="panel inset-panel">
              <div className="panel-header"><div><p className="eyebrow">Cabinets</p><h3>Вклучени кабинети</h3></div></div>
              <div className="directory-grid">
                {CABINETS.map((cabinet) => {
                  const active = payload.cabinets.includes(cabinet.id);
                  return (
                    <button key={cabinet.id} type="button" className={`cabinet-card ${active ? "active" : ""}`} disabled={!canEdit} onClick={() => updateDraft((draft) => {
                      draft.cabinets = active ? draft.cabinets.filter((id) => id !== cabinet.id) : [...draft.cabinets, cabinet.id];
                    })}>
                      <strong>{cabinet.icon}</strong><span>{cabinet.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "phaseA" ? (
          <div className="stack">
            <div className="form-grid">
              <label>Датум на прием<input disabled={!canEdit} value={payload.phaseA.date} onChange={(event) => updateDraft((draft) => { draft.phaseA.date = event.target.value; })} /></label>
              <div />
              <label className="full-span">Опсервација<textarea disabled={!canEdit} value={payload.phaseA.observation} onChange={(event) => updateDraft((draft) => { draft.phaseA.observation = event.target.value; })} /></label>
              <label className="full-span">Дијагностика<textarea disabled={!canEdit} value={payload.phaseA.diagnostics} onChange={(event) => updateDraft((draft) => { draft.phaseA.diagnostics = event.target.value; })} /></label>
              <label className="full-span">Тимска конференција<textarea disabled={!canEdit} value={payload.phaseA.teamConf} onChange={(event) => updateDraft((draft) => { draft.phaseA.teamConf = event.target.value; })} /></label>
            </div>
            {activeCabinets.map((cabinet) => (
              <div key={cabinet.id} className="panel inset-panel">
                <div className="panel-header"><div><p className="eyebrow">Baseline</p><h3>{cabinet.name}</h3></div></div>
                <div className="stack tight-stack">
                  {cabinet.exercises.map((exercise) => {
                    const key = `${cabinet.id}::${exercise}`;
                    const current = payload.exercises[key];
                    return (
                      <div key={key} className="metric-row">
                        <span>{exercise}</span>
                        <div className="metric-buttons">{[0, 1, 2, 3, 4].map((scale) => <button key={scale} type="button" className={`metric-button ${current?.baseline === scale ? "active" : ""}`} disabled={!canEdit} title={SCALE_LABELS[scale]} onClick={() => updateDraft((draft) => { ensureExercise(draft, key); draft.exercises[key].baseline = scale; })}>{scale}</button>)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "phaseB" ? (
          <div className="stack">
            {activeCabinets.map((cabinet) => (
              <div key={cabinet.id} className="panel inset-panel">
                <div className="panel-header"><div><p className="eyebrow">Operational levels</p><h3>{cabinet.name}</h3></div></div>
                <div className="stack tight-stack">
                  {cabinet.exercises.map((exercise) => {
                    const key = `${cabinet.id}::${exercise}`;
                    const current = payload.exercises[key];
                    return (
                      <div key={key} className="metric-row">
                        <span>{exercise}</span>
                        <div className="metric-buttons wide">{LEVEL_LABELS.map((label, index) => <button key={label} type="button" className={`metric-button long ${current?.level === index ? "active" : ""}`} disabled={!canEdit} onClick={() => updateDraft((draft) => { ensureExercise(draft, key); draft.exercises[key].level = index; })}>{label}</button>)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "quarters" ? (
          <div className="stack">
            {QUARTER_LABELS.map((quarterLabel, quarterIndex) => (
              <div key={quarterLabel} className="panel inset-panel">
                <div className="panel-header"><div><p className="eyebrow">Quarter</p><h3>{quarterLabel}</h3></div></div>
                <label>Датум<input disabled={!canEdit} value={payload.quarters[quarterIndex]?.date ?? ""} onChange={(event) => updateDraft((draft) => { ensureQuarter(draft, quarterIndex); draft.quarters[quarterIndex].date = event.target.value; })} /></label>
                <div className="stack tight-stack">
                  {activeCabinets.map((cabinet) => (
                    <div key={`${quarterLabel}-${cabinet.id}`} className="quarter-cabinet">
                      <strong>{cabinet.name}</strong>
                      {cabinet.exercises.map((exercise) => {
                        const key = `${cabinet.id}::${exercise}`;
                        const current = payload.exercises[key] ?? emptyExercise();
                        return (
                          <div key={key} className="metric-row stacked">
                            <span>{exercise}</span>
                            <div className="metric-buttons">{[0, 1, 2, 3, 4].map((scale) => <button key={scale} type="button" className={`metric-button ${current.q[quarterIndex]?.scale === scale ? "active" : ""}`} disabled={!canEdit} onClick={() => updateDraft((draft) => { ensureExercise(draft, key); draft.exercises[key].q[quarterIndex].scale = scale; })}>{scale}</button>)}</div>
                            <div className="metric-buttons wide">{LEVEL_LABELS.map((label, index) => <button key={label} type="button" className={`metric-button long ${current.q[quarterIndex]?.level === index ? "active" : ""}`} disabled={!canEdit} onClick={() => updateDraft((draft) => { ensureExercise(draft, key); draft.exercises[key].q[quarterIndex].level = index; })}>{label}</button>)}</div>
                            <label className="full-span">Белешка<textarea disabled={!canEdit} value={current.q[quarterIndex]?.note ?? ""} onChange={(event) => updateDraft((draft) => { ensureExercise(draft, key); draft.exercises[key].q[quarterIndex].note = event.target.value; })} /></label>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="form-grid">
                  <label className="full-span">Образовна евалуација<textarea disabled={!canEdit} value={payload.quarters[quarterIndex]?.iopEval ?? ""} onChange={(event) => updateDraft((draft) => { ensureQuarter(draft, quarterIndex); draft.quarters[quarterIndex].iopEval = event.target.value; })} /></label>
                  <label className="full-span">Тимска ревизија<textarea disabled={!canEdit} value={payload.quarters[quarterIndex]?.revision ?? ""} onChange={(event) => updateDraft((draft) => { ensureQuarter(draft, quarterIndex); draft.quarters[quarterIndex].revision = event.target.value; })} /></label>
                  <label className="full-span">Родителска средба<textarea disabled={!canEdit} value={payload.quarters[quarterIndex]?.parentMeeting ?? ""} onChange={(event) => updateDraft((draft) => { ensureQuarter(draft, quarterIndex); draft.quarters[quarterIndex].parentMeeting = event.target.value; })} /></label>
                  <label className="full-span">Извештај<textarea disabled={!canEdit} value={payload.quarters[quarterIndex]?.report ?? ""} onChange={(event) => updateDraft((draft) => { ensureQuarter(draft, quarterIndex); draft.quarters[quarterIndex].report = event.target.value; })} /></label>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "iop" ? (
          <div className="form-grid">
            <label className="full-span">Цели по области<textarea disabled={!canEdit} value={payload.iop.goals} onChange={(event) => updateDraft((draft) => { draft.iop.goals = event.target.value; })} /></label>
            <label className="full-span">Стратегии<textarea disabled={!canEdit} value={payload.iop.strategies} onChange={(event) => updateDraft((draft) => { draft.iop.strategies = event.target.value; })} /></label>
            <label className="full-span">Прилагодувања<textarea disabled={!canEdit} value={payload.iop.adaptations} onChange={(event) => updateDraft((draft) => { draft.iop.adaptations = event.target.value; })} /></label>
            <label className="full-span">Образовен асистент<textarea disabled={!canEdit} value={payload.iop.assistant} onChange={(event) => updateDraft((draft) => { draft.iop.assistant = event.target.value; })} /></label>
          </div>
        ) : null}

        {activeTab === "year" ? (
          <div className="stack">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Кабинет</th><th>Вежба</th><th>Базална</th><th>Q1 / Q2 / Q3 / Q4</th></tr></thead>
                <tbody>
                  {Object.entries(payload.exercises).map(([key, exercise]) => {
                    const [cabinetId, exerciseName] = key.split("::");
                    return <tr key={key}><td>{getCabinetById(cabinetId)?.name ?? cabinetId}</td><td>{exerciseName}</td><td>{exercise.baseline ?? "—"}</td><td>{exercise.q.map((item) => item.scale === 0 || item.scale ? item.scale : "—").join(" / ")}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="form-grid">
              <label className="full-span">Годишна сумација<textarea disabled={!canEdit} value={payload.yearEnd.summary} onChange={(event) => updateDraft((draft) => { draft.yearEnd.summary = event.target.value; })} /></label>
              <label className="full-span">Транзиција<textarea disabled={!canEdit} value={payload.yearEnd.transition} onChange={(event) => updateDraft((draft) => { draft.yearEnd.transition = event.target.value; })} /></label>
              <label className="full-span">Насоки за лето<textarea disabled={!canEdit} value={payload.yearEnd.summerNotes} onChange={(event) => updateDraft((draft) => { draft.yearEnd.summerNotes = event.target.value; })} /></label>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="workspace-side stack">
        <section className="panel">
          <div className="panel-header"><div><p className="eyebrow">Plan switcher</p><h3>Учебни години</h3></div></div>
          <label>Активен план<select value={plan.id} onChange={(event) => { void loadPlan(event.target.value); window.history.replaceState({}, "", `/students/${student.id}?plan=${event.target.value}`); }}>{student.plans.map((item) => <option key={item.id} value={item.id}>{item.schoolYear} · v{item.version}</option>)}</select></label>
          {canEdit ? (
            <div className="stack tight-stack">
              <label>Нова учебна година<input value={newYear} onChange={(event) => setNewYear(event.target.value)} placeholder="2026 / 2027" /></label>
              <label className="inline-check"><input type="checkbox" checked={copyFromPrevious} onChange={(event) => setCopyFromPrevious(event.target.checked)} />Копирај од последниот план</label>
              <button className="primary-button" type="button" onClick={createPlan} disabled={busy.plan}>{busy.plan ? "Креирам..." : "Креирај план"}</button>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header"><div><p className="eyebrow">Files</p><h3>JSON и печатење</h3></div></div>
          <div className="stack tight-stack">
            <a className="secondary-button" href={`/api/students/${student.id}/plans/${plan.id}/export-json`}>Извези JSON</a>
            <label>Вчитај JSON<input type="file" accept=".json" disabled={busy.import} onChange={(event) => void importFile(event.target.files?.[0] ?? null)} /></label>
            <a className="secondary-button" href={`/api/students/${student.id}/plans/${plan.id}/print`} target="_blank" rel="noreferrer">Печати / PDF</a>
          </div>
        </section>

        {currentUser.role === "admin" ? (
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Assignments</p><h3>Доделени корисници</h3></div></div>
            <div className="stack tight-stack">
              {availableUsers.map((user) => {
                const checked = student.assignments.some((assignment) => assignment.id === user.id);
                return <label key={user.id} className="inline-check"><input type="checkbox" checked={checked} disabled={busy.assign} onChange={(event) => void updateAssignments(user.id, event.target.checked)} /><span>{user.displayName} <small>@{user.username}</small></span></label>;
              })}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-header"><div><p className="eyebrow">History</p><h3>Верзии</h3></div></div>
          <div className="stack tight-stack">
            {plan.versions.map((version) => <div key={version.id} className="version-card"><strong>v{version.version}</strong><span>{version.createdBy}</span><small>{formatDateTime(version.createdAt)}</small><p>{version.note}</p></div>)}
          </div>
        </section>

        {canEdit ? (
          <section className="panel danger-panel">
            <div className="panel-header"><div><p className="eyebrow">Danger zone</p><h3>Бришење ученик</h3></div></div>
            <button className="secondary-button" type="button" onClick={deleteStudent} disabled={busy.delete}>{busy.delete ? "Бришам..." : "Избриши ученик"}</button>
          </section>
        ) : null}

        {message ? <div className="toast-inline">{message}</div> : null}
      </aside>
    </div>
  );
}
