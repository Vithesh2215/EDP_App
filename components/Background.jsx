import { auth, db } from "@/config/FirebaseConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';

// Define the task name
const BACKGROUND_FETCH_TASK = 'background-fetch-vitals';
const API_BASE_URL = "https://human-vitals-analysis.onrender.com";

// Register the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) return BackgroundFetch.BackgroundFetchResult.NoData;
    
    // Get ESP32 URL from AsyncStorage, with fallback
    let esp32Url;
    try {
      esp32Url = await AsyncStorage.getItem('esp32Url');
      if (!esp32Url) {
        // Use default URL as fallback
        esp32Url = "http://192.168.180.22/data";
        // Store the default for future use
        await AsyncStorage.setItem('esp32Url', esp32Url);
      }
    } catch (error) {
      console.error("Failed to get ESP32 URL:", error);
      esp32Url = "http://192.168.180.22/data"; // Fallback
    }

    // Try to fetch ESP32 vitals data with better error handling
    let response;
    try {
      response = await fetch(esp32Url, {
        timeout: 5000,
      });
    } catch (error) {
      console.log("Network error when fetching ESP32 data:", error.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    if (!response.ok) {
      console.log(`Failed to fetch ESP32 data: ${response.status}`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.log("Error parsing ESP32 JSON data:", error.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const { temperature, heartRate, spo2, status } = data;

    if (status !== "OK") {
      console.log("No finger detected or invalid status");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const vitalsData = {
      SpO2: spo2 !== "--" ? parseInt(spo2) : null,
      heartRate: heartRate !== "--" ? parseInt(heartRate) : null,
      temperature,
    };

    // Get patient data for predictions
    const patientSnap = await getDoc(doc(db, "patients", user.uid));
    if (!patientSnap.exists()) {
      console.log("Patient data not found");
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const patient = patientSnap.data();

    // Prepare payload for prediction API
    const requestPayload = {
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      hasBpHigh: patient.bpHigh,
      hasBpLow: patient.bpLow,
      gender: patient.gender,
      height: patient.height,
      hasDiabetes: patient.sugar,
      weight: patient.weight,
      heartRate: vitalsData.heartRate,
      SpO2: vitalsData.SpO2,
      temperature: vitalsData.temperature,
    };

    // Get prediction from API with better error handling
    let apiResponse;
    try {
      apiResponse = await fetch(`${API_BASE_URL}/predict/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
    } catch (error) {
      console.log("Network error with prediction API:", error.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    let prediction;
    try {
      prediction = await apiResponse.json();
      console.log("Prediction response:", prediction);
    } catch (error) {
      console.log("Error parsing prediction API response:", error.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Store vitals and prediction in Firestore
    try {
      await addDoc(collection(db, "vitals"), {
        ...vitalsData,
        patientId: user.uid,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        timestamp: serverTimestamp(),
      });
      
      console.log("Vitals data:");
      console.log(vitalsData);
      console.log("Background task successfully stored vitals");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error("Error storing vitals in Firestore:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error("Background fetch failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper functions to register and unregister background fetch
export const registerBackgroundFetch = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 20, // 20 seconds interval
      stopOnTerminate: false, // Continue background fetch when app is terminated
      startOnBoot: true, // Start background fetch when device restarts
    });
    console.log("Background fetch registered");
    return true;
  } catch (error) {
    console.error("Background fetch registration failed:", error);
    return false;
  }
};

// Rest of the code remains the same
export const unregisterBackgroundFetch = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log("Background fetch unregistered");
    return true;
  } catch (error) {
    console.error("Background fetch unregistration failed:", error);
    return false;
  }
};

export const checkBackgroundFetchStatus = async () => {
  const status = await BackgroundFetch.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  
  return {
    status,
    isRegistered,
  };
};

// New function to update ESP32 URL
export const updateESP32Url = async (url) => {
  try {
    await AsyncStorage.setItem('esp32Url', url);
    return true;
  } catch (error) {
    console.error("Failed to update ESP32 URL:", error);
    return false;
  }
};

// Get the current ESP32 URL
export const getESP32Url = async () => {
  try {
    const url = await AsyncStorage.getItem('esp32Url');
    return url || "http://192.168.180.22/data"; // Default URL as fallback
  } catch (error) {
    console.error("Failed to get ESP32 URL:", error);
    return "http://192.168.180.22/data"; // Default URL as fallback
  }
};
