"use client"
import { useState } from 'react';
import { Check, Sparkles, Zap, Shield, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

export default function PricingPage() {
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    // This handles the Stripe redirect we built earlier!
    const handleCheckout = async (priceId: string, tierName: string) => {
        setLoadingTier(tierName);
        const token = Cookies.get("access_token");

        try {
            const response = await fetch("http://localhost:8000/payment/create-checkout-session", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                // Pass the specific price ID depending on which tier they clicked
                body: JSON.stringify({ price_id: priceId })
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error("Checkout failed:", error);
            setLoadingTier(null);
        }
    };

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
                "Community support"
            ],
            buttonText: "Current Plan",
            isCurrent: true,
            isPopular: false,
            priceId: null // No Stripe ID for free
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
                "Priority email support"
            ],
            buttonText: "Upgrade to Pro",
            isCurrent: false,
            isPopular: true,
            priceId: "price_1T3Z7bLIlOqwk7LfWJjRV28L" // Replace with your Pro Stripe Price ID
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
                "99.9% Uptime SLA"
            ],
            buttonText: "Upgrade to Max",
            isCurrent: false,
            isPopular: false,
            priceId: "price_1T3arQLIlOqwk7Lftg4SWrO3" // Replace with your Max Stripe Price ID
        }
    ];

    return (
        <>
            <div className="bg-[#0b0b0b] text-slate-200 py-20 px-4 font-mono flex flex-col items-center">

                <div className="text-center max-w-2xl mb-16 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Choose the plan that fits your workflow. Upgrade anytime to unlock the full power of Briefly.AI.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${tier.isPopular
                                ? "bg-white/5 border-slate-300 shadow-2xl shadow-white/5 scale-105 z-10"
                                : "bg-[#121212] border-white/10 hover:border-white/20"
                                }`}
                        >
                            {/* Popular Badge */}
                            {tier.isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            {/* Tier Header */}
                            <div className="mb-6 flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${tier.isPopular ? 'bg-white/10' : 'bg-white/5'}`}>
                                    {tier.icon}
                                </div>
                                <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
                            </div>

                            <div className="mb-4">
                                <span className="text-4xl font-bold text-white">{tier.price}</span>
                                {tier.period && <span className="text-slate-400">{tier.period}</span>}
                            </div>

                            <p className="text-slate-400 text-sm mb-8 h-10">
                                {tier.description}
                            </p>

                            {/* Button */}
                            <button
                                disabled={tier.isCurrent || loadingTier === tier.name}
                                onClick={() => tier.priceId && handleCheckout(tier.priceId, tier.name)}
                                className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors mb-8 ${tier.isCurrent
                                    ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                                    : tier.isPopular
                                        ? "bg-white text-black hover:bg-slate-200"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                    }`}
                            >
                                {loadingTier === tier.name && <Loader2 size={16} className="animate-spin" />}
                                {tier.buttonText}
                            </button>

                            {/* Features List */}
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Includes</p>
                                <ul className="space-y-4">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                                            <Check size={18} className={tier.isPopular ? "text-white" : "text-slate-500"} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}