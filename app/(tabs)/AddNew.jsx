import Header from "@/components/Header";
import Colors from "@/constant/Colors";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddNew() {
  const router = useRouter();
  const [socialmediahandle, setHandle] = useState("");
  const [existingHandle, setExistingHandle] = useState(null);

  const db = getFirestore(); // Firestore instance
  const auth = getAuth(); // Firebase Authentication instance

  useEffect(() => {
    const fetchHandle = async () => {
      const user = auth.currentUser; // Get the currently logged-in user

      if (!user) {
        router.replace("/login");
      }

      try {
        const docRef = doc(db, "patients", user.uid); // Reference to the 'patients' collection
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setExistingHandle(docSnap.data().socialMediaHandle); // Set the existing handle
          setHandle(docSnap.data().socialMediaHandle); // Pre-fill the input field
        }
      } catch (error) {
        Alert.alert("Failed to fetch social media handle");
      }
    };

    fetchHandle();
  }, []);

  const OnClickAdd = async (mediahandle) => {
    const user = auth.currentUser; // Get the currently logged-in user

    if (!user) {
      Alert.alert("User not logged in");
      return;
    }

    try {
      await setDoc(
        doc(db, "patients", user.uid), // Reference to the 'patients' collection
        {
          socialMediaHandle: mediahandle, // Update the socialMediaHandle field
        },
        { merge: true } // Merge with existing data
      );

      Alert.alert("Social media handle added/updated successfully!");
      setExistingHandle(mediahandle); // Update the existing handle
      setHandle(""); // Clear input field
    } catch (error) {
      Alert.alert("Failed to add/update social media handle");
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Add Or Update" />
      <View style={styles.contentcontainer}>
      <Text style={styles.textHeader}>Add / Update</Text>
      <Text style={styles.textHeader}>Your Social Media</Text>
      <Text style={styles.textHeader}>Handle Here</Text>

      {existingHandle && (
        <Text style={styles.existingHandle}>
          Existing Handle: {existingHandle}
        </Text>
      )}

      <View style={styles.inputContainer}>
        <Text>Social Media Handle</Text>
        <TextInput
          placeholder="Enter your Social Media Handle"
          style={styles.textInput}
          onChangeText={setHandle}
          value={socialmediahandle}
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => OnClickAdd(socialmediahandle)}
      >
        <Text style={styles.buttonText}>
          {existingHandle
            ? "Update Social Media Handle"
            : "Add Social Media Handle"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: Enter the social media handle only if it is present.
      </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  contentcontainer: {
    padding: 25,
  },
  textHeader: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  existingHandle: {
    fontSize: 16,
    color: "gray",
    marginTop: 15,
    textAlign: "center",
  },
  inputContainer: {
    marginTop: 25,
  },
  textInput: {
    padding: 10,
    borderWidth: 1,
    fontSize: 17,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "white",
  },
  button: {
    padding: 15,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 10,
    marginTop: 35,
  },
  buttonText: {
    textAlign: "center",
    color: "white",
    fontSize: 17,
  },
  note: {
    color: "blue",
    marginTop: 20,
    textAlign: "center",
  },
});
