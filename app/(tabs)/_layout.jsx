import React, { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../config/FirebaseConfig";

export default function TabLayout() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    });

    return () => unsubscribe(); // Cleanup function
  }, []);

  useEffect(() => {
    if (authenticated === false) {
      router.push("/login");
    }
  }, [authenticated]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AddNew"
        options={{
          tabBarLabel: "Social Media Accounts",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="plus-square" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
