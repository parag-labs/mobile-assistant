import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0b0f19" },
        headerTintColor: "#e5e7eb",
        contentStyle: { backgroundColor: "#0b0f19" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Mobile Life Assistant" }} />
    </Stack>
  );
}
