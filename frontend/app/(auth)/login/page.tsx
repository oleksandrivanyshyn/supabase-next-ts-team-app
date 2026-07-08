import { LoginForm } from "@/components/auth/login-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <LoginForm />
        <GoogleAuthButton />
      </div>
    </div>
  );
}
