import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import AuthProductShowcase from "../components/AuthProductShowcase.jsx";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn } = useAuthStore();

  const validateForm = () => {
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }
    
    if (!formData.password.trim()) {
      toast.error("Password is required");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const success = validateForm();
    
    if (success === true) {
      login(formData);
    }
  };

  return (
    <main className="min-h-screen grid bg-base-100 pt-16 lg:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex min-h-[calc(100svh-4rem)] flex-col justify-center items-center px-6 py-12 sm:px-12 lg:py-16">
        <div className="w-full max-w-md space-y-8">
          
          {/* LOGO */}
          <div className="mb-10">
            <div className="flex flex-col items-start gap-3">
              <div
                className="mb-3 size-14 rounded-2xl bg-primary/10 flex items-center justify-center"
              >
                <MessageSquare className="size-6 text-primary" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-base-content/65 sm:text-lg">
                Sign in to continue your conversations.
              </p>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="form-control">
              <label className="label" htmlFor="login-email">
                <span className="label-text font-medium">Email</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>

                <input
                  type="email"
                  id="login-email"
                  autoComplete="username"
                  className="input input-bordered h-14 rounded-xl w-full pl-11 focus:outline-primary"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-control">
              <label className="label" htmlFor="login-password">
                <span className="label-text font-medium">Password</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  autoComplete="current-password"
                  className="input input-bordered h-14 rounded-xl w-full pl-11 pr-14 focus:outline-primary"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />

                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-4 flex items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary h-14 rounded-xl w-full flex items-center justify-center gap-3 text-base shadow-soft"
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>Sign In <ArrowRight className="size-5" aria-hidden="true" /></>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-base-content/60">
              Don't have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthProductShowcase />
    </main>
  );
};

export default LoginPage;
