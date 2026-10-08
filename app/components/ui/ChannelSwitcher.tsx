"use client";

import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ChannelInfo = { channelId: string; title: string; thumbnail?: string | null };

function ChannelSwitcher() {
  const { data: session, update } = useSession();
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [addingChannel, setAddingChannel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadChannels = () => {
    fetch("/api/channels")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setChannels(data);
      });
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // إقفال القائمة لو ضغطت بره
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectChannel = async (channelId: string) => {
    if (channelId === session?.channelId) {
      setOpen(false);
      return;
    }
    setSwitching(channelId);
    await update({ channelId }); // بيبدّل فورًا من غير أي OAuth — شغال من خلال jwt callback
    setSwitching(null);
    setOpen(false);
  };

  const addChannel = async () => {
    setAddingChannel(true);
    // provider منفصل تمامًا عن تسجيل الدخول — ده اللي بيطلب صلاحيات يوتيوب ويفتح
    // شاشة اختيار/ربط حساب Google جديد كقناة، من غير ما يمس هوية تسجيل الدخول الحالية
    await signIn("google-channel");
  };

  const currentTitle = session?.channelTitle ?? "اختار قناة";
  const currentThumb = session?.channelThumbnail;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) loadChannels();
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full"
      >
        {currentThumb ? (
          <Image
            src={currentThumb}
            alt={currentTitle}
            width={26}
            height={26}
            className="rounded-full border border-gray-200 dark:border-gray-700 shrink-0"
          />
        ) : (
          <div className="w-6.5 h-6.5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
        )}
        <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1 text-right">
          {currentTitle}
        </span>
        <span className={`text-gray-400 text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 max-w-[80vw] bottom-16 -right-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {channels.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">لسه مربطتش أي قناة</p>
            )}
            {channels.map((c) => {
              const active = c.channelId === session?.channelId;
              return (
                <button
                  key={c.channelId}
                  onClick={() => selectChannel(c.channelId)}
                  disabled={switching !== null}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-60 ${active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                    }`}
                >
                  {c.thumbnail ? (
                    <Image src={c.thumbnail} alt={c.title} width={24} height={24} className="rounded-full shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-right">{c.title}</span>
                  {switching === c.channelId && <span className="text-[10px] text-gray-400 shrink-0">...</span>}
                  {active && switching !== c.channelId && <span className="text-blue-500 text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={addChannel}
            disabled={addingChannel}
            className="w-full text-xs text-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-center gap-1.5 disabled:opacity-60"
          >
            <span>＋</span>
            {addingChannel ? "جاري التحويل..." : "إضافة قناة جديدة"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ChannelSwitcher;
