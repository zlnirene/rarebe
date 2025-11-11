import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative isolate border-t border-zinc-200 bg-[#FDFBF8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/images/logo.png"
            alt="The Body Shop"
            className="h-12 w-auto object-contain bg-transparent"
            loading="lazy"
          />
          <div className="text-sm font-semibold tracking-wide text-[#004236] bg-transparent">
            The Body Shop
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Follow us</h4>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="#"
                aria-label="Instagram"
                className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#7f2549]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" strokeWidth="1.6" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </Link>
              <Link
                href="#"
                aria-label="TikTok"
                className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#7f2549]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 4c1.2 1.8 2.7 3 5 3" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M14 4v11.5a4.5 4.5 0 1 1-4.5-4.5" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </Link>
              <Link
                href="#"
                aria-label="YouTube"
                className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#7f2549]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="7" width="18" height="10" rx="3" strokeWidth="1.6" />
                  <path d="M10 10.5v3l3-1.5-3-1.5Z" fill="currentColor" stroke="none" />
                </svg>
              </Link>
              <Link
                href="#"
                aria-label="Twitter"
                className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#7f2549]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 6.5c-.7.5-1.6.8-2.5 1 0 6-4.3 10.4-10.4 10.4-2 0-3.9-.6-5.4-1.6 1.6.2 3.3-.2 4.6-1.2-1.3 0-2.4-.9-2.8-2.1.5.1 1 .1 1.5 0-1.4-.3-2.4-1.6-2.4-3v-.1c.4.2.9.3 1.4.3-1.3-.9-1.7-2.7-.9-4 1.6 2 4.1 3.3 6.8 3.4-.4-1.7.9-3.4 2.7-3.4.8 0 1.6.3 2.1.9.7-.1 1.4-.4 2-.7" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </Link>
              <Link
                href="#"
                aria-label="Facebook"
                className="rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#7f2549]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M15 8h-2a2 2 0 0 0-2 2v10" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M9 13h4" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 2a10 10 0 1 0 10 10" strokeWidth="1.6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 bg-transparent">
          © {new Date().getFullYear()} The Body Shop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
