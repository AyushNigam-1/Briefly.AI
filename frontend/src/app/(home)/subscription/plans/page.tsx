"use client";
import { useState } from "react";
import { Check, Sparkles, Zap, Shield, Loader2 } from "lucide-react";
import api from "@/app/lib/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Delay between each card animating in
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string; tierName: string }) => {
      const response = await api.post("/payment/create-checkout-session", {
        price_id: priceId,
        origin: window.location.origin,
      });
      return response.data;
    },
    onMutate: ({ tierName }) => {
      setLoadingTier(tierName);
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error("Checkout failed:", error);
      toast.error("Failed to initiate checkout. Please try again.");
    },
    onSettled: () => {
      setLoadingTier(null);
    },
  });

  const tiers = [
    {
      name: "Free",
      description: "For exploring the basics of AI.",
      price: "$0",
      icon: <Shield size={20} className="text-slate-400" />,
      features: [
        "100 AI messages per day",
        "Basic models (Llama 3 8B)",
        "Standard response speed",
        "Community support",
      ],
      buttonText: "Current Plan",
      isCurrent: true,
      isPopular: false,
      priceId: null,
    },
    {
      name: "Pro",
      description: "For heavy users and professionals.",
      price: "$9.99",
      period: "/mo",
      icon: <Sparkles size={20} className="text-white" />,
      features: [
        "Unlimited AI messages",
        "Advanced models (GPT-4o, Claude 3.5)",
        "Fastest response speed",
        "Early access to new features",
        "Priority email support",
      ],
      buttonText: "Upgrade to Pro",
      isCurrent: false,
      isPopular: true,
      priceId: "price_1T3Z7bLIlOqwk7LfWJjRV28L",
    },
    {
      name: "Max",
      description: "For power users who need it all.",
      price: "$19.99",
      period: "/mo",
      icon: <Zap size={20} className="text-slate-300" />,
      features: [
        "Everything in Pro",
        "API Access for developers",
        "Custom AI instruction sets",
        "Dedicated account manager",
        "99.9% Uptime SLA",
      ],
      buttonText: "Upgrade to Max",
      isCurrent: false,
      isPopular: false,
      priceId: "price_1T3arQLIlOqwk7Lftg4SWrO3",
    },
  ];

  return (
    <div className="min-h-screen overflow-y-auto space-y-4 bg-[#0b0b0b] text-slate-200 p-6 md:py-12 md:px-0 font-mono flex flex-col items-center w-full">
      {/* Animated Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center max-w-2xl space-y-4 mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold font-sans tracking-tight text-white">
          Simple, transparent pricing
        </h1>
        <p className="text-slate-400 text-base md:text-lg px-4">
          Choose the plan that fits your workflow. Upgrade anytime to unlock the
          full power of Briefly.AI.
        </p>
      </motion.div>

      {/* Staggered Grid Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 max-w-md lg:max-w-6xl w-full pb-12"
      >
        {tiers.map((tier) => (
          <motion.div
            key={tier.name}
            variants={cardVariants}
            whileHover={{ y: -8 }} // Smooth float effect on hover
            className={`relative flex flex-col p-8 rounded-2xl border transition-colors duration-300 ${tier.isPopular
              ? "bg-white/5 border-slate-300 shadow-2xl shadow-white/5 lg:scale-105 z-10"
              : "bg-[#121212] border-white/10 hover:border-white/20"
              }`}
          >
            {tier.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Most Popular
              </div>
            )}

            <div className="mb-6 flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${tier.isPopular ? "bg-white/10" : "bg-white/5"}`}
              >
                {tier.icon}
              </div>
              <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
            </div>

            <div className="mb-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">
                {tier.price}
              </span>
              {tier.period && (
                <span className="text-slate-400">{tier.period}</span>
              )}
            </div>

            <p className="text-slate-400 text-sm mb-8 h-auto lg:h-10">
              {tier.description}
            </p>

            <motion.button
              whileTap={tier.isCurrent ? {} : { scale: 0.97 }} // Squish effect on click
              disabled={tier.isCurrent || loadingTier === tier.name}
              onClick={() =>
                tier.priceId &&
                checkoutMutation.mutate({
                  priceId: tier.priceId,
                  tierName: tier.name,
                })
              }
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors mb-8 outline-none ${tier.isCurrent
                ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                : tier.isPopular
                  ? "bg-white text-black hover:bg-slate-200"
                  : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              {loadingTier === tier.name && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {tier.buttonText}
            </motion.button>

            {/* Features List */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Includes
              </p>
              <ul className="space-y-4">
                {tier.features.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }} // Stagger features slightly
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <Check
                      size={18}
                      className={`shrink-0 ${tier.isPopular ? "text-white" : "text-slate-500"}`}
                    />
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}