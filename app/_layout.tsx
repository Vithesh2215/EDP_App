import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="verify-email/verifyEmail" />
      <Stack.Screen name="login/signIn" />
      <Stack.Screen name="login/signUp" />
    </Stack>  
  )
}
