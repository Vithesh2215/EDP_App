import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ToastAndroid,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { auth, db } from "./../../config/FirebaseConfig";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Password validation
  const validatePassword = (password) => {
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(
      password
    );
  };

  const [acceptedTerms, setAcceptedTerms] = useState({
    terms: false,
    handle: false,
    accuracy: false,
  });

  // Add this checkbox component
  const Checkbox = ({ label, checked, onPress }) => (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={checked ? "checkbox-outline" : "square-outline"}
        size={24}
        color={checked ? "#007bff" : "#6c757d"}
      />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Create Account Function
  const OnCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      ToastAndroid.show("Please fill all details", ToastAndroid.SHORT);
      Alert.alert("Missing Information", "Please fill in all the details.");
      return;
    }

    if (!Object.values(acceptedTerms).every((v) => v)) {
      Alert.alert(
        "Accept Terms",
        "Please accept all terms and conditions to continue"
      );
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        "Weak Password",
        "Password must have at least 6 characters, one uppercase letter, one number, and one special character."
      );
      return;
    }

    setLoading(true);
    try {
      // Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Store user details in Firestore with correct types
      await setDoc(doc(db, "patients", user.uid), {
        id: user.uid,
        email,
        firstName: "", // Placeholder fields
        lastName: "",
        gender: "",
        age: 0, // Number
        assignedDoctor: "YVhvkqJMDzXABHWf89oNO4G7ACg1", // String
        bpHigh: false, // Boolean
        bpLow: false, // Boolean
        sugar: false, // Boolean
        height: 0, // Number
        weight: 0, // Number
        dateOfJoining: Date.now(),
        bloodGroup: "",
        socialMediaHandle: "",
        address: "",
        mobileNumber: "",
      });

      const doctorId = "YVhvkqJMDzXABHWf89oNO4G7ACg1"; // Replace with the actual doctor ID
      await setDoc(
        doc(db, "doctors", doctorId),
        {
          patientIds: arrayUnion(user.uid), // Add the current user's UID to the array
        },
        { merge: true } // Merge with existing data
      );

      // Send email verification
      await sendEmailVerification(user);

      // Navigate to Verify Email screen
      router.replace("verify-email/verifyEmail");
    } catch (error) {
      let errorMesshandle = "An error occurred. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMesshandle = "Email already exists. Try logging in.";
          break;
        case "auth/weak-password":
          errorMesshandle = "Password should be at least 6 characters.";
          break;
        case "auth/invalid-email":
          errorMesshandle = "Invalid email format.";
          break;
        case "auth/operation-not-allowed":
          errorMesshandle = "Account creation is not allowed currently.";
          break;
      }
      ToastAndroid.show(errorMesshandle, ToastAndroid.SHORT);
      Alert.alert("Signup Failed", errorMesshandle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.textHeader}>Create Your Account</Text>
      <Text style={styles.subText}>
        Join us and manhandle your health easily!
      </Text>

      {/* Email Input */}
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

      {/* Password Input */}
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

      <View style={styles.termsContainer}>
        <Checkbox
          label="I am giving access to my social media handle and data also."
          checked={acceptedTerms.handle}
          onPress={() =>
            setAcceptedTerms((prev) => ({ ...prev, handle: !prev.handle }))
          }
        />
        <Checkbox
          label="I accept the Terms of Service"
          checked={acceptedTerms.terms}
          onPress={() =>
            setAcceptedTerms((prev) => ({ ...prev, terms: !prev.terms }))
          }
        />
        <Checkbox
          label="I confirm all information is accurate"
          checked={acceptedTerms.accuracy}
          onPress={() =>
            setAcceptedTerms((prev) => ({ ...prev, accuracy: !prev.accuracy }))
          }
        />
      </View>

      {/* Signup Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={OnCreateAccount}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* Redirect to Sign In */}
      <TouchableOpacity
        style={styles.buttonCreate}
        onPress={() => router.push("login/signIn")}
      >
        <Text style={styles.buttonCreateText}>
          Already have an account? Sign In
        </Text>
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
    color: "#6c757d",
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
    borderColor: "#6c757d",
  },
  termsContainer: {
    marginVertical: 15, // Adds space above and below the checkboxes
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start", // Align items to top
    marginVertical: 8, // Space between checkboxes
  },
  checkboxLabel: {
    flex: 1, // Allow text to wrap properly
    marginLeft: 8,
    fontSize: 14,
    color: "#6c757d",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6c757d",
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
  button: {
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 10,
    marginTop: 20,
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
    borderColor: "#007bff",
  },
  buttonCreateText: {
    textAlign: "center",
    color: "#007bff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
