import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const rawPassword = typeof body?.password === "string" ? body.password : "";

    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email ve şifre gerekli" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        badges: true,
        stations: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    type BadgeRecord = (typeof user.badges)[number];
    type StationRecord = (typeof user.stations)[number];

    const badges = user.badges.map(
      ({ id, name, description, icon }: BadgeRecord) => ({
        id,
        name,
        description,
        icon,
      }),
    );

    const stations = user.stations.map(({ id, name, price }: StationRecord) => ({
      id,
      name,
      price,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        coins: user.coins,
        co2Saved: user.co2Saved,
        xp: user.xp,
        badges,
        stations,
      },
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
