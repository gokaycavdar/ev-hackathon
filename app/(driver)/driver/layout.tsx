"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Calendar, Wallet, LogOut, Zap } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import GlobalAIWidget from "@/components/GlobalAIWidget";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-primary-bg text-primary font-sans overflow-hidden">
      {/* Sidebar (Yan Menü) */}
      <aside className="w-20 lg:w-64 bg-surface-1 border-r border-white/5 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center gap-2 font-bold text-xl mb-10 px-2">
          <div className="h-8 w-8 rounded-lg bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20">
             <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="hidden lg:block text-gradient font-display font-extrabold tracking-tight">SmartCharge</span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link 
            href="/driver" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/driver" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Map size={20} className={pathname === "/driver" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Harita</span>
          </Link>
          <Link 
            href="/driver/appointments" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/driver/appointments" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Calendar size={20} className={pathname === "/driver/appointments" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Randevular</span>
          </Link>
          <Link 
            href="/driver/wallet" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/driver/wallet" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Wallet size={20} className={pathname === "/driver/wallet" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Cüzdanım</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5">
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-500/10 text-text-secondary hover:text-red-400 rounded-xl transition-all font-medium">
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" /> <span className="hidden lg:block">Çıkış</span>
            </Link>
        </div>
      </aside>

      {/* Ana İçerik Alanı (Harita buraya render olacak) */}
      <main className={`flex-1 relative ${pathname === "/driver" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
        <GlobalAIWidget />
        <ChatWidget />
      </main>
    </div>
  );
}