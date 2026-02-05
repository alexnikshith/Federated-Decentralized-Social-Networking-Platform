import { Footer } from "@/components/layout/Footer";
import { RegisterForm } from "@/components/auth/RegisterForm";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col relative w-full">
      <main className="flex-1 flex items-center justify-center py-12 px-4 w-full">
        <RegisterForm />
      </main>
      <Footer />
    </div>
  );
};

export default Register;