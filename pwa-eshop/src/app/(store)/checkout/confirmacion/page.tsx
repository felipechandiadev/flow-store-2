import Link from "next/link";

export default async function ConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-4 text-center py-12">
      <h1 className="text-2xl font-semibold text-success">Pedido registrado</h1>
      <p className="text-muted-foreground">
        Número de documento: <strong className="text-foreground">{doc ?? "—"}</strong>
      </p>
      <Link href="/" className="text-sm text-primary hover:underline">
        Volver a la tienda
      </Link>
    </div>
  );
}
