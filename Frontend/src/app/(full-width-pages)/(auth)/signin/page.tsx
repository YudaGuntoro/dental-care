import SignInPage from "@/auth/SignInPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk | Dental Care",
  description: "Masuk untuk staf klinik Dental Care",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignIn() {
  return <SignInPage />;
}
