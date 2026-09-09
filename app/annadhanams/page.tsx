import { redirect } from "next/navigation";

// A friendlier URL for the "Explore Mandapams" CTA to land on — the map
// page itself already opens on the Annadhanams tab by default, so this is
// just an alias rather than a separate page.
export default function AnnadhanamsRedirect() {
  redirect("/map");
}
