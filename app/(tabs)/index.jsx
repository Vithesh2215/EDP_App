import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  limit,
  startAfter,
  endBefore,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../config/FirebaseConfig";

export default function HomeScreen() {
  const [latestVital, setLatestVital] = useState(null);
  const [previousVitals, setPreviousVitals] = useState([]);
  const [esp32Vitals, setEsp32Vitals] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMoreNext, setHasMoreNext] = useState(true);
  const [hasMorePrev, setHasMorePrev] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const API_BASE_URL = "https://human-vitals-analysis.onrender.com";
  const pageSize = 10;

  const fetchVitals = async (direction = "initial") => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const vitalsRef = collection(db, "vitals");

      let q = query(
        vitalsRef,
        where("patientId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(pageSize)
      );

      if (direction === "next" && lastVisible) {
        q = query(
          vitalsRef,
          where("patientId", "==", user.uid),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else if (direction === "prev" && firstVisible) {
        q = query(
          vitalsRef,
          where("patientId", "==", user.uid),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        if (direction === "next") setHasMoreNext(false);
        if (direction === "prev") setHasMorePrev(false);
        return;
      }

      const vitalsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toLocaleString(),
      }));

      setPreviousVitals(vitalsList);
      setFirstVisible(querySnapshot.docs[0]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMoreNext(querySnapshot.docs.length === pageSize);
      setHasMorePrev(direction !== "initial");

      if (direction === "initial" && vitalsList.length > 0) {
        setLatestVital(vitalsList[0]);
      }

      if (direction === "next") {
        setCurrentPage((prev) => prev + 1);
      } else if (direction === "prev") {
        setCurrentPage((prev) => prev - 1);
      } else {
        setCurrentPage(1);
      }
    } catch (error) {
      // Handle errors silently
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchVitals("initial");
      }
    });
  
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setLastVisible(null);
    setFirstVisible(null);
    setHasMoreNext(true);
    setHasMorePrev(false);
    await fetchVitals("initial");
    setRefreshing(false);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isUploading) {
        uploadVitalsFromESP32();
      }
    }, 20000); // 20 seconds

    return () => clearInterval(intervalId); // Clear on unmount
  }, [isUploading]);

  const uploadVitalsFromESP32 = async () => {
    setIsUploading(true);
    try {
      const response = await fetch("http://192.168.180.22/data", {
        timeout: 5000,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response: not JSON");
      }

      const data = await response.json();

      const { temperature, heartRate, spo2, status } = data;

      if (status !== "OK") {
        return; // Exit if no finger detected
      }

      const vitalsData = {
        SpO2: spo2 !== "--" ? parseInt(spo2) : null,
        heartRate: heartRate !== "--" ? parseInt(heartRate) : null,
        temperature,
        status,
      };

      setEsp32Vitals(vitalsData);

      const user = auth.currentUser;
      if (!user) return;

      const patientSnap = await getDoc(doc(db, "patients", user.uid));
      if (!patientSnap.exists()) return;

      const patient = patientSnap.data();

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

      const apiResponse = await fetch(`${API_BASE_URL}/predict/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const prediction = await apiResponse.json();

      const { status: vitalsStatus, ...vitalsToStore } = vitalsData;

      await addDoc(collection(db, "vitals"), {
        ...vitalsToStore,
        patientId: user.uid,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Handle errors silently
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Patient Vitals</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {latestVital ? (
        <View style={styles.card}>
          <Text style={styles.latestVitalText}>Latest Vitals</Text>
          <Text>SpO2: {latestVital.SpO2}</Text>
          <Text>Heart Rate: {latestVital.heartRate}</Text>
          <Text>Temperature: {latestVital.temperature}°C</Text>
        </View>
      ) : (
        <Text style={styles.noVitalsText}>No vitals available</Text>
      )}

      <Text style={styles.previousVitalsText}>All Vital Readings</Text>
      {previousVitals.length > 0 ? (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>#</Text>
            <Text style={styles.tableHeaderText}>SpO2</Text>
            <Text style={styles.tableHeaderText}>HR</Text>
            <Text style={styles.tableHeaderText}>Temp (°C)</Text>
          </View>

          <FlatList
            data={previousVitals}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  {(currentPage - 1) * pageSize + index + 1}
                </Text>
                <Text style={styles.tableCell}>{item.SpO2}</Text>
                <Text style={styles.tableCell}>{item.heartRate}</Text>
                <Text style={styles.tableCell}>{item.temperature}</Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />

          <View style={styles.paginationContainer}>
            {hasMorePrev && (
              <TouchableOpacity
                style={[styles.pageButton, styles.prevButton]}
                onPress={() => fetchVitals("prev")}
              >
                <Text style={styles.pageButtonText}>Previous Page</Text>
              </TouchableOpacity>
            )}
            {hasMoreNext && (
              <TouchableOpacity
                style={styles.pageButton}
                onPress={() => fetchVitals("next")}
              >
                <Text style={styles.pageButtonText}>Next Page</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.noVitalsText}>No previous vitals available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8f8f8" },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  header: { fontSize: 24, fontWeight: "bold" },
  refreshButton: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  refreshButtonText: { color: "white", fontWeight: "bold" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  latestVitalText: { fontWeight: "bold", fontSize: 18, marginBottom: 5 },
  previousVitalsText: { fontWeight: "bold", fontSize: 16, marginTop: 15 },
  noVitalsText: {
    fontSize: 16,
    textAlign: "center",
    color: "gray",
    marginTop: 10,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    paddingVertical: 10,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 10,
  },
  tableCell: { flex: 1, textAlign: "center", color: "#333" },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  pageButton: {
    backgroundColor: "#007bff",
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
  },
  pageButtonText: { color: "white", fontWeight: "bold" },
});
