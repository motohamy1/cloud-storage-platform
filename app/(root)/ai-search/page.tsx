import AISearch from "@/components/AISearch";
import { getCurrentUser } from "@/lib/actions/user.actions";

const AISearchPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;

  return <AISearch />;
};

export default AISearchPage;
