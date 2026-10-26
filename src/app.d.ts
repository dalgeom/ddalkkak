declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		/** 시트가 열려 있으면 그 이름(BottomSheet — 뒤로가기로 닫기) */
		interface PageState {
			sheet?: string;
			/** 초성 퀴즈 띄우기 진행 화면이 열려 있다(chosung/show — 뒤로가기로 닫기) */
			show?: boolean;
		}

		/**
		 * Cloudflare Pages가 넘겨주는 실행 환경.
		 * STATS는 대시보드에서 연결한 KV 네임스페이스(ddalkkak-stats).
		 * 로컬 개발에는 없으므로 항상 optional로 다룬다 — 없으면 기능만 조용히 꺼진다.
		 */
		interface Platform {
			env?: {
				STATS?: KVNamespace;
			};
			context?: { waitUntil(promise: Promise<unknown>): void };
		}
	}

	/** @cloudflare/workers-types를 따로 안 물고 필요한 만큼만 선언한다 */
	interface KVNamespace {
		get(key: string, type?: 'text'): Promise<string | null>;
		put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
		list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
			keys: { name: string }[];
			list_complete: boolean;
			cursor?: string;
		}>;
	}
}

export {};
