import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from './push';

/**
 * 알림 구독의 첫 관문. VAPID 공개키가 조금이라도 어긋나면 pushManager.subscribe가
 * 그 자리에서 거절하는데, 화면에는 "설정하는 중…"만 잠깐 스치고 아무 일도 일어나지
 * 않는다. 실패가 눈에 안 보이는 종류라 배포 전에 여기서 잡는다.
 */
describe('VAPID 키', () => {
	it('base64url을 그대로 되돌린다', () => {
		// 'Hello' → base64 SGVsbG8=, base64url은 패딩이 없다
		expect([...urlBase64ToUint8Array('SGVsbG8')]).toEqual([72, 101, 108, 108, 111]);
	});

	it('-와 _를 +와 /로 되돌린다', () => {
		// base64 '+/++' 네 글자는 세 바이트다. base64url에서는 +가 -, /가 _로 온다
		expect([...urlBase64ToUint8Array('-_--')]).toEqual([251, 255, 190]);
	});

	it('공개키가 P-256 비압축 형식이다 — 65바이트에 0x04로 시작', () => {
		const bytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
		expect(bytes.length, `키 길이가 ${bytes.length}바이트다`).toBe(65);
		expect(bytes[0], '비압축 공개키는 0x04로 시작해야 한다').toBe(4);
	});

	it('키가 한 글자만 바뀌어도 검사가 깨진다', () => {
		const broken = 'A' + VAPID_PUBLIC_KEY.slice(1);
		const bytes = urlBase64ToUint8Array(broken);
		expect(bytes[0]).not.toBe(4);
	});
});
