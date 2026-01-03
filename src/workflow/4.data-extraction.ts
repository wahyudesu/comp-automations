import { openrouterTextToText, geminiImageToText, mistralOCR } from './lib/function.js';
import { CompetitionSchema } from './lib/competition-schema.js';

const poster_url = "https://objectcompetition.wahyuikbal.com/1766951802939-infest_competition_2026.jpg";
const description_text = `Infest Competition 2026 adalah kompetisi nasional yang diselenggarakan oleh Himpunan Mahasiswa Teknik Informatika Universitas XYZ. Kompetisi ini terbuka untuk peserta dari tingkat SMA, Mahasiswa, dan Umum. Infest Competition 2026 akan dilaksanakan secara online mulai tanggal 1 Maret 2026 hingga 30 April 2026. Biaya pendaftaran sebesar Rp50.000 untuk peserta SMA, Rp75.000 untuk mahasiswa, dan Rp100.000 untuk umum. Hadiah utama berupa uang tunai senilai Rp10.000.000, sertifikat, dan kesempatan magang di perusahaan teknologi ternama. Untuk informasi lebih lanjut dan pendaftaran, kunjungi website kami di www.infestcompetition2026.com atau hubungi kami melalui email`;

function normalize(data: any) {
	if (typeof data.organizer === 'string') data.organizer = [data.organizer];
	if (typeof data.level === 'string') data.level = [data.level];
	if (typeof data.pricing === 'number') data.pricing = [data.pricing];
	if (typeof data.contact === 'string') data.contact = [data.contact];
	return data;
}

function merge(base: any, update: any) {
	const result = { ...base };
	for (const key in update) {
		const value = update[key];
		if (value !== null && value !== undefined && value !== '') {
			if (Array.isArray(value) && value.length > 0) result[key] = value;
			else if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) result[key] = { ...(base[key] || {}), ...value };
			else if (!Array.isArray(value) && typeof value !== 'object') result[key] = value;
		}
	}
	return result;
}

async function main() {
	let data: any = { title: null, organizer: null, level: null, startDate: null, endDate: null, format: null, participationType: null, pricing: null, contact: null, prize: null, guideUrl: null, registrationUrl: '', location: undefined, socialMedia: undefined };

	try { data = merge(data, normalize(await openrouterTextToText(description_text))); } catch {}

	try {
		data = merge(data, normalize(await geminiImageToText(poster_url)));
	} catch {
		try {
			const mistral = await mistralOCR(poster_url);
			const content = mistral?.choices?.[0]?.message?.content;
			if (content) data = merge(data, normalize(JSON.parse(typeof content === 'string' ? content : JSON.stringify(content))));
		} catch {}
	}

	console.log(JSON.stringify(CompetitionSchema.safeParse(data), null, 2));
}

main();
