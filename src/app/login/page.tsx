"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(res.code === "rate_limited" ? "Слишком много неудачных попыток. Повторите через 15 минут." : "Неверный email или пароль.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base";
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Вход</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" autoComplete="email" required className={input} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Пароль</span>
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          Войти
        </button>
      </form>
    </main>
  );
}
