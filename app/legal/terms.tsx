import LegalScreen from "../../src/components/LegalScreen";
import { legal } from "../../src/lib/api";

export default function Terms() {
  return <LegalScreen load={legal.terms} />;
}
