import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "Geçersiz rezervasyon ID" }, { status: 400 });
    }

    // 1. Get the reservation to check status and reward details
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
    }

    if (reservation.status === "COMPLETED") {
      return NextResponse.json({ error: "Bu rezervasyon zaten tamamlanmış" }, { status: 400 });
    }

    // 2. Get payload from request if available (Hackathon Simplicity)
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty
    }
    
    // Use payload values or fallback to defaults
    // @ts-ignore
    const earnedCoins = body.earnedCoins ?? 50; // Default fixed 50
    // @ts-ignore
    const xpDelta = body.earnedXp ?? 50; // Default fixed 50
    
    const co2SavedDelta = reservation.isGreen ? 2.5 : 0.5;

    // 3. Transaction: Update reservation status AND User stats
    const [updatedReservation, updatedUser] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservationId },
        data: { 
          status: "COMPLETED",
          earnedCoins: earnedCoins // Update with actual earned amount
        },
      }),
      prisma.user.update({
        where: { id: reservation.userId },
        data: {
          coins: { increment: earnedCoins },
          co2Saved: { increment: co2SavedDelta },
          xp: { increment: xpDelta },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Simülasyon tamamlandı, ödüller yüklendi!",
      reservation: updatedReservation,
      user: {
        id: updatedUser.id,
        coins: updatedUser.coins,
        co2Saved: updatedUser.co2Saved,
        xp: updatedUser.xp,
      },
    });

  } catch (error) {
    console.error("Reservation completion failed", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
