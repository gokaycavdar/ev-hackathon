import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const MOCK_LOAD = {
	GREEN: [18, 42],
	YELLOW: [43, 68],
	RED: [69, 96],
} as const;

type MockStatus = keyof typeof MOCK_LOAD;

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mockStatus(): { status: MockStatus; value: number } {
	const statuses: MockStatus[] = ["GREEN", "YELLOW", "RED"];
	const status = statuses[Math.floor(Math.random() * statuses.length)];
	const [min, max] = MOCK_LOAD[status];
	return { status, value: randomInt(min, max) };
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const ownerIdParam = searchParams.get("ownerId");
	const ownerId = ownerIdParam ? Number.parseInt(ownerIdParam, 10) : undefined;

	if (!ownerId || Number.isNaN(ownerId)) {
		return NextResponse.json({ error: "ownerId parametresi gerekli" }, { status: 400 });
	}

	try {
		const stations = await prisma.station.findMany({
			where: { ownerId },
			include: {
				reservations: true,
			},
			orderBy: { id: "asc" },
		});

		type StationRecord = (typeof stations)[number];
		type ReservationRecord = StationRecord["reservations"][number];

		type StationSummary = {
			id: number;
			name: string;
			lat: number;
			lng: number;
			address: string | null;
			price: number;
			mockLoad: number;
			mockStatus: MockStatus;
			reservationCount: number;
			greenReservationCount: number;
			revenue: number;
			status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
			type: "AC" | "DC";
			power: number;
		};

		const stationPayload: StationSummary[] = stations.map((station: StationRecord) => {
			const { status, value } = mockStatus();
			const revenue = station.reservations.reduce((sum: number, reservation: ReservationRecord) => {
				const priceMultiplier = reservation.isGreen ? 0.8 : 1;
				return sum + station.price * priceMultiplier;
			}, 0);

			const greenReservations = station.reservations.filter((reservation: ReservationRecord) => reservation.isGreen).length;

			return {
				id: station.id,
				name: station.name,
				lat: station.lat,
				lng: station.lng,
				address: station.address,
				price: Number(station.price.toFixed(2)),
				mockLoad: value,
				mockStatus: status,
				reservationCount: station.reservations.length,
				greenReservationCount: greenReservations,
				revenue: Number(revenue.toFixed(2)),
				status: "ACTIVE", // Default to ACTIVE as requested
				type: "DC", // Mock type
				power: 120, // Mock power
			};
		});

		const totalRevenue = stationPayload.reduce((sum: number, s: StationSummary) => sum + s.revenue, 0);
		const totalReservations = stationPayload.reduce((sum: number, s: StationSummary) => sum + s.reservationCount, 0);
		const greenReservations = stationPayload.reduce((sum: number, s: StationSummary) => sum + s.greenReservationCount, 0);

		const stats = {
			totalRevenue: Number(totalRevenue.toFixed(2)),
			totalReservations,
			greenShare: totalReservations > 0 ? Number(((greenReservations / totalReservations) * 100).toFixed(1)) : 0,
			avgLoad:
				stationPayload.length > 0
					? Math.round(
							stationPayload.reduce((sum: number, s: StationSummary) => sum + s.mockLoad, 0) /
								stationPayload.length,
						)
					: 0,
		};

		return NextResponse.json({ stats, stations: stationPayload });
	} catch (error) {
		console.error("Operator station fetch failed", error);
		return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { name, lat, lng, address, price, ownerId } = body;

		if (!name || !lat || !lng || !price || !ownerId) {
			return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
		}

		const station = await prisma.station.create({
			data: {
				name,
				lat: Number(lat),
				lng: Number(lng),
				address,
				price: Number(price),
				ownerId: Number(ownerId),
			},
		});

		return NextResponse.json(station);
	} catch (error) {
		console.error("Station create failed", error);
		return NextResponse.json({ error: "İstasyon oluşturulamadı" }, { status: 500 });
	}
}
