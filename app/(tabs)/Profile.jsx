import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import {
  getAuth,
  updatePassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Header from "../../components/Header";

const CLOUDINARY_CLOUD_NAME = "dmxsnkfiy";
const CLOUDINARY_UPLOAD_PRESET = "suicide-detection";

const Profile = () => {
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [userDetails, setUserDetails] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [shareData, setShareData] = useState(true);
  const [confirmAccuracy, setConfirmAccuracy] = useState(true);

  const user = auth.currentUser;
  const restrictedFields = ["email", "timestamp", "id", "dateOfJoining"];

  useEffect(() => {
    if (user) {
      fetchUserDetails();
    } else {
      router.replace("/login");
    }
  }, [user]);

  const handleImagePress = async () => {
    try {
      // Request permissions with better handling
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable photo library access in settings",
          [
            { text: "Cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Launch image picker with enhanced options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false, // Reduces file size
      });

      if (result.canceled || !result.assets) return;

      const uri = result.assets[0].uri.startsWith("file://")
        ? result.assets[0].uri
        : `file://${result.assets[0].uri}`;

      // Add file validation
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.size > 5 * 1024 * 1024) {
        // 5MB limit
        Alert.alert("File Too Large", "Please select an image under 5MB");
        return;
      }

      // Create form data with proper typing
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `profile_${Date.now()}.jpg`,
        type: "image/jpeg",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Cloudinary Error:", errorData);
        throw new Error(errorData.error?.message || "Upload failed");
      }

      const data = await response.json();

      // Update Firestore and local state
      await updateDoc(doc(db, "patients", user.uid), {
        profileImage: data.secure_url,
      });

      setUserDetails((prev) => ({
        ...prev,
        profileImage: data.secure_url,
      }));
    } catch (error) {
      let errorMessage = "Failed to upload image";

      if (error.name === "AbortError") {
        errorMessage = "Request timed out. Check your connection";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Check your internet connection";
      }

      Alert.alert("Upload Error", errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const docRef = doc(db, "patients", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch user details.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setUserDetails((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!userDetails?.firstName?.trim() || !userDetails?.lastName?.trim()) {
      Alert.alert("Error", "First name and last name are required");
      return false;
    }

    if (
      userDetails.mobileNumber &&
      !/^\d{10}$/.test(userDetails.mobileNumber)
    ) {
      Alert.alert("Error", "Mobile number must be 10 digits");
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    try {
      await updateDoc(doc(db, "patients", user.uid), userDetails);
      Alert.alert("Success", "Profile updated successfully");
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    updatePassword(user, newPassword)
      .then(() => {
        Alert.alert("Success", "Password updated successfully");
        setPasswordModalVisible(false);
      })
      .catch((error) => Alert.alert("Error", error.message));
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logout Button */}
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.contentcontainer}>

        {/* Profile Image */}
        <Image
          source={{
            uri:
              userDetails?.profileImage ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />

        <TouchableOpacity
          style={styles.changeImageButton}
          onPress={handleImagePress}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator color="white" />
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="white" />
              <Text style={styles.changeImageText}>Update Profile Image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Details */}
        <View style={styles.detailsContainer}>
          <DetailRow
            label="Name"
            value={`${userDetails?.firstName || ""} ${
              userDetails?.lastName || ""
            }`}
          />
          <DetailRow label="Email" value={user?.email} />
          <DetailRow label="Mobile" value={userDetails?.mobileNumber} />
          <DetailRow label="Address" value={userDetails?.address} />
          <DetailRow label="Gender" value={userDetails?.gender} />
          <DetailRow label="Blood Group" value={userDetails?.bloodGroup} />
          <DetailRow label="Age" value={userDetails?.age} />
          <DetailRow label="Height" value={userDetails?.height} />
          <DetailRow label="Weight" value={userDetails?.weight} />
          <MedicalDetail label="High BP" value={userDetails?.bpHigh} />
          <MedicalDetail label="Low BP" value={userDetails?.bpLow} />
          <MedicalDetail label="Sugar" value={userDetails?.sugar} />
        </View>

        {/* Action Buttons */}
        <ActionButton
          text="Edit Details"
          onPress={() => setEditModalVisible(true)}
        />
        <ActionButton
          text="Change Password"
          onPress={() => setPasswordModalVisible(true)}
        />

        {/* Terms and Conditions Section */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsHeading}>Conditions Accepted By You</Text>
          <View style={styles.checkboxRow}>
            <Ionicons name="checkbox" size={24} color="#2196F3" />
            <Text style={styles.termsText}>
              I give access to my social media handle and data
            </Text>
          </View>

          <View style={styles.checkboxRow}>
            <Ionicons name="checkbox" size={24} color="#2196F3" />
            <Text style={styles.termsText}>I accept the Terms of Service</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Ionicons name="checkbox" size={24} color="#2196F3" />
            <Text style={styles.termsText}>
              I confirm all information is accurate
            </Text>
          </View>
        </View>

        {/* Edit Details Modal */}
        <EditModal
          visible={editModalVisible}
          userDetails={userDetails}
          handleFieldChange={handleFieldChange}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveProfile}
        />

        {/* Password Change Modal */}
        <PasswordModal
          visible={passwordModalVisible}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          passwordVisible={passwordVisible}
          confirmPasswordVisible={confirmPasswordVisible}
          setNewPassword={setNewPassword}
          setConfirmPassword={setConfirmPassword}
          setPasswordVisible={setPasswordVisible}
          setConfirmPasswordVisible={setConfirmPasswordVisible}
          onClose={() => setPasswordModalVisible(false)}
          onChangePassword={handleChangePassword}
        />
      </ScrollView>
    </ScrollView>
  );
};

// Reusable Components
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

const MedicalDetail = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value ? "Yes" : "No"}</Text>
  </View>
);

const ActionButton = ({ text, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{text}</Text>
  </TouchableOpacity>
);

const EditModal = ({
  visible,
  userDetails,
  handleFieldChange,
  onClose,
  onSave,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContent}>
          <Text style={styles.modalTitle}>Edit Profile Details</Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={userDetails.firstName || ""}
              onChangeText={(text) => handleFieldChange("firstName", text)}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={userDetails.lastName || ""}
              onChangeText={(text) => handleFieldChange("lastName", text)}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              value={userDetails.mobileNumber || ""}
              onChangeText={(text) => handleFieldChange("mobileNumber", text)}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={userDetails.address || ""}
              onChangeText={(text) => handleFieldChange("address", text)}
            />
          </View>

          <OptionSelector
            label="Gender"
            options={["Male", "Female"]}
            selected={userDetails.gender}
            onSelect={(value) => handleFieldChange("gender", value)}
          />

          <View style={styles.bloodGroupContainer}>
            <Text style={styles.fieldLabel}>Blood Group</Text>
            <View style={styles.bloodGroupRow}>
              {["A+", "A-", "B+", "B-"].map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.optionButton,
                    userDetails.bloodGroup === group && styles.selectedOption,
                  ]}
                  onPress={() => handleFieldChange("bloodGroup", group)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      userDetails.bloodGroup === group && { color: "white" },
                    ]}
                  >
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.bloodGroupRow}>
              {["O+", "O-", "AB+", "AB-"].map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.optionButton,
                    userDetails.bloodGroup === group && styles.selectedOption,
                  ]}
                  onPress={() => handleFieldChange("bloodGroup", group)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      userDetails.bloodGroup === group && { color: "white" },
                    ]}
                  >
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {["bpHigh", "bpLow", "sugar"].map((field) => (
            <OptionSelector
              key={field}
              label={field.replace(/([A-Z])/g, " $1").toUpperCase()}
              options={["Yes", "No"]}
              selected={userDetails[field] ? "Yes" : "No"}
              onSelect={(value) => handleFieldChange(field, value === "Yes")}
            />
          ))}

          {["age", "height", "weight"].map((field) => (
            <View key={field} style={{ marginBottom: 16 }}>
              <Text style={styles.fieldLabel}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={userDetails[field]?.toString() || ""}
                onChangeText={(text) => handleFieldChange(field, text)}
                keyboardType="numeric"
              />
            </View>
          ))}

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={onSave}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const OptionSelector = ({ label, options, selected, onSelect }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.optionContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            selected === option && styles.selectedOption,
          ]}
          onPress={() => onSelect(option)}
        >
          <Text style={selected === option && styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const PasswordModal = ({
  visible,
  newPassword,
  confirmPassword,
  passwordVisible,
  confirmPasswordVisible,
  setNewPassword,
  setConfirmPassword,
  setPasswordVisible,
  setConfirmPasswordVisible,
  onClose,
  onChangePassword,
}) => {
  const auth = getAuth();
  const user = auth.currentUser;

  const handlePasswordReset = () => {
    sendPasswordResetEmail(auth, user.email)
      .then(() =>
        Alert.alert(
          "Reset Email Sent",
          "Check your email to reset your password"
        )
      )
      .catch((error) => Alert.alert("Error", error.message));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.passwordModalContent}>
          <Text style={styles.passwordModalTitle}>Change Password</Text>

          <View style={styles.passwordInputGroup}>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="New Password"
              visible={passwordVisible}
              toggleVisibility={() => setPasswordVisible(!passwordVisible)}
            />
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm Password"
              visible={confirmPasswordVisible}
              toggleVisibility={() =>
                setConfirmPasswordVisible(!confirmPasswordVisible)
              }
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onChangePassword}
          >
            <Text style={styles.primaryButtonText}>Update Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetLinkContainer}
            onPress={handlePasswordReset}
          >
            <Text style={styles.resetLinkText}>Send Password Reset Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  visible,
  toggleVisibility,
}) => (
  <View style={styles.passwordInputContainer}>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      secureTextEntry={!visible}
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#8e8e93"
    />
    <TouchableOpacity style={styles.eyeIcon} onPress={toggleVisibility}>
      <Ionicons
        name={visible ? "eye-off-outline" : "eye-outline"}
        size={20}
        color="#8e8e93"
      />
    </TouchableOpacity>
  </View>
);

