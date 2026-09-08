"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { fetchJson } from "@/lib/fetchJson";

type SessionUser = { name?: string; image?: string };

/** Small profile entry point shared by every top nav — an avatar/initial +
 * first name once signed in, or a bare icon before that, always linking to
 * /profile (which itself prompts sign-in if needed). */
export default function ProfileNavLink({ className = "btn-secondary flex-shrink-0" }: { className?: string }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetchJson<{ user?: SessionUser }>("/api/auth/session").then((data) => setUser(data?.user ?? null));
  }, []);

  return (
    <Link href="/profile" aria-label="Your profile" className={className}>
      {user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <UserIcon className="h-4 w-4" />
      )}
      {user?.name && <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>}
    </Link>
  );
}
