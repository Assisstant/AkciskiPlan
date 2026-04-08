"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false
      });

      if (result?.error) {
        setError("Погрешно корисничко име или лозинка.");
        return;
      }

      router.push("/students");
      router.refresh();
    } catch {
      setError("Не може да се воспостави врска со серверот.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Корисничко име
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          autoComplete="username"
        />
      </label>

      <label>
        Лозинка
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
          autoComplete="current-password"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Најава..." : "Најави се"}
      </button>
    </form>
  );
}
