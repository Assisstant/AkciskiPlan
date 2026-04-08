import { getOptionalUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function SignInPage() {
  const user = await getOptionalUser();

  if (user) {
    redirect("/students");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">ОУРЦ workflow</p>
        <h1>Акциски План</h1>
        <p className="auth-copy">
          Централизирано водење на ученички досиеја, квартални мерења и годишни
          извештаи за еден ресурсен центар.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
