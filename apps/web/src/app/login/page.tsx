import SignInForm from "@/components/sign-in-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-full place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </main>
  );
}
