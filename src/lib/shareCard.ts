/** 결과 공유 이미지 카드 — 클라이언트 Canvas로 생성 후 네이티브 공유 */

/** 로고와 완전히 같은 7세그먼트 좌표 — 카드의 전구도 사이트 조형 문법에서 나온다 */
const SEG: Record<string, [number, number, number, number]> = {
	a: [10, 0, 34, 7],
	b: [46, 8, 7, 34],
	c: [46, 50, 7, 34],
	d: [10, 86, 34, 7],
	e: [0, 50, 7, 34],
	f: [0, 8, 7, 34],
	g: [10, 43, 34, 7]
};
const GLASS = ['a', 'b', 'c', 'd', 'e', 'f'];

export interface ShareCardData {
	/** 상단 라벨 — '오늘의 딸깍 · 2026. 7. 21' */
	title: string;
	/** 큰 점수 — '8 / 11' 또는 '128점' */
	scoreLabel: string;
	/** 이모지 결과열 (선택, 단일 줄) */
	emojiRow?: string;
	/** 트랙별 결과 그리드 (선택, 최대 3줄) — Wordle식 공유 아티팩트 */
	gridRows?: { label: string; emoji: string }[];
	/** 보조 문구 — '🔥 5일 연속' (선택) */
	subLine?: string;
	/** 하단 유도 문구 */
	cta?: string;
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/** 세그먼트 전구 — 로고와 같은 부품(숫자 0의 6획 + 필라멘트 + 줄기 + 점) */
function drawBulb(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	const seg = (r: [number, number, number, number], fill: string) => {
		roundRect(ctx, r[0], r[1], r[2], r[3], 3);
		ctx.fillStyle = fill;
		ctx.fill();
	};
	for (const k of GLASS) seg(SEG[k], '#f6d34e');
	seg(SEG.g, '#d8ab34'); // 필라멘트
	seg([14, 98, 25, 6], '#ddd0ba'); // 소켓
	seg([16, 108, 21, 6], '#ddd0ba');
	seg([23, 118, 7, 20], '#2c2822'); // 줄기
	seg([19.5, 144, 14, 14], '#2c2822'); // 점
	ctx.restore();
}

/** 공유용 정사각 카드(1080×1080) PNG Blob 생성 */
export async function buildShareCard(d: ShareCardData): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;
	const S = 1080;
	const canvas = document.createElement('canvas');
	canvas.width = S;
	canvas.height = S;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	// 배경(종이색)
	ctx.fillStyle = '#efe7d8';
	ctx.fillRect(0, 0, S, S);

	// 카드
	roundRect(ctx, 60, 60, S - 120, S - 120, 44);
	ctx.fillStyle = '#fdfbf6';
	ctx.fill();
	ctx.strokeStyle = '#e6dcc8';
	ctx.lineWidth = 3;
	ctx.stroke();

	// 로고 — 사이트와 같은 Pretendard 900 + 세그먼트 전구
	ctx.fillStyle = '#2c2822';
	ctx.font = '900 76px Pretendard, -apple-system, sans-serif';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText('딸깍', 130, 235);
	const wmW = ctx.measureText('딸깍').width;
	drawBulb(ctx, 130 + wmW + 20, 118, 0.72);

	// 타이틀(날짜)
	ctx.font = '700 34px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#8a7f6d';
	ctx.fillText(d.title, 130, 300);

	// 점수
	ctx.font = '900 140px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#2f8f5b';
	ctx.fillText(d.scoreLabel, 130, 470);

	let y = 560;
	if (d.gridRows?.length) {
		// Wordle식 트랙별 결과 그리드
		for (const row of d.gridRows) {
			ctx.font = '800 40px Pretendard, -apple-system, sans-serif';
			ctx.fillStyle = '#8a7f6d';
			ctx.fillText(row.label, 130, y);
			ctx.font = '48px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
			ctx.fillStyle = '#2c2822';
			ctx.fillText(row.emoji.slice(0, 24), 250, y);
			y += 74;
		}
		y += 6;
	} else if (d.emojiRow) {
		ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
		ctx.fillStyle = '#2c2822';
		ctx.fillText(d.emojiRow.slice(0, 40), 130, y);
		y += 90;
	}
	if (d.subLine) {
		ctx.font = '800 44px Pretendard, -apple-system, sans-serif';
		ctx.fillStyle = '#c0632e';
		ctx.fillText(d.subLine, 130, y);
	}

	// 하단
	ctx.fillStyle = '#f6d34e';
	ctx.fillRect(130, 880, 96, 12);
	ctx.font = '800 40px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#2c2822';
	ctx.fillText(d.cta ?? '너도 풀어볼래?', 130, 955);
	ctx.font = '600 30px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#9b9184';
	ctx.fillText('딸깍 · 규칙을 발견하는 순간의 그 소리', 130, 1000);

	return new Promise((res) => canvas.toBlob((b) => res(b), 'image/png', 0.95));
}

export type ShareOutcome = 'shared' | 'copied-image' | 'downloaded' | 'copied-text' | 'failed';

/**
 * 이미지 카드 우선 공유. 지원 안 되면 이미지 복사 → 다운로드 → 텍스트 복사 순으로 폴백.
 */
export async function shareResult(card: ShareCardData, text: string): Promise<ShareOutcome> {
	let blob: Blob | null = null;
	try {
		blob = await buildShareCard(card);
	} catch {
		blob = null;
	}

	if (blob) {
		try {
			const file = new File([blob], 'ddalkkak.png', { type: 'image/png' });
			const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
			if (nav.canShare?.({ files: [file] }) && navigator.share) {
				await navigator.share({ files: [file], text });
				return 'shared';
			}
		} catch {
			/* 사용자가 공유 취소 등 — 아래 폴백 */
		}
		try {
			const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
			if (navigator.clipboard && CI) {
				await navigator.clipboard.write([new CI({ 'image/png': blob })]);
				return 'copied-image';
			}
		} catch {
			/* 이미지 클립보드 미지원 */
		}
		try {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'ddalkkak.png';
			a.click();
			URL.revokeObjectURL(url);
			return 'downloaded';
		} catch {
			/* 다운로드 실패 */
		}
	}

	try {
		if (navigator.share) {
			await navigator.share({ text });
			return 'shared';
		}
	} catch {
		/* 취소 */
	}
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return 'copied-text';
		}
	} catch {
		/* 실패 */
	}
	return 'failed';
}

export function outcomeMessage(o: ShareOutcome): string {
	switch (o) {
		case 'shared':
			return '공유했어요!';
		case 'copied-image':
			return '결과 이미지가 복사됐어요 — 붙여넣기로 공유하세요!';
		case 'downloaded':
			return '결과 이미지를 저장했어요 — 친구에게 보내보세요!';
		case 'copied-text':
			return '결과가 복사됐어요 — 친구에게 도전장을 보내세요!';
		default:
			return '공유에 실패했어요';
	}
}
