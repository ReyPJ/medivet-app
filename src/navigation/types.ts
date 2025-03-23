export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Register: undefined;
  PatientDetails: { patientId: number };
  NewPatient: undefined;
  NewMedication: { patientId: number };
  MedicationDetails: { patientId: number; medicationId: number };
  AdminUsers: undefined;
  CreateUser: undefined;
  EditUser: { userId: number };
};
