// Reserved for researcher-only chrome (dashboard nav, submission status) once auth lands.
export default function ResearcherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
