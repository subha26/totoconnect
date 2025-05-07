export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
      <div className="w-full max-w-md p-6 bg-card rounded-xl shadow-xl">
        {children}
      </div>
    </main>
  );
}
