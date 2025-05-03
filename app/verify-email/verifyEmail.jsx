import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
  } from "react-native";
  import React from "react";
  import { useRouter } from "expo-router";
  import Colors from "../../constant/Colors";
  
  export default function VerifyEmail() {
    const router = useRouter();
  
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Verify Your Email</Text>
        <Text style={styles.description}>
          A verification email has been sent to your inbox. Please verify your
          email before logging in.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("login/signIn")}
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#121212",
      padding: 20,
    },
    header: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 10,
    },
    description: {
      fontSize: 16,
      textAlign: "center",
      color: "#bbb",
      marginBottom: 20,
    },
    button: {
      backgroundColor: Colors.PRIMARY,
      padding: 15,
      borderRadius: 10,
      marginTop: 10,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
  });
  