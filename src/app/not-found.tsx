import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 font-mono">
      <h1 className="text-4xl font-bold text-accent mb-4">[ 404 ]</h1>
      <p className="text-sm text-text opacity-80 mb-6">
        SYS_ERR: The requested resources were not found on this node.
      </p>
      <Link href="/" className="inline-flex items-center text-accent border border-accent hover:bg-accent hover:text-white px-4 py-2 transition-none uppercase tracking-widest text-xs">
        [ RETURN_HOME ]
      </Link>
    </div>
  );
}
