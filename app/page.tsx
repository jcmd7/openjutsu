import { Openjutsu } from "../components/openjutsu.tsx";

export default function Page() {
  return <>
    <nav style={{ maxWidth: 1080, margin: "20px auto 0", padding: "0 16px" }}>
      <a href="/seedance" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>
        Seedance Studio — direct BytePlus cloud video generation ↗
      </a>
    </nav>
    <Openjutsu />
  </>;
}
