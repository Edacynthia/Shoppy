import { useRouter } from "expo-router";
import { CheckoutScreen as StoreCheckoutScreen } from "../screens/CheckoutScreen";

export default function CheckoutRoute() {
  const router = useRouter();

  return (
    <StoreCheckoutScreen
      navigation={{
        goBack: () => router.back(),
        navigate: () => router.replace("/"),
      }}
    />
  );
}
