export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Cierre de sesión</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Placeholder. Próximo paso: `POST /cash-sessions/close` con `sessionId` + `userId/userName`.
      </p>
    </div>
  );
}

