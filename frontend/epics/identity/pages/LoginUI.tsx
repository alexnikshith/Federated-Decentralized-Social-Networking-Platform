import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/components/auth/LoginForm";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const { isLoginExiting } = useAuthStore();

  // Basic layout wrapper for the Login page
  return (
    <div className="min-h-screen flex flex-col relative w-full bg-background overflow-hidden">
      {/* Global Cosmos Background */}
      <motion.div
        className="absolute inset-0 w-full h-full bg-[url('/cosmos-bg.png')] bg-cover bg-center bg-no-repeat mix-blend-screen pointer-events-none"
        initial={{ scale: 1, opacity: 0.4 }}
        animate={{
          scale: isLoginExiting ? 5 : 1,
          opacity: isLoginExiting ? 0.8 : 0.4
        }}
        transition={{ duration: 1.2, ease: "easeIn" }}
        style={{ filter: "contrast(1.2) brightness(0.8)", zIndex: 0 }}
      />
      {/* Global darkening overlay to ensure text readability */}
      <div className="absolute inset-0 bg-background/60 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Foreground Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center py-12 px-4 w-full">
          <LoginForm />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Login;