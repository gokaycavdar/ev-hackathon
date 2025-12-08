"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Megaphone, Settings, LogOut } from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-primary-bg text-primary font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-surface-1 border-r border-white/5 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center gap-3 font-bold text-xl mb-10 px-2">
          <div className="h-9 w-9 rounded-xl bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20">
             <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="hidden lg:block text-white tracking-tight font-display font-extrabold">Otwatt</span>
        </div>
        
        <nav className="space-y-1.5 flex-1">
          <Link 
            href="/operator" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard size={20} className={pathname === "/operator" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Panel</span>
          </Link>
          <Link 
            href="/operator/campaigns" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/campaigns" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Megaphone size={20} className={pathname === "/operator/campaigns" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Kampanyalar</span>
          </Link>
          <Link 
            href="/operator/stations" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/stations" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Zap size={20} className={pathname === "/operator/stations" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">İstasyonlar</span>
          </Link>
          <Link 
            href="/operator/settings" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/settings" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={20} className={pathname === "/operator/settings" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Ayarlar</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5">
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-500/10 text-text-secondary hover:text-red-400 rounded-xl transition-all font-medium">
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" /> <span className="hidden lg:block">Çıkış</span>
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
