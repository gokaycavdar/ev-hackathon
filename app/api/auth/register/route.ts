import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, role } = body;

        // Validation
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "İsim, email ve şifre gerekli" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Şifre en az 6 karakter olmalı" },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Geçerli bir email adresi girin" },
                { status: 400 }
            );
        }

        // Email'in zaten kullanılıp kullanılmadığını kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Bu email adresi zaten kullanılıyor" },
                { status: 409 }
            );
        }

        // Şifreyi hash'le
        const hashedPassword = await bcrypt.hash(password, 10);

        // Rol belirleme (email domain bazlı veya kullanıcı seçimi)
        let userRole = role || "DRIVER";

        // Email domain'e göre otomatik rol ataması
        const emailDomain = email.split("@")[1]?.toLowerCase();
        const operatorDomains = ["zorlu.com", "enerji.com", "power.com"];

        if (!role && emailDomain && operatorDomains.includes(emailDomain)) {
            userRole = "OPERATOR";
        }

        // Kullanıcı oluştur
        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: userRole,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                coins: true,
                co2Saved: true,
                xp: true,
            },
        });

        return NextResponse.json({
            message: "Kayıt başarılı",
            user,
        });
    } catch (error) {
        console.error("Registration failed", error);
        return NextResponse.json(
            { error: "Kayıt sırasında bir hata oluştu" },
            { status: 500 }
        );
    }
}
