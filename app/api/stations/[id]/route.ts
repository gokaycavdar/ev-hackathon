import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const GREEN_START = 23;
const GREEN_END = 6;

const GREEN_LOAD_RANGE = [12, 38] as const;
const RED_LOAD_RANGE = [55, 92] as const;

function isGreenHour(hour: number) {
  return hour >= GREEN_START || hour <= GREEN_END;
}

function getRandomLoad(isGreen: boolean) {
  const [min, max] = isGreen ? GREEN_LOAD_RANGE : RED_LOAD_RANGE;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const stationId = Number.parseInt(id, 10);

  if (Number.isNaN(stationId)) {
    return NextResponse.json({ error: "Geçersiz istasyon kimliği" }, { status: 400 });
  }

  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    return NextResponse.json({ error: "İstasyon bulunamadı" }, { status: 404 });
  }

  // Fetch active campaigns for this station or global
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

  const activeCampaign = campaigns[0]; // Apply the most recent active campaign
  
  // Parse discount (e.g. "%20" -> 0.20)
  let campaignDiscountRate = 0;
  if (activeCampaign && activeCampaign.discount.includes("%")) {
    const val = parseInt(activeCampaign.discount.replace(/\D/g, ""), 10);
    if (!isNaN(val)) campaignDiscountRate = val / 100;
  }

  const today = new Date();
  today.setMinutes(0, 0, 0);

  const slots = Array.from({ length: 24 }, (_, hour) => {
    const slotDate = new Date(today);
    slotDate.setHours(hour, 0, 0, 0);

    const green = isGreenHour(hour);
    
    // Base logic
    let price = station.price;
    let coins = green ? 50 : 10;

    // Apply Green Hour Discount (20%)
    if (green) {
      price = price * 0.8;
    }

    // Apply Campaign Discount (Stacking)
    if (campaignDiscountRate > 0) {
      price = price * (1 - campaignDiscountRate);
    }

    // Apply Campaign Coin Reward
    if (activeCampaign?.coinReward) {
      coins += activeCampaign.coinReward;
    }

    return {
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      startTime: slotDate.toISOString(),
      isGreen: green,
      coins,
      price: Number(price.toFixed(2)),
      status: green ? "GREEN" : "RED",
      load: getRandomLoad(green),
      campaignApplied: activeCampaign ? {
        title: activeCampaign.title,
        discount: activeCampaign.discount
      } : null
    };
  });

  return NextResponse.json({ ...station, slots, activeCampaign });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const stationId = Number.parseInt(id, 10);

  if (Number.isNaN(stationId)) {
    return NextResponse.json({ error: "Geçersiz istasyon kimliği" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, latitude, longitude, address, price } = body;

    const updatedStation = await prisma.station.update({
      where: { id: stationId },
      data: {
        name,
        lat: latitude,
        lng: longitude,
        address,
        price,
      },
    });

    return NextResponse.json(updatedStation);
  } catch (error) {
    console.error("Failed to update station", error);
    return NextResponse.json({ error: "İstasyon güncellenemedi" }, { status: 500 });
  }
}