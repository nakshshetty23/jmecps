// Reserved for super admin-only chrome (control center nav) once auth lands.
export default function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
