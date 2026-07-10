import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
