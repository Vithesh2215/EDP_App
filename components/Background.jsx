import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from "../config/FirebaseConfig";

// Define the task name
const BACKGROUND_FETCH_TASK = 'background-fetch-vitals';
const API_BASE_URL = "https://human-vitals-analysis.onrender.com";

// Register the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Get current user
    const user = auth.currentUser;
    if (!user) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Try to fetch ESP32 vitals data
    const response = await fetch("http://192.168.180.22/data", {
      timeout: 5000,
    });

    if (!response.ok) {
      console.log("Failed to fetch ESP32 data");
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const data = await response.json();
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

    // Get prediction from API
    const apiResponse = await fetch(`${API_BASE_URL}/predict/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    const prediction = await apiResponse.json();

    const { status: vitalsStatus, ...vitalsToStore } = vitalsData;

    console.log("Prediction response:", prediction);
    console.log("Vitals data:", );
    // Store vitals and prediction in Firestore
    // await addDoc(collection(db, "vitals"), {
    //   ...vitalsToStore,
    //   patientId: user.uid,
    //   prediction: prediction.prediction,
    //   confidence: prediction.confidence,
    //   timestamp: serverTimestamp(),
    // });

    console.log("Background task successfully stored vitals");
    return BackgroundFetch.BackgroundFetchResult.NewData;
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
