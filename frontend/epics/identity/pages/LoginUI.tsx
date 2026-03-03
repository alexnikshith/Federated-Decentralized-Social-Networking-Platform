import { IdentityLayout } from "@/components/auth/IdentityLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const { isLoginExiting } = useAuthStore();

  return (
    <IdentityLayout isExiting={isLoginExiting}>
      <LoginForm />
    </IdentityLayout>
  );
};

export default Login;