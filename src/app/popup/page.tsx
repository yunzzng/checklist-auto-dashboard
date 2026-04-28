import { Suspense } from "react";
import PopupClient from "./PopupClient";

export default function PopupPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#0b1020] text-white" />}
    >
      <PopupClient />
    </Suspense>
  );
}

