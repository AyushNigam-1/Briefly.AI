"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Ghost,
  Pin,
  Plus,
  Share2,
  Trash,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryHistoryResponse } from "@/app/types";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import TaskManagerModal from "../modals/Tasks";
import SearchModal from "../modals/SearchChat";
import ShareModal from "../modals/Share";
import DeleteChatDialog from "../modals/DeleteChat";

const Sidebar = ({ user }: { user: any; isLoading: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summaryId, setSummaryId] = useState<string>();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareChatInfo, setShareChatInfo] = useState({ id: "", title: "" });
  const activeId = searchParams.get("id");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsOpen((v) => !v);
  };

  const handleMobileNav = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["chats", user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(`/chats/?skip=${pageParam}&limit=20`);
      return {
        chats: res.data.chats as SummaryHistoryResponse[],
        nextSkip: res.data.chats?.length === 20 ? pageParam + 20 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    enabled: mounted && !!user?.id,
  });

  const chats = data?.pages.flatMap((page) => page.chats) || [];

  useEffect(() => {
    const handleChatTitled = (event: any) => {
      const { id, title } = event.detail;

      queryClient.setQueryData(["chats", user?.id], (oldData: any) => {
        if (!oldData) return oldData;

        let exists = false;
        const newPages = oldData.pages.map((page: any) => {
          const updatedChats = page.chats.map((c: any) => {
            if (c.id === id) {
              exists = true;
              return { ...c, title };
            }
            return c;
          });
          return { ...page, chats: updatedChats };
        });

        if (exists) {
          return { ...oldData, pages: newPages };
        } else {
          router.push(`/?id=${id}`);
          const newChat = {
            id,
            title,
            is_pinned: false,
            timestamp: new Date().toISOString(),
            url: "",
            queries: 0,
            type: "chat",
            thumbnail: "",
          };
          const firstPage = {
            ...oldData.pages[0],
            chats: [newChat, ...oldData.pages[0].chats],
          };
          return { ...oldData, pages: [firstPage, ...oldData.pages.slice(1)] };
        }
      });
    };

    window.addEventListener("chat-title", handleChatTitled);
    return () => window.removeEventListener("chat-title", handleChatTitled);
  }, [queryClient, router, user?.id]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/summary/?id=${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["chats", user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            chats: page.chats.filter((c: any) => c.id !== deletedId),
          })),
        };
      });
      toast.success("Chat deleted successfully");
      setDialogOpen(false);
      if (activeId === deletedId) {
        router.push("/");
      }
    },
    onError: () => {
      toast.error("Failed to delete chat");
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned }: { id: string; is_pinned: boolean }) =>
      api.patch(`/summary/${id}/pin`, { is_pinned }),
    onMutate: async ({ id, is_pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["chats", user?.id] });
      const previousChats = queryClient.getQueryData(["chats", user?.id]);

      queryClient.setQueryData(["chats", user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            chats: page.chats.map((c: any) =>
              c.id === id ? { ...c, is_pinned } : c,
            ),
          })),
        };
      });
      return { previousChats };
    },
    onSuccess: (_, variables) => {
      toast.success(variables.is_pinned ? "Chat pinned" : "Chat unpinned");
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["chats", user?.id], context?.previousChats);
      toast.error("Failed to update pin status");
    },
  });

  if (!user) return null;

  const filtered = chats.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );
  const pinnedChats = filtered.filter((c) => c.is_pinned);
  const recentChats = filtered.filter((c) => !c.is_pinned);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 50 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      fetchNextPage();
    }
  };

  const options = (chat: SummaryHistoryResponse) => [
    {
      label: chat.is_pinned ? "Unpin" : "Pin",
      icon: (
        <Pin
          size={16}
          className={chat.is_pinned ? "fill-slate-800 dark:fill-white" : ""}
        />
      ),
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        pinMutation.mutate({ id: chat.id, is_pinned: !chat.is_pinned });
      },
    },
    {
      label: "Share",
      icon: <Share2 size={16} />,
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        setShareChatInfo({ id: chat.id, title: chat.title });
        setShareModalOpen(true);
      },
    },
    {
      label: "Delete",
      icon: <Trash size={16} />,
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        setSummaryId(chat.id);
        setDialogOpen(true);
      },
    },
  ];

  const renderChatItem = (s: SummaryHistoryResponse) => (
    <motion.div
      layout
      key={s.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.95,
        height: 0,
        marginBottom: 0,
        marginTop: 0,
      }}
      transition={{
        duration: 0.35,
        layout: { type: "tween", duration: 0.2, ease: "easeOut" },
      }}
      className={`group relative overflow-hidden flex items-center justify-between transition-colors rounded-xl pr-1 md:pr-2 mb-1 text-sm md:text-base
            ${
              activeId == s.id
                ? "font-medium bg-slate-100 border border-slate-200 text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-gray-400 border border-transparent dark:hover:text-white dark:hover:bg-white/5"
            }`}
    >
      <Link
        href={`chat/?id=${s.id}`}
        onClick={handleMobileNav}
        className="flex-1 outline-none focus:outline-none p-1.5 md:p-2 truncate"
      >
        <span className="truncate pr-2">{s.title}</span>
      </Link>

      <Menu as="div" className="flex items-center">
        <MenuButton
          className="p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200
                    bg-white text-slate-600 hover:bg-slate-200 shadow-sm md:shadow-none
                    dark:bg-tertiary dark:hover:bg-white/5 dark:shadow-none"
        >
          <EllipsisVertical size={14} />
        </MenuButton>
        <MenuItems
          transition
          anchor="right"
          className="w-40 md:w-44 mx-4 rounded-xl border flex flex-col p-1.5 md:p-2 z-50 transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 shadow-xl
                        bg-white border-slate-200 text-slate-800
                        dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none"
        >
          {options(s).map((option) => (
            <MenuItem key={option.label}>
              <button
                onClick={option.action}
                disabled={pinMutation.isPending || deleteMutation.isPending}
                className="group z-50 flex w-full p-1.5 md:p-2 items-center gap-2 md:gap-3 rounded-lg text-sm md:text-base font-bold transition-colors
                                    disabled:opacity-50
                                    data-[focus]:bg-slate-100
                                    dark:data-[focus]:bg-white/5"
              >
                {option.icon}
                {option.label}
              </button>
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed top-0 left-0 h-full w-[60vw] md:w-72 border-r font-mono shadow-2xl md:shadow-lg transform transition-transform duration-300 z-50
                    bg-white border-slate-200 text-slate-800
                    dark:bg-tertiary dark:border-secondary dark:text-white
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -right-6 md:-right-5 flex h-16 w-6 md:h-16 md:w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:text-slate-800 dark:border-secondary dark:bg-tertiary dark:text-gray-400 dark:hover:text-white focus:outline-none"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="p-3 md:p-4 space-y-3 md:space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold">Chats</h2>
            <button
              onClick={() => {
                router.push("/?id=private");
                handleMobileNav();
              }}
              title="Incognito Chat"
              className="transition-colors hover:text-slate-600 dark:hover:text-gray-300"
            >
              <Ghost size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              router.push("/chat");
              handleMobileNav();
            }}
            className="p-3 flex items-center w-full justify-center gap-2 font-bold text-sm md:text-base rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
          >
            <Plus size={16} /> New Chat
          </button>
          <SearchModal onCloseSidebar={() => handleMobileNav()} />
          <TaskManagerModal onCloseSidebar={() => handleMobileNav()} />

          <div
            onScroll={handleScroll}
            className="overflow-y-auto min-h-0 flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5"
          >
            {isLoading && (
              <div className="flex justify-center items-center py-2">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            )}
            {isError && (
              <p className="text-red-500 dark:text-red-400 mb-2 text-sm text-center">
                Failed to load summaries.
              </p>
            )}

            <div className="space-y-4 overflow-y-auto pb-4">
              {pinnedChats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-xs md:text-sm tracking-wide text-slate-500 dark:text-gray-200">
                    Pinned
                  </h3>
                  <div className="space-y-1">
                    <AnimatePresence>
                      {pinnedChats.map((s) => renderChatItem(s))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {recentChats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm tracking-wide text-slate-500 dark:text-gray-200">
                    Recents
                  </h3>
                  <div className="space-y-1">
                    <AnimatePresence>
                      {recentChats.map((s) => renderChatItem(s))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {isFetchingNextPage && (
                <div className="flex justify-center mt-2">
                  <Loader2
                    size={16}
                    className="animate-spin text-slate-500 dark:text-gray-400"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        chatId={shareChatInfo.id}
        chatTitle={shareChatInfo.title}
      />
      <DeleteChatDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => {
          if (summaryId) deleteMutation.mutate(summaryId);
        }}
      />
    </>
  );
};

export default Sidebar;
