import { SignUpForm } from '@/components/auth/SignUpForm';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

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
