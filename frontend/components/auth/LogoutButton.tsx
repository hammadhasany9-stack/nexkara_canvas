"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  };
  return (
    <Button variant="secondary" onClick={logout}>
      Log out
    </Button>
  );
}
