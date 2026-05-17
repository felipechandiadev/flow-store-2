"use client";

import DotProgress from "@/shared/DotProgress/DotProgress";

export default function PageLoading() {
  return (
    <div className="flex justify-center py-12">
      <DotProgress />
    </div>
  );
}
