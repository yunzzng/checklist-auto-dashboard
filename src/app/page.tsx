import DashboardClient from "./DashboardClient";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-xs text-white/70">
            <span className="rounded-full bg-violet-500/20 px-2 py-1 text-violet-200 ring-1 ring-violet-500/30">
              실무 QA 체크리스트 생성
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200 ring-1 ring-emerald-500/25">
              산출물: 검토/공유용 표
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Figma 링크로 체크리스트 자동 생성
          </h1>
          <p className="text-sm text-white/70">
            링크를 넣고 버튼만 누르면, <b>domain / path / precondition / step / checkitem / result</b>{" "}
            형식의 QA 체크리스트 표를 생성해 새 창으로 열어줍니다.
          </p>
        </div>

        <DashboardClient />

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          <div className="font-medium text-white">환경 변수</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <code className="text-white">FIGMA_TOKEN</code> 이 있으면 노드 설명/스크린샷까지 참고합니다.
            </li>
            <li>
              <code className="text-white">OPENAI_API_KEY</code> 가 있으면 AI가 실제 체크리스트(20개+)를 생성합니다.
            </li>
            <li>
              없으면 데모용 기본 체크리스트로 동작합니다.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
