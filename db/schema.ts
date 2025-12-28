import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
	id: uuid().defaultRandom().primaryKey(), //id competition

	title: text(), // nama lomba
	description: text(), // deskripsi lomba
	organizer: text(), // penyelenggara lomba utama
	institutions: jsonb().$type<string[] | null>(), // yang lain lain
	views: integer(), // 23 views
	poster: text().notNull(), // url gambar poster lomba

	level: jsonb().$type<string[]>(), // SMA, Mahasiswa, Umum

	// rentang waktu pelaksanaan lomba: tanggal mulai dan tanggal selesai
	startDate: timestamp({ withTimezone: false }).notNull(), // tanggal mulai
	endDate: timestamp({ withTimezone: false }).notNull(), // tanggal selesai

	format: text(), // Online | Offline | Hybrid
	participationType: text(), // Individual | Team
	status: text().notNull().default("draft"), // Draft / Published // Closed

	// harga pendaftaran (dalam Rupiah, bilangan bulat tanpa pemisah)
	// Bisa single value: 200000 (Rp 200.000) atau array opsi: [20000, 50000]
	// kalo nol berarti gratis
	pricing: jsonb().$type<number | number[] | null>(),
	contact: jsonb().$type<number | number[] | null>(),

	prize: text().default("0"), // hadiah lomba dalam Rp
	guideUrl: text(), // url panduan lomba
	registrationUrl: text().notNull(), // url pendaftaran

	location: text(), // ???

	socialMedia: jsonb().$type<{
		instagram?: string;
		twitter?: string;
		website?: string;
		email?: string;
		whatsapp?: string;
	}>(),

	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
	id: uuid().defaultRandom().primaryKey(),

	name: text(), // opsional
	email: text(), // opsional

	message: text().notNull(), // isi kritik / saran
	type: text().$type<"kritik" | "saran" | "pengaduan" | "lainnya">(),

	createdAt: timestamp().defaultNow().notNull(),
});
