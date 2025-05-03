import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import Colors from "../../constant/Colors";
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {auth} from "./../../config/FirebaseConfig";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Handle Sign-In Logic
  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Login Failed", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const user = response.user;

      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "You haven't verified your email yet. Please check your inbox and verify your email before signing in."
        );
        setLoading(false);
        return;
      }

      // Store user ID in AsyncStorage
      await AsyncStorage.setItem("user", user.uid);

      // Reset input fields
      setEmail("");
      setPassword("");

      // Navigate to the main app (tabs)
      router.replace("(tabs)");
    } catch (error) {
      switch (error.code) {
        case "auth/invalid-email":
          Alert.alert("Login Failed", "The email address is not valid.");
          break;
        case "auth/user-disabled":
          Alert.alert("Login Failed", "This user account has been disabled.");
          break;
        case "auth/user-not-found":
          Alert.alert("Login Failed", "No user found with this email.");
          break;
        case "auth/wrong-password":
          Alert.alert("Login Failed", "Incorrect password. Please try again.");
          break;
        default:
          Alert.alert("Login Failed", "Error signing in. Please try again.");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Forgot Password",
        "Please enter your email to reset password."
      );
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Password Reset", "Check your email for reset instructions.");
    } catch (error) {
      Alert.alert("Error", "Failed to send reset email. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.textHeader}>Let&apos;s Sign You In</Text>
      <Text style={styles.subText}>Welcome Back, You&apos;ve been missed!</Text>

      <View style={styles.inputContainer}>
        <Text>Email</Text>
        <TextInput
          placeholder="Enter your email"
          style={styles.textInput}
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            secureTextEntry={!passwordVisible}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? "eye-off" : "eye"}
              size={22}
              color="gray"
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.forgotPassword} onPress={handleForgotPassword}>
        Forgot Password?
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonCreate}
        onPress={() => router.push("login/signUp")}
      >
        <Text style={styles.buttonCreateText}>Create Account</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "#fff",
  },
  textHeader: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 15,
    textAlign: "center",
  },
  subText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 10,
    textAlign: "center",
    color: Colors.GRAY,
  },
  inputContainer: {
    marginTop: 25,
  },
  textInput: {
    height: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 17,
    borderRadius: 10,
    marginTop: 5,
    backgroundColor: "white",
    borderColor: Colors.GRAY,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
    backgroundColor: "white",
    height: 50,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    fontSize: 17,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPassword: {
    color: Colors.PRIMARY,
    textAlign: "right",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    padding: 15,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 10,
    marginTop: 35,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  buttonCreate: {
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  buttonCreateText: {
    textAlign: "center",
    color: Colors.PRIMARY,
    fontSize: 17,
    fontWeight: "bold",
  },
});