// Styles
const styles = StyleSheet.create({
  changeImageButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "center",
  },
  changeImageText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  container: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  contentcontainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
    paddingTop: 25,
  },
  logoutButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#FF3B30",
    padding: 10,
    borderRadius: 50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    width: "90%",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    marginTop: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e5ea",
  },
  detailLabel: {
    fontWeight: "500",
    color: "#1c1c1e",
    fontSize: 16,
  },
  detailValue: {
    color: "#636366",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1c1c1e",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1c1c1e",
    marginBottom: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1c1c1e",
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
    justifyContent: "center",
  },
  optionButton: {
    width: "22%",
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    color: "#1c1c1e",
    fontWeight: "500",
  },
  passwordModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1c1c1e",
    marginBottom: 24,
    textAlign: "center",
  },
  passwordInputGroup: {
    marginBottom: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "#ff3b30",
    borderColor: "#e5e5ea",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  resetLinkContainer: {
    marginVertical: 16,
  },
  resetLinkText: {
    color: "#007AFF",
    textAlign: "center",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  passwordInputContainer: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 14,
  },
  bloodGroupContainer: {
    marginBottom: 16,
  },
  bloodGroupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10, // Adds spacing between the two rows
  },
  termsMainHeading: {
    color: "black",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    alignSelf: "center",
  },
  termsHeading: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    alignSelf: "center",
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  termsText: {
    marginLeft: 10,
    color: "black",
    fontSize: 14,
  },
});

export default Profile;
