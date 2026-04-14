import LegalScreen from "../../src/components/LegalScreen";
import { legal } from "../../src/lib/api";

export default function Imprint() {
  return <LegalScreen load={legal.imprint} />;
}
