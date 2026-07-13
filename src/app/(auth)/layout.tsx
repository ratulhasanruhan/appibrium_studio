import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In · Appibrium Studio",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {children}
    </div>
  );
}
