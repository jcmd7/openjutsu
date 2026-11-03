import type { Metadata } from "next";
import { SeedanceStudio } from "../../components/seedance-studio.tsx";
import "./seedance.css";

export const metadata: Metadata = {
  title: "Seedance | OpenJutsu",
  description: "Generate videos with BytePlus Seedance, billed to your own ModelArk API account.",
};

export default function SeedancePage() {
  return <SeedanceStudio />;
}
