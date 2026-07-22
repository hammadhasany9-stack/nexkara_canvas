"use client";

import * as React from "react";
import { ApiError, apiPatch } from "@/lib/api";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banner } from "@/components/auth/Banner";
import { Modal } from "@/components/ui/modal";

export function RenameModal() {
  const { renameTarget, closeRename, refresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (renameTarget) { setName(renameTarget.name); setError(""); }
  }, [renameTarget]);

  const save = async () => {
    if (!name.trim()) return setError("Enter a name.");
    try {
      await apiPatch(`/prototypes/${renameTarget!.id}`, { name: name.trim() });
      await refresh();
      closeRename();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Rename failed.");
    }
  };

  return (
    <Modal
      open={!!renameTarget}
      onClose={closeRename}
      title="Rename prototype"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeRename}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="grid gap-3">
        {error && <Banner kind="error">{error}</Banner>}
        <div className="grid gap-1.5">
          <Label htmlFor="rename">Name</Label>
          <Input id="rename" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      </div>
    </Modal>
  );
}
