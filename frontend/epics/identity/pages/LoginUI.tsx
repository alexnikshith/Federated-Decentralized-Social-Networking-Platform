import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdentityLayout } from "@/components/auth/IdentityLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const navigate = useNavigate();
  const { isLoginExiting: isLoggingIn } = useAuthStore();
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);

  const handleSwitchToRegister = () => {
    setIsSwitchingPage(true);
    setTimeout(() => {
      navigate('/register');
    }, 1000); // Wait for the 1s hologram transition
  };

  const handleBackToLanding = () => {
    setIsSwitchingPage(true);
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <IdentityLayout isExiting={isLoggingIn || isSwitchingPage} isCinematic={isLoggingIn} theme="emerald">
      <LoginForm onSwitchToRegister={handleSwitchToRegister} onBackToLanding={handleBackToLanding} />
    </IdentityLayout>
  );
};

export default Login;