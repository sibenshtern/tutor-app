"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Field, Input } from "@/components/ui";
import { send } from "@/lib/client-api";

export function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (confirmText !== name) return;
    setDeleting(true);
    const res = await send(`/api/students/${id}`, "DELETE");
    setDeleting(false);
    if (!res.ok) return;
    toast.success("Ученик удалён навсегда");
    router.push("/students");
    router.refresh();
  }

  if (!open) {
    return <Button variant="danger" onClick={() => setOpen(true)}>Удалить навсегда</Button>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-red-300 bg-red-50 p-3">
      <Field label={`Введите «${name}», чтобы подтвердить удаление со всеми занятиями`}>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
      </Field>
      <Button type="submit" variant="danger" disabled={confirmText !== name || deleting}>Удалить навсегда</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
    </form>
  );
}
