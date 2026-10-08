"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { send } from "@/lib/client-api";

export function ArchiveButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  async function toggle() {
    if (active && !confirm("Отправить ученика в архив? Регулярные занятия завершатся, а их будущие запланированные занятия будут удалены.")) return;
    const res = await send(`/api/students/${id}`, "PATCH", { active: !active });
    if (res.ok) router.refresh();
  }
  return <Button variant={active ? "danger" : "secondary"} onClick={toggle}>{active ? "В архив" : "Восстановить"}</Button>;
}
