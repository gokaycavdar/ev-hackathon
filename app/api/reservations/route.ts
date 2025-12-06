import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, stationId, date, hour, isGreen } = body ?? {};

    if (!userId || !stationId || !date || !hour || typeof isGreen !== "boolean") {
      return NextResponse.json({ error: "Eksik rezervasyon bilgisi" }, { status: 400 });
    }

    const reservationDate = new Date(date);
    if (Number.isNaN(reservationDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    // Check for active campaigns to apply bonus coins
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: new Date() },
        OR: [
          { stationId: stationId },
          { stationId: null }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    const activeCampaign = campaigns[0];

    let earnedCoins = isGreen ? 50 : 10;
    if (activeCampaign?.coinReward) {
      earnedCoins += activeCampaign.coinReward;
    }

    const co2SavedDelta = isGreen ? 2.5 : 0.5;

    // FIX: Do not grant rewards immediately. Status is PENDING.
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        stationId,
        date: reservationDate,
        hour,
        isGreen,
        earnedCoins,
        status: "PENDING", // Changed from CONFIRMED
      },
    });

    return NextResponse.json({
      success: true,
      message: "Rezervasyon oluşturuldu. Simülasyonu tamamlayınca ödüller kazanacaksın.",
      reservation,
      // User stats are not updated yet, so we don't return new user stats or we return current ones if needed.
      // For now, frontend shouldn't expect updated stats immediately.
    });
  } catch (error) {
    console.error("Reservation create failed", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}