import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/components/auth/LoginForm";

const Login = () => {
  // Basic layout wrapper for the Login page
  return (
    <div className="min-h-screen flex flex-col relative w-full">
      <main className="flex-1 flex items-center justify-center py-12 px-4 w-full">
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
};

export default Login;