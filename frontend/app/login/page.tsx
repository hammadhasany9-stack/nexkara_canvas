import { CoverPanel } from "@/components/auth/CoverPanel";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { Logo } from "@/components/auth/Logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 min-[900px]:grid-cols-2">
      <CoverPanel />

      <div className="relative flex flex-col bg-bg">
        <div className="flex items-center justify-between p-6">
          {/* Logo only shows on mobile (cover carries it on desktop). */}
          <div className="min-[900px]:invisible">
            <Logo />
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <AuthFlow />
        </div>
      </div>
    </main>
  );
}
