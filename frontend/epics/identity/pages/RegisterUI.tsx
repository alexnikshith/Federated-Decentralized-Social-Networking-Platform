import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { authApi } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, ArrowRight, Eye, EyeOff, Shield, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const popularInstances = [
  { domain: "art.nexus.social", name: "Art & Creative", members: "12.4k" },
  { domain: "tech.nexus.social", name: "Tech Enthusiasts", members: "28.9k" },
  { domain: "music.nexus.social", name: "Music Zone", members: "15.6k" },
];

const Register = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [customInstance, setCustomInstance] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const instance = customInstance || selectedInstance;
      const response = await authApi.signup({
        username,
        email,
        password,
        // @ts-expect-error - adding instance which might be expected by backend
        instance
      });

      toast.success("Account created successfully! Please sign in to verify your account.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentInstance = customInstance || selectedInstance;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Join the Federation</h1>
            <p className="text-muted-foreground">
              Create your account on a community that fits you
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-6">
            {/* Instance selection */}
            <div className="space-y-3">
              <Label>Choose your community</Label>
              <div className="grid gap-2">
                {popularInstances.map((instance) => (
                  <button
                    key={instance.domain}
                    type="button"
                    onClick={() => {
                      setSelectedInstance(instance.domain);
                      setCustomInstance("");
                    }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                      selectedInstance === instance.domain && !customInstance
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{instance.name}</div>
                        <div className="text-xs text-muted-foreground">{instance.domain}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{instance.members} members</span>
                      {selectedInstance === instance.domain && !customInstance && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or join a custom instance</span>
                </div>
              </div>

              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="custom-instance.nexus.social"
                  value={customInstance}
                  onChange={(e) => {
                    setCustomInstance(e.target.value);
                    setSelectedInstance("");
                  }}
                  className="pl-10 h-11 bg-secondary border-border"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-secondary border-border flex-1"
                />
              </div>
              {currentInstance && username && (
                <p className="text-xs text-muted-foreground">
                  Your full handle: <span className="text-primary">@{username}@{currentInstance}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-secondary border-border"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-secondary border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters with at least one number and symbol
              </p>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                . I understand my data will be stored on my chosen instance.
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="hero"
              className="w-full h-11"
              disabled={!currentInstance || !username || !email || !password || !agreedToTerms}
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Button>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>

          {/* Trust indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your data stays on your chosen community instance</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;