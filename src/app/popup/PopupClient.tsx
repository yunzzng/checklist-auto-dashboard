"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Payload =
  | { status: "pending" }
  | { status: "ready"; html: string }
  | { status: "error"; error: string };

function safeParse(raw: string | null): Payload | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Payload;
    if (!v || typeof v !== "object") return null;
    if (v.status === "pending") return v;
    if (v.status === "ready" && typeof (v as { html?: unknown }).html === "string") return v;
    if (v.status === "error" && typeof (v as { error?: unknown }).error === "string") return v;
    return null;
  } catch {
    return null;
  }
}

function ChecklistFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title="Checklist"
      className="h-screen w-screen border-0"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals"
    />
  );
}

export default function PopupClient() {
  const sp = useSearchParams();
  const rid = sp?.get("rid") || "";

  const storageKey = useMemo(() => (rid ? `checklist_auto:popup:${rid}` : ""), [rid]);
  const [payload, setPayload] = useState<Payload>({ status: "pending" });

  useEffect(() => {
    if (!storageKey) {
      setPayload({ status: "error", error: "rid가 없습니다. 생성 화면에서 다시 열어주세요." });
      return;
    }

    const read = () => safeParse(localStorage.getItem(storageKey));

    const apply = (p: Payload | null) => {
      if (!p) return;
      setPayload(p);
      if (p.status === "ready") {
        // payload가 준비되면 정리(재사용 방지)
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    };

    apply(read());

    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      apply(safeParse(e.newValue));
    };
    window.addEventListener("storage", onStorage);

    // storage event는 같은 탭에서는 안 오므로 폴링도 함께 사용
    const t = window.setInterval(() => apply(read()), 250);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, [storageKey]);

  if (payload.status === "error") {
    return (
      <div className="min-h-screen bg-[#0b1020] text-white">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-base font-semibold">체크리스트를 열지 못했습니다</div>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/80">
              {payload.error}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (payload.status === "ready") {
    return <ChecklistFrame html={payload.html} />;
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-base font-semibold">체크리스트를 불러오는 중…</div>
          <div className="mt-2 text-sm text-white/70">잠시만 기다려주세요. 결과가 준비되면 자동으로 표시됩니다.</div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
            <div className="h-full w-1/3 animate-pulse bg-violet-500/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
