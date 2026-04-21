'use client';

import Image from "next/image";
import DotProgress from "../DotProgress/DotProgress";

const SplashScreen = () => {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#ffffff" }}
      data-test-id="splash-root"
    >
      <div className="w-full max-w-2xl px-6">
        <div className="flex flex-col items-center gap-10">
          <Image
            src="/logo.svg"
            alt="Logo Arrocera Aparicio y Garcia"
            width={360}
            height={360}
            priority
            className="h-64 w-64 mb-4"
          />
          <div style={{ marginTop: "10vh" }}>
            <DotProgress size={16} gap={10} colorPrimary="#1976D2" colorNeutral="#1976D2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
