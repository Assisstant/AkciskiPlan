"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROGRAM_TYPES } from "@/lib/catalog/akciski-plan";
import type { StudentSummary } from "@/lib/import-export";
import { SessionUser } from "@/lib/session";

export function StudentDirectory({
  currentUser,
  initialStudents
}: {
  currentUser: SessionUser;
  initialStudents: StudentSummary[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [programFilter, setProgramFilter] = useState<"all" | (typeof PROGRAM_TYPES)[number]>("all");
  const [form, setForm] = useState({
    fullName: "",
    grade: "",
    schoolYear: "",
    disability: "",
    notes: "",
    programType: "Редовна" as (typeof PROGRAM_TYPES)[number]
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.grade.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : student.status === statusFilter;
      const matchesProgram = programFilter === "all" ? true : student.programType === programFilter;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [students, search, statusFilter, programFilter]);

  const onCreate = async () => {
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Не може да се креира ученик.");
        return;
      }

      setStudents((current) => [payload.student, ...current]);
      window.location.href = `/students/${payload.student.id}?plan=${payload.planId}`;
    } catch {
      setError("Не може да се зачува ученикот.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Ученици и акциски планови</h2>
          <p className="muted">
            Пребарување, филтри и брзо отворање на ученички планови по учебна
            година.
          </p>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <strong>{students.length}</strong>
            <span>вкупно записи</span>
          </div>
          <div className="stat-box">
            <strong>{students.filter((student) => student.status === "active").length}</strong>
            <span>активни ученици</span>
          </div>
        </div>
      </section>

      {currentUser.role !== "viewer" ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New record</p>
              <h3>Додај нов ученик</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Име и презиме
              <input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>
            <label>
              Одделение
              <input
                value={form.grade}
                onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
              />
            </label>
            <label>
              Учебна година
              <input
                value={form.schoolYear}
                onChange={(event) => setForm((current) => ({ ...current, schoolYear: event.target.value }))}
                placeholder="2025 / 2026"
              />
            </label>
            <label>
              Тип програма
              <select
                value={form.programType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    programType: event.target.value as (typeof PROGRAM_TYPES)[number]
                  }))
                }
              >
                {PROGRAM_TYPES.map((programType) => (
                  <option key={programType} value={programType}>
                    {programType}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              Тип попреченост / упатување
              <textarea
                value={form.disability}
                onChange={(event) => setForm((current) => ({ ...current, disability: event.target.value }))}
              />
            </label>
            <label className="full-span">
              Белешки
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="actions-row">
            <button className="primary-button" type="button" onClick={onCreate} disabled={creating}>
              {creating ? "Креирам..." : "Креирај ученик"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="toolbar-grid">
          <label>
            Пребарај
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Име, одделение..." />
          </label>
          <label>
            Статус
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "archived")}>
              <option value="all">Сите</option>
              <option value="active">Активни</option>
              <option value="archived">Архивирани</option>
            </select>
          </label>
          <label>
            Програма
            <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value as "all" | (typeof PROGRAM_TYPES)[number])}>
              <option value="all">Сите програми</option>
              {PROGRAM_TYPES.map((programType) => (
                <option key={programType} value={programType}>
                  {programType}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="directory-grid">
          {filtered.map((student) => (
            <Link
              key={student.id}
              href={{
                pathname: "/students/[id]",
                query: {
                  id: student.id,
                  ...(student.plans[0] ? { plan: student.plans[0].id } : {})
                }
              }}
              className="student-card"
            >
              <div className="student-card-top">
                <div>
                  <h3>{student.fullName}</h3>
                  <p>
                    {student.grade || "—"} · {student.programType || "—"}
                  </p>
                </div>
                <span className={`status-pill ${student.status}`}>{student.status}</span>
              </div>
              <p className="muted small-copy">Учебна година: {student.schoolYear || "—"}</p>
              <div className="assignment-row">
                {student.assignments.map((assignment) => (
                  <span key={assignment.id} className="ghost-chip">
                    {assignment.displayName}
                  </span>
                ))}
              </div>
            </Link>
          ))}

          {filtered.length === 0 ? (
            <div className="empty-state">
              <h3>Нема резултати</h3>
              <p>Променете го филтерот или додадете нов ученик.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
