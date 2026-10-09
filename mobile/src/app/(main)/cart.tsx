import { useRouter } from "expo-router";
import { CartScreen as StoreCartScreen } from "../../screens/CartScreen";

export default function CartRoute() {
  const router = useRouter();

  return (
    <StoreCartScreen
      navigation={{
        navigate: (screen: "Shop" | "Checkout") => {
          if (screen === "Shop") {
            router.replace("/");
          } else {
            router.push("/checkout");
          }
        },
      }}
    />
  );
}