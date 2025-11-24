"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Calendar, Wallet, LogOut } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-800 text-white">
      {/* Sidebar (Yan Menü) */}
      <aside className="w-20 lg:w-64 bg-slate-700 border-r border-slate-600 flex flex-col p-4">
        <div className="font-bold text-green-400 text-xl mb-8 hidden lg:block">SmartCharge</div>
        
        <nav className="space-y-2 flex-1">
          <Link 
            href="/driver" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/driver" 
                ? "bg-slate-600/50 text-blue-400 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Map size={20} /> <span className="hidden lg:block">Harita</span>
          </Link>
          <Link 
            href="/driver/appointments" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/driver/appointments" 
                ? "bg-slate-600/50 text-blue-400 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Calendar size={20} /> <span className="hidden lg:block">Randevular</span>
          </Link>
          <Link 
            href="/driver/wallet" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/driver/wallet" 
                ? "bg-slate-600/50 text-blue-400 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Wallet size={20} /> <span className="hidden lg:block">Cüzdanım</span>
          </Link>
        </nav>

        <Link href="/" className="flex items-center gap-3 p-3 hover:bg-red-900/20 text-red-400 rounded-xl mt-auto transition-colors">
          <LogOut size={20} /> <span className="hidden lg:block">Çıkış</span>
        </Link>
      </aside>

      {/* Ana İçerik Alanı (Harita buraya render olacak) */}
      <main className="flex-1 overflow-hidden relative">
        {children}
        <ChatWidget />
      </main>
    </div>
  );
}