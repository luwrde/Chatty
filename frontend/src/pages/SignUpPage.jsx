import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AuthProductShowcase from "../components/AuthProductShowcase.jsx";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const success = validateForm();

    // Always a buyer account: admins are added in the admin console
    if (success === true) signup(formData);
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

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Create account</h1>
              <p className="text-base-content/65 sm:text-lg">
                Start shopping and connect with sellers.
              </p>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div className="form-control">
              <label className="label" htmlFor="signup-name">
                <span className="label-text font-medium">Full Name</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>

                <input
                  type="text"
                  id="signup-name"
                  autoComplete="name"
                  className="input input-bordered h-14 rounded-xl w-full pl-11 focus:outline-primary"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-control">
              <label className="label" htmlFor="signup-email">
                <span className="label-text font-medium">Email</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>

                <input
                  type="email"
                  id="signup-email"
                  autoComplete="email"
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
              <label className="label" htmlFor="signup-password">
                <span className="label-text font-medium">Password</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  autoComplete="new-password"
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
              disabled={isSigningUp}
              aria-busy={isSigningUp}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>Create Account <ArrowRight className="size-5" aria-hidden="true" /></>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthProductShowcase />
    </main>
  );
};

export default SignUpPage;
