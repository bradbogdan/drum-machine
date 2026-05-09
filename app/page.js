import DrumMachine from "@/components/DrumMachine";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <DrumMachine isAuthenticated={!!user} />;
}
