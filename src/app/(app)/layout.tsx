import Link from "next/link";
import { signOut } from "@/auth";

const links = [
  ["/", "Главная"],
  ["/students", "Ученики"],
  ["/visits", "Занятия"],
  ["/calendar", "Календарь"],
  ["/analytics", "Аналитика"],
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 overflow-x-auto px-4 py-3 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap font-medium text-gray-700 hover:text-blue-600">{label}</Link>
          ))}
          <form
            className="ml-auto"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="whitespace-nowrap text-gray-500 hover:text-gray-900">Выйти</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
