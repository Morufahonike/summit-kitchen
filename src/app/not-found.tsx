import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <LogoMark className="mx-auto h-8 w-auto" />
        <h1 className="mt-6 font-display text-4xl">Page not found</h1>
        <p className="mt-3 text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
        <Link href="/" className="btn-gold mt-8">Back to home</Link>
      </div>
    </div>
  );
}
