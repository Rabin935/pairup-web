import Link from "next/link";
import LoginForm from "../_components/login-form";

export default function LoginPage() {
  return (
    <div className="w-full space-y-4">
      <Link
        href="/dashboard"
        className="fixed left-4 top-4 z-50 inline-flex items-center bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 hover:rounded-lg"
      >
        {"<- Back to Dashboard"}
      </Link>
      <LoginForm />
    </div>
  );
}
