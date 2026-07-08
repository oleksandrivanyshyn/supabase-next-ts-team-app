import { SignUpForm } from "@/components/auth/sign-up-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <SignUpForm />
        <GoogleAuthButton />
      </div>
    </div>
  );
}
