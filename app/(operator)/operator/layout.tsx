"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Megaphone, Settings, LogOut } from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-800 text-white">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-700 border-r border-slate-600 flex flex-col p-4">
        <div className="font-bold text-purple-400 text-xl mb-8 hidden lg:block px-2">SmartCharge</div>
        
        <nav className="space-y-2 flex-1">
          <Link 
            href="/operator" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/operator" 
                ? "bg-slate-600/50 text-purple-300 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <LayoutDashboard size={20} /> <span className="hidden lg:block">Panel</span>
          </Link>
          <Link 
            href="/operator/campaigns" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/operator/campaigns" 
                ? "bg-slate-600/50 text-purple-300 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Megaphone size={20} /> <span className="hidden lg:block">Kampanyalar</span>
          </Link>
          <Link 
            href="/operator/stations" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/operator/stations" 
                ? "bg-slate-600/50 text-purple-300 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Zap size={20} /> <span className="hidden lg:block">İstasyonlar</span>
          </Link>
          <Link 
            href="/operator/settings" 
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              pathname === "/operator/settings" 
                ? "bg-slate-600/50 text-purple-300 font-medium" 
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Settings size={20} /> <span className="hidden lg:block">Ayarlar</span>
          </Link>
        </nav>

        <Link href="/" className="flex items-center gap-3 p-3 hover:bg-red-900/20 text-red-400 rounded-xl mt-auto transition-colors">
          <LogOut size={20} /> <span className="hidden lg:block">Çıkış</span>
        </Link>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
