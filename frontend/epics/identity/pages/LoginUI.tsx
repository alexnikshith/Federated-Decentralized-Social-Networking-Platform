import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdentityLayout } from "@/components/auth/IdentityLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const navigate = useNavigate();
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);

  const handleSwitchToRegister = () => {
    setIsSwitchingPage(true);
    setTimeout(() => {
      navigate('/register');
    }, 0); // Removed the 1s transition delay for faster UX
  };

  const handleBackToLanding = () => {
    setIsSwitchingPage(true);
    setTimeout(() => {
      navigate('/');
    }, 0);
  };

  return (
    <IdentityLayout isExiting={isSwitchingPage} isCinematic={false} theme="emerald">
      <LoginForm onSwitchToRegister={handleSwitchToRegister} onBackToLanding={handleBackToLanding} />
    </IdentityLayout>
  );
};

export default Login;