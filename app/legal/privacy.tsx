import LegalScreen from "../../src/components/LegalScreen";
import { legal } from "../../src/lib/api";

export default function Privacy() {
  return <LegalScreen load={legal.privacy} />;
}
