import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
  } from "react-native";
  import React from "react";
  import Colors from "../../constant/Colors";
  import { useRouter } from "expo-router";
  
  const { width, height } = Dimensions.get("window");
  
  export default function LoginScreen() {
    const router = useRouter();
  
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.imageContainer}>
          <Image
            source={require('./../../assets/images/Register.png')}
            style={styles.image}
          />
        </View>
        <View style={styles.bottomContainer}>
          <Text style={styles.headerText}>Stay Safe, Stay Healthy!!</Text>
          <Text style={styles.description}>
            Track your vitals, take control of your health. Stay consistent, stay
            confident.
          </Text>
  
          <TouchableOpacity style={styles.button} onPress={() => router.push("login/signIn")}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
  
          <Text style={styles.noteText}>
            Note: By clicking the Continue button, you agree to our terms and
            conditions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fff",
    },
    imageContainer: {
      alignItems: "center",
      marginTop: 20,
    },
    image: {
      width: width * 0.6,
      height: height * 0.5,
      borderRadius: 23,
      resizeMode: "contain",
    },
    bottomContainer: {
      padding: 25,
      backgroundColor: Colors.PRIMARY,
      flex: 1,
      justifyContent: "center",
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },
    headerText: {
      fontSize: 30,
      fontWeight: "bold",
      color: "white",
      textAlign: "center",
    },
    description: {
      color: "white",
      textAlign: "center",
      fontSize: 17,
      marginTop: 20,
    },
    button: {
      padding: 15,
      backgroundColor: "white",
      borderRadius: 25,
      marginTop: 25,
      alignSelf: "center",
      width: "80%",
    },
    buttonText: {
      textAlign: "center",
      fontSize: 16,
      color: Colors.PRIMARY,
      fontWeight: "bold",
    },
    noteText: {
      color: "white",
      marginTop: 8,
      textAlign: "center",
      fontSize: 12,
    },
  });
  