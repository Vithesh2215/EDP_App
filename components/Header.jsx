import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Header({ title }) {
  const [firstName, setFirstName] = useState("");
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "patients", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const name = docSnap.data().firstName || "User";
            setFirstName(name);
            await AsyncStorage.setItem("username", name); // Save username locally
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    const loadUserName = async () => {
      const storedName = await AsyncStorage.getItem("username");
      if (storedName) {
        setFirstName(storedName); // Load username from local storage
      } else {
        fetchUserName(); // Fetch from Firestore if not in storage
      }
    };

    loadUserName();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            await signOut(auth);
            router.replace("login/signIn");
          } catch (error) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View>
      <StatusBar backgroundColor="#007bff" barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {/* Removed Hello, User greeting */}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#007bff", // Blue background
    paddingTop: StatusBar.currentHeight || 20, // Add padding for the status bar
    paddingHorizontal: 15, // Horizontal padding
    paddingBottom: 15, // Bottom padding
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%", // Full width
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  greeting: {
    color: "white",
    fontSize: 16,
  },
});
