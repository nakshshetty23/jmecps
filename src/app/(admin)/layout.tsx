// Reserved for admin/editor-only chrome (review queue nav) once auth lands.
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
