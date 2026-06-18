import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Docs Capture — capture and create documentation",
  description:
    "Record any process in your browser and turn it into a step-by-step guide automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Browser extensions (Bitdefender, ColorZilla, Scribe, password managers,
      // etc.) inject attributes onto <html>/<body> before React hydrates. These
      // are outside our control, so we suppress the resulting attribute-mismatch
      // warning on these two elements only. This is intentionally shallow — it
      // does NOT hide hydration bugs in our own components deeper in the tree.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/*
          Dev-only: some browser extensions (Bitdefender's bis_skin_checked /
          bis_register, ColorZilla's cz-shortcut-listen, password managers'
          __processed_*) inject attributes onto our DOM before React hydrates,
          which trips React's hydration attribute check. This inline script runs
          during HTML parse — before hydration — and drops just those specific
          attribute writes via setAttribute, so the extension's junk never lands
          and there's nothing to mismatch. It only no-ops these known-noise
          attributes; all other setAttribute calls pass through untouched.
        */}
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                '(function(){try{var BAD=/^(bis_skin_checked|bis_register|cz-shortcut-listen|__processed_)/;' +
                // 1) main-world writes (some extensions inject a page script)
                'var p=Element.prototype,o=p.setAttribute;p.setAttribute=function(n,v){try{if(typeof n==="string"&&BAD.test(n))return;}catch(e){}return o.call(this,n,v);};' +
                // 2) isolated-world (content script) writes: strip via observer
                'var strip=function(el){if(el&&el.attributes){for(var i=el.attributes.length-1;i>=0;i--){var a=el.attributes[i].name;if(BAD.test(a)){try{el.removeAttribute(a);}catch(e){}}}}};' +
                'try{new MutationObserver(function(m){for(var i=0;i<m.length;i++){var x=m[i];if(x.type==="attributes"&&x.attributeName&&BAD.test(x.attributeName)){try{x.target.removeAttribute(x.attributeName);}catch(e){}}}}).observe(document.documentElement,{attributes:true,subtree:true});}catch(e){}' +
                '}catch(e){}})();',
            }}
          />
        )}
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
