"use client";

import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog() {
  const { confirm, closeConfirm } = useDashboard();
  if (!confirm) return null;
  return (
    <Modal
      open={!!confirm}
      onClose={closeConfirm}
      title={confirm.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeConfirm}>Cancel</Button>
          <Button
            className="bg-danger hover:bg-danger/90"
            onClick={async () => {
              await confirm.onConfirm();
              closeConfirm();
            }}
          >
            {confirm.label}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">{confirm.body}</p>
    </Modal>
  );
}
