import { useRouter } from "expo-router";
import { NotFoundScreen } from "@/components/feedback";

export default function NotFound() {
  const router = useRouter();
  return <NotFoundScreen onHome={() => router.replace("/")} />;
}
