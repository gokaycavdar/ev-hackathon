import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, userId } = body;

    // Simulate "AI" processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch stations to "analyze"
    const stations = await prisma.station.findMany({
      take: 5,
      include: { owner: true },
    });

    // Simple rule-based logic (The "LLM")
    // In a real scenario, we would send `stations` and `message` to OpenAI API.
    // Here we simulate the response.

    const recommendations = stations.slice(0, 3).map((station, index) => {
      // Mock logic: Suggest evening hours for higher coins
      const suggestedHour = ["20:00", "21:00", "22:00"][index];
      return {
        id: station.id,
        name: station.name,
        hour: suggestedHour,
        coins: 50 + (index * 10), // Mock dynamic coins
        reason: "Düşük şebeke yükü & Yüksek ödül",
        isGreen: true,
      };
    });

    const responseText = "Şu anki şebeke verilerine ve konumuna göre senin için en verimli 3 istasyonu analiz ettim. Akşam saatlerinde şarj ederek %30 daha fazla SmartCoin kazanabilirsin.";

    return NextResponse.json({
      role: "bot",
      content: responseText,
      recommendations: recommendations,
    });

  } catch (error) {
    console.error("Chat error", error);
    return NextResponse.json({ error: "AI servisi şu an yanıt veremiyor." }, { status: 500 });
  }
}
