"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import { authClient } from "@/app/lib/auth-client";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const SignupPage: React.FC = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "github" | null
  >(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    setLoading(false);

    if (error) {
      console.log(error);
      toast.error(error.message || "Registration failed.");
    } else {
      toast.success("Account created successfully!");
      router.push("/chat");
    }
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    const { data, error } = await authClient.signIn.social({
      provider: provider,
      callbackURL: "/",
    });

    if (error) {
      toast.error(error.message || `${provider} signup failed`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-transparent overflow-hidden font-mono text-white px-4 sm:px-0">
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <motion.div
            className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-3 bg-white/5 rounded-full border border-white/10 shadow-inner">
              <User size={30} className="sm:w-[35px] sm:h-[35px]" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Create Account
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Join us to start summarizing instantly
              </p>
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="space-y-3 sm:space-y-4">
              <motion.div className="group relative" variants={itemVariants}>
                <input
                  type="text"
                  name="name"
                  id="name"
                  placeholder="Full Name"
                  required
                  className="w-full bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 sm:py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 text-sm sm:text-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </motion.div>
              <motion.div className="group relative" variants={itemVariants}>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Email Address"
                  required
                  className="w-full bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 sm:py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 text-sm sm:text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>
              <motion.div className="group relative" variants={itemVariants}>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Create a Password"
                  required
                  className="w-full bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 sm:py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 text-sm sm:text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              variants={itemVariants}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-gray-200 text-gray-800 font-bold rounded-xl py-3 sm:py-3.5 mt-1 sm:mt-2 hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <LoaderIcon className="animate-spin w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                "Sign Up"
              )}
            </motion.button>

            <motion.div
              className="relative flex py-2 items-center"
              variants={itemVariants}
            >
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-3 sm:mx-4 text-gray-500 text-[10px] sm:text-xs text-center">
                Or continue with
              </span>
              <div className="flex-grow border-t border-white/10"></div>
            </motion.div>

            <motion.div className="flex gap-3" variants={itemVariants}>
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={socialLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 sm:py-3.5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {socialLoading === "google" ? (
                  <LoaderIcon className="animate-spin w-5 h-5" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("github")}
                disabled={socialLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 sm:py-3.5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {socialLoading === "github" ? (
                  <LoaderIcon className="animate-spin w-5 h-5" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                )}
              </button>
            </motion.div>
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/account/login"
                className="w-full flex justify-center bg-transparent border border-white/10 text-white font-medium rounded-xl py-3 sm:py-3.5 hover:bg-white/5 transition-colors text-center text-sm sm:text-base"
              >
                Log In
              </Link>
            </motion.div>
          </motion.form>
        </div>

        <motion.p
          className="text-center text-gray-600 text-[10px] sm:text-xs mt-4 sm:mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          &copy; 2026 Briefly.AI. All rights reserved.
        </motion.p>
      </motion.div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
};

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default SignupPage;
