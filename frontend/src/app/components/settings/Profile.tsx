"use client";

import api from "@/app/lib/api";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UserProfile {
  name?: string;
  image?: string;
  nickname?: string;
  occupation?: string;
  about?: string;
  email?: string;
  phone?: string;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading: isQueryLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get("/profile/");
      return res.data;
    },
  });

  useEffect(() => {
    if (data && !isInitialized) {
      setProfile(data);
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  const isLoading = isQueryLoading || !isInitialized;

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<UserProfile>) => {
      await api.put("/profile/", payload);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["profile"] });
      const previous = queryClient.getQueryData(["profile"]);

      queryClient.setQueryData(["profile"], (old: any) => ({
        ...old,
        ...payload,
      }));

      return { previous };
    },
    onSuccess: () => {
      toast.success("Profile saved", { id: "profile-save", duration: 2000 });
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["profile"], context?.previous);
      toast.error("Failed to update profile", { id: "profile-save" });
    },
  });

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateMutation.mutate({ [field]: value });
    }, 800);
  };

  return (
    <div className="flex w-full font-mono">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center flex-1 w-full h-[80vh] sm:h-[65vh] z-10"
          >
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-500" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full flex-1"
          >
            <div
              className="flex items-center gap-4 md:p-4 p-2 rounded-xl border transition-colors
                            bg-white border-slate-200 shadow-sm
                            dark:bg-white/5 dark:border-secondary dark:shadow-none"
            >
              {profile.image ? (
                <img src={profile.image} className="h-12 w-12 rounded-full" />
              ) : (
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl transition-colors
                                bg-slate-100 text-slate-700
                                dark:bg-primary dark:text-tertiary"
                >
                  {profile.name?.charAt(0)?.toUpperCase()}
                </div>
              )}

              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">
                  {profile.name || "User"}
                </p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {profile.email || "No email provided"}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Field
                label="Name"
                value={profile.name}
                onChange={(v) => updateField("name", v)}
              />
              <Field
                label="Email"
                value={profile.email}
                onChange={(v) => updateField("email", v)}
              />

              <Field
                label="Phone"
                value={profile.phone}
                onChange={(v) => updateField("phone", v)}
              />
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                About You
              </h3>
              <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                This helps personalize your AI experience.
              </p>
            </div>

            <div className="space-y-5">
              <Field
                label="Nickname"
                value={profile.nickname}
                onChange={(v) => updateField("nickname", v)}
              />

              <Field
                label="Occupation"
                value={profile.occupation}
                onChange={(v) => updateField("occupation", v)}
              />

              <Textarea
                label="More About You"
                value={profile.about}
                onChange={(v) => updateField("about", v)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FieldProps {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <div className="w-full">
      <label
        className="block text-xs sm:text-sm font-semibold mb-1.5 transition-colors
                text-slate-700 dark:text-slate-400"
      >
        {label}
      </label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base outline-none transition-colors border
                    bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400
                    dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:focus:border-white/30"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: FieldProps) {
  return (
    <div className="w-full">
      <label
        className="block text-xs sm:text-sm font-semibold mb-1.5 transition-colors
                text-slate-700 dark:text-slate-400"
      >
        {label}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-28 sm:h-32 rounded-xl px-4 py-3 text-sm sm:text-base outline-none resize-none transition-colors border
                    bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400
                    dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:focus:border-white/30"
      />
    </div>
  );
}
