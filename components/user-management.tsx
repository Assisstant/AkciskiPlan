"use client";

import { useState } from "react";
import type { UserListItem } from "@/lib/services/users";
import { SessionUser } from "@/lib/session";

export function UserManagement({
  currentUser,
  initialUsers
}: {
  currentUser: SessionUser;
  initialUsers: UserListItem[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [createForm, setCreateForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "editor" as "admin" | "editor" | "viewer"
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [rowState, setRowState] = useState<Record<string, { password: string; busy: boolean; error: string }>>({});

  const createUser = async () => {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createForm)
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Неуспешно креирање корисник.");
        return;
      }

      setUsers((current) => [payload.user, ...current]);
      setCreateForm({
        username: "",
        displayName: "",
        password: "",
        role: "editor"
      });
    } catch {
      setError("Серверот не одговори.");
    } finally {
      setPending(false);
    }
  };

  const patchUser = async (userId: string, patch: Record<string, unknown>) => {
    setRowState((current) => ({
      ...current,
      [userId]: {
        password: current[userId]?.password ?? "",
        busy: true,
        error: ""
      }
    }));

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(patch)
      });
      const payload = await response.json();

      if (!response.ok) {
        setRowState((current) => ({
          ...current,
          [userId]: {
            password: current[userId]?.password ?? "",
            busy: false,
            error: payload.error || "Неуспешно ажурирање."
          }
        }));
        return;
      }

      setUsers((current) => current.map((user) => (user.id === userId ? payload.user : user)));
      setRowState((current) => ({
        ...current,
        [userId]: {
          password: "",
          busy: false,
          error: ""
        }
      }));
    } catch {
      setRowState((current) => ({
        ...current,
        [userId]: {
          password: current[userId]?.password ?? "",
          busy: false,
          error: "Серверска грешка."
        }
      }));
    }
  };

  return (
    <div className="stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Корисници и улоги</h2>
          <p className="muted">
            Администраторот управува со најава, улоги и активност на кориснички
            сметки.
          </p>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <strong>{users.length}</strong>
            <span>корисници</span>
          </div>
          <div className="stat-box">
            <strong>{currentUser.name || currentUser.username}</strong>
            <span>активен администратор</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Create</p>
            <h3>Нов корисник</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Корисничко име
            <input
              value={createForm.username}
              onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label>
            Приказно име
            <input
              value={createForm.displayName}
              onChange={(event) => setCreateForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </label>
          <label>
            Лозинка
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          <label>
            Улога
            <select
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  role: event.target.value as "admin" | "editor" | "viewer"
                }))
              }
            >
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="actions-row">
          <button className="primary-button" type="button" onClick={createUser} disabled={pending}>
            {pending ? "Се креира..." : "Креирај корисник"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Users</p>
            <h3>Постоечки корисници</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Корисник</th>
                <th>Улога</th>
                <th>Активен</th>
                <th>Нова лозинка</th>
                <th>Акција</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.displayName}</strong>
                    <div className="muted small-copy">@{user.username}</div>
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((item) =>
                            item.id === user.id
                              ? {
                                  ...item,
                                  role: event.target.value as "admin" | "editor" | "viewer"
                                }
                              : item
                          )
                        )
                      }
                    >
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((item) =>
                            item.id === user.id
                              ? {
                                  ...item,
                                  active: event.target.checked
                                }
                              : item
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="password"
                      value={rowState[user.id]?.password ?? ""}
                      onChange={(event) =>
                        setRowState((current) => ({
                          ...current,
                          [user.id]: {
                            password: event.target.value,
                            busy: current[user.id]?.busy ?? false,
                            error: ""
                          }
                        }))
                      }
                      placeholder="опционално"
                    />
                    {rowState[user.id]?.error ? <div className="form-error">{rowState[user.id]?.error}</div> : null}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={rowState[user.id]?.busy}
                      onClick={() =>
                        patchUser(user.id, {
                          role: user.role,
                          active: user.active,
                          password: rowState[user.id]?.password || undefined
                        })
                      }
                    >
                      {rowState[user.id]?.busy ? "Снима..." : "Сними"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
