import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = {
	params: Promise<{
		id: string;
	}>;
};

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const userId = Number.parseInt(id, 10);

	if (Number.isNaN(userId)) {
		return NextResponse.json({ error: "Geçersiz kullanıcı kimliği" }, { status: 400 });
	}

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				badges: true,
				stations: true,
				reservations: {
					include: {
						station: { select: { id: true, name: true, price: true } },
					},
					orderBy: { id: "desc" },
					take: 10,
				},
			},
		});

		if (!user) {
			return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
		}

		type BadgeRecord = (typeof user.badges)[number];
		type StationRecord = (typeof user.stations)[number];
		type ReservationRecord = (typeof user.reservations)[number];

		const badges = user.badges.map(({ id, name, description, icon }: BadgeRecord) => ({
			id,
			name,
			description,
			icon,
		}));

		const stations = user.stations.map(({ id, name, price, lat, lng }: StationRecord) => ({
			id,
			name,
			price,
			lat,
			lng,
		}));

		const reservations = user.reservations.map(
			({ id, date, hour, isGreen, earnedCoins, status, station }: ReservationRecord) => ({
				id,
				date,
				hour,
				isGreen,
				earnedCoins,
				status,
				station,
			}),
		);

		return NextResponse.json({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			coins: user.coins,
			co2Saved: user.co2Saved,
			xp: user.xp,
			badges,
			stations,
			reservations,
		});
	} catch (error) {
		console.error("User fetch failed", error);
		return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
	}
}

export async function PUT(request: Request, { params }: Params) {
	const { id } = await params;
	const userId = Number.parseInt(id, 10);

	if (Number.isNaN(userId)) {
		return NextResponse.json({ error: "Geçersiz kullanıcı kimliği" }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { name, email } = body;

		const user = await prisma.user.update({
			where: { id: userId },
			data: {
				name,
				email,
			},
		});

		return NextResponse.json(user);
	} catch (error) {
		console.error("User update failed", error);
		return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
	}
}
