"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onLogout = async () => {
    setPending(true);

    try {
      await signOut({
        redirect: false
      });
      router.push("/auth/signin");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button className="secondary-button" onClick={onLogout} disabled={pending}>
      {pending ? "Одјава..." : "Одјава"}
    </button>
  );
}
